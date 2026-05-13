import { Router } from "express";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import Groq from "groq-sdk";
import { db } from "../db/index.js";
import { aiChats } from "../db/schema.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { config } from "../config.js";

const router = Router();
const groq = new Groq({ apiKey: config.groqApiKey });

const SYSTEM_PROMPT = `You are Nova, the official AI guide for CoinNova. 
Your goal is to provide simple, clear, and concise answers about cryptocurrency and the CoinNova platform.

Rules:
- Keep answers short and easy to understand (max 2-3 paragraphs).
- Avoid complex jargon; explain concepts in plain English.
- If a user asks about CoinNova features (Portfolio, Wallet, Trades, etc.), explain them clearly.
- Never give financial advice. Always add a short disclaimer if discussing investment strategies.
- Be encouraging, friendly, and helpful. Use emojis occasionally for a positive vibe.
- Use markdown for readability (bolding, lists).`;

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1),
  })).min(1),
  context: z.string().optional(),
});

const riskSchema = z.object({
  coinId: z.string().min(1),
  coinName: z.string().min(1),
  price: z.number().optional(),
  change24h: z.number().optional(),
  marketCap: z.number().optional(),
});

const suggestSchema = z.object({
  holdings: z.array(z.object({
    coinId: z.string(),
    symbol: z.string(),
    amount: z.number(),
    avgPrice: z.number(),
    currentPrice: z.number(),
  })),
  walletBalance: z.number(),
});

// POST /ai/chat
router.post("/chat", optionalAuth, validate(chatSchema), async (req, res) => {
  try {
    const { messages, context } = req.body;
    const userId = req.user?.userId;

    const systemContent = context ? `${SYSTEM_PROMPT}\n\nCurrent App Context:\n${context}` : SYSTEM_PROMPT;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.";

    // Save last user message and assistant reply to DB if user is authenticated
    if (userId) {
      const lastUserMsg = messages[messages.length - 1];
      await db.insert(aiChats).values([
        { userId, role: "user", content: lastUserMsg.content },
        { userId, role: "assistant", content: reply },
      ]);
    }

    res.json({ reply });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

// POST /ai/chat/stream — SSE streaming chat
router.post("/chat/stream", optionalAuth, async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!messages?.length) { res.status(400).json({ error: "messages required" }); return; }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const systemContent = context ? `${SYSTEM_PROMPT}\n\nCurrent App Context:\n${context}` : SYSTEM_PROMPT;

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemContent }, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    let fullReply = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? "";
      if (content) {
        fullReply += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Save to DB if user is authenticated
    if (req.user) {
      const userId = req.user.userId;
      const lastUserMsg = messages[messages.length - 1];
      await db.insert(aiChats).values([
        { userId, role: "user", content: lastUserMsg.content },
        { userId, role: "assistant", content: fullReply },
      ]);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error("AI stream error:", err);
    res.write(`data: ${JSON.stringify({ error: "AI service unavailable" })}\n\n`);
    res.end();
  }
});

// POST /ai/risk — coin risk analysis
router.post("/risk", requireAuth, validate(riskSchema), async (req, res) => {
  try {
    const { coinName, price, change24h, marketCap } = req.body;

    const prompt = `Analyze the risk profile of ${coinName} cryptocurrency.
Current price: $${price ?? "unknown"}
24h change: ${change24h ?? "unknown"}%
Market cap: $${marketCap ?? "unknown"}

Provide:
1. Risk level: low, medium, or high
2. Key risk factors (3-4 bullet points)
3. A brief recommendation for portfolio sizing

Format your response as JSON: { "level": "low|medium|high", "factors": ["..."], "recommendation": "..." }`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a crypto risk analyst. Respond ONLY with valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? raw);
      res.json(parsed);
    } catch {
      res.json({ level: "medium", factors: [raw], recommendation: "Unable to parse structured analysis." });
    }
  } catch (err) {
    console.error("AI risk error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

// POST /ai/suggest — portfolio suggestions
router.post("/suggest", requireAuth, validate(suggestSchema), async (req, res) => {
  try {
    const { holdings, walletBalance } = req.body;

    const holdingsSummary = holdings.map((h: any) =>
      `${h.symbol.toUpperCase()}: ${h.amount.toFixed(4)} coins, avg $${h.avgPrice.toFixed(2)}, now $${h.currentPrice.toFixed(2)}`
    ).join("\n");

    const prompt = `Analyze this crypto portfolio and provide suggestions:

Holdings:
${holdingsSummary || "None"}

Available cash: $${walletBalance.toFixed(2)}

Provide 3-4 actionable suggestions. Consider diversification, risk management, and current market conditions.
Format as JSON array: [{ "action": "buy|sell|hold|rebalance", "coin": "...", "reasoning": "..." }]`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a crypto portfolio advisor. Respond ONLY with a valid JSON array. Never give financial advice — frame as educational suggestions." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? raw);
      res.json({ suggestions: parsed });
    } catch {
      res.json({ suggestions: [{ action: "hold", coin: "general", reasoning: raw }] });
    }
  } catch (err) {
    console.error("AI suggest error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

// GET /ai/history — chat history
router.get("/history", requireAuth, async (req, res) => {
  try {
    const chats = await db.select().from(aiChats).where(eq(aiChats.userId, req.user!.userId)).orderBy(desc(aiChats.createdAt)).limit(50);
    res.json(chats.reverse());
  } catch (err) { console.error("AI history error:", err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
