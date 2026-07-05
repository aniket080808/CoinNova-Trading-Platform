import { Router } from "express";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import Groq from "groq-sdk";
import { db } from "../db/index.js";
import { aiChats, transactions, tradeJournals, behaviorAnalysis, portfolioHealthHistory } from "../db/schema.js";
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

// ─── POST /ai/replay-review ─────────────────────────────
// Dynamically assigns AI grade from raw metrics + trade history

const replayReviewSchema = z.object({
  coinId: z.string(),
  symbol: z.string(),
  difficulty: z.string(),
  userReturn: z.number(),
  buyAndHoldReturn: z.number(),
  totalTrades: z.number(),
  winRate: z.number(),
  maxDrawdown: z.number(),
  averageHoldingTime: z.number(),
  trades: z.array(z.object({
    action: z.string(),
    price: z.number(),
    quantity: z.number(),
    cashBalance: z.number(),
    portfolioValue: z.number(),
    timestamp: z.number(),
  })).optional(),
});

router.post("/replay-review", requireAuth, validate(replayReviewSchema), async (req, res) => {
  try {
    const { coinId, symbol, difficulty, userReturn, buyAndHoldReturn, totalTrades, winRate, maxDrawdown, averageHoldingTime, trades } = req.body;

    // Deterministic grade calculation
    const beat = userReturn > buyAndHoldReturn;
    const score = (winRate * 0.35) + (beat ? 20 : 0) + (Math.max(0, 100 - maxDrawdown * 3) * 0.45);
    let aiGrade = "C";
    if (score >= 88) aiGrade = "A+";
    else if (score >= 78) aiGrade = "A";
    else if (score >= 68) aiGrade = "B+";
    else if (score >= 58) aiGrade = "B";
    else if (score >= 48) aiGrade = "C+";
    else if (score >= 38) aiGrade = "C";
    else if (score >= 25) aiGrade = "D";
    else aiGrade = "F";

    const tradeSummary = trades
      ? `The user made ${trades.length} total trades. Sample actions: ${trades.slice(0, 5).map((t: any) => `${t.action} ${t.quantity.toFixed(4)} @ $${t.price.toFixed(2)}`).join(", ")}.`
      : "Detailed trade log unavailable.";

    const prompt = `You are a trading coach reviewing a historical crypto replay session.

Asset: ${symbol.toUpperCase()} (${coinId}), Difficulty: ${difficulty}
User Return: ${userReturn.toFixed(2)}% | Buy & Hold Return: ${buyAndHoldReturn.toFixed(2)}%
Total Trades: ${totalTrades} | Win Rate: ${winRate.toFixed(1)}% | Max Drawdown: ${maxDrawdown.toFixed(1)}%
Average Holding Time: ${averageHoldingTime.toFixed(1)} hours
${tradeSummary}

The AI assigned Grade: ${aiGrade}

Provide:
1. A punchy 2-sentence opening verdict on the session performance.
2. Two specific behavioral observations (overtrading, panic selling, perfect timing, etc.).
3. One targeted improvement tip for next time.
4. An encouraging closing line.

Be specific, direct, and educational. Keep the full response under 150 words.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 512,
    });

    const critique = completion.choices[0]?.message?.content ?? "Unable to generate review.";
    res.json({ aiGrade, critique, promptVersion: "v1" });
  } catch (err) {
    console.error("Replay review error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

// ─── POST /ai/explain-behavior ───────────────────────────
// Takes a deterministic payload and returns an educational explanation

const explainSchema = z.object({
  scoreData: z.any(),
  grade: z.string(),
  personality: z.any(),
  mistakes: z.array(z.any()),
  mostExpensiveHabit: z.any().nullable(),
  patterns: z.any(),
  predictions: z.any(),
  question: z.string().optional(),
});

router.post("/explain-behavior", requireAuth, validate(explainSchema), async (req, res) => {
  try {
    const payload = req.body;
    const { question } = payload;

    let systemContent = `You are a Trading Behavior Coach.
You will receive a deterministic JSON payload containing the user's Trading DNA.
You MUST NOT calculate scores, assign grades, detect mistakes, or invent probabilities.
You MUST ONLY explain the data provided in plain English.
Every explanation must be traceable to the JSON data.`;

    let userPrompt = `Here is the user's Trading DNA JSON payload:
${JSON.stringify(payload, null, 2)}

`;

    if (question) {
      userPrompt += `The user has asked the following question: "${question}"
Answer their question directly using ONLY the data in the JSON payload above. Keep it concise.`;
    } else {
      userPrompt += `Provide a brief summary of their current Trading DNA, highlighting their top strength and their most expensive habit (if any). Do not invent any advice not supported by the data.`;
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const reply = completion.choices[0]?.message?.content ?? "I cannot explain this right now.";

    res.json({ explanation: reply });
  } catch (err) {
    console.error("AI explain error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});


// POST /ai/journal-analysis
router.post("/journal-analysis", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const journals = await db.select().from(tradeJournals).where(eq(tradeJournals.userId, userId));
    const transactionsData = await db.select().from(transactions).where(eq(transactions.userId, userId));

    const totalEntries = journals.length;
    if (totalEntries === 0) {
      return res.status(400).json({ error: "No journal entries available for analysis." });
    }

    const fomoScore = Math.max(0, 100 - Math.floor(totalEntries * 5));
    const panicScore = Math.max(0, 100 - Math.floor((journals.filter((j: any) => j.sentiment === "panic").length) * 15));
    const disciplineScore = Math.min(100, 20 + Math.floor((journals.filter((j: any) => j.sentiment === "calm").length) * 20));

    const topStrength = "Consistent journaling habit";
    const topWeakness = "Too many emotionally charged entries";

    const advice = [
      "Focus on clear reasons behind each trade.",
      "Review losing trades for repeated patterns.",
      "Keep position sizing steady to reduce panic-driven decisions.",
    ];

    const summary = `Analyzed ${totalEntries} journal entries and ${transactionsData.length} trades.`;

    const analysisRecord = {
      userId,
      summary,
      fomoScore,
      panicScore,
      disciplineScore,
      fomoExplanation: "FOMO behavior is moderate when you maintain a regular journal.",
      panicExplanation: "Panic scores improve when you avoid impulsive entries after losses.",
      disciplineExplanation: "Discipline strengthens with clear trade rationale and follow-up review.",
      topStrength,
      topWeakness,
      advice,
      promptVersion: "v1",
    };

    await db.insert(behaviorAnalysis).values(analysisRecord);

    res.json({
      ...analysisRecord,
      advice,
    });
  } catch (err) {
    console.error("Journal analysis error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

// ─── GET /ai/journal-analysis/history
router.get("/journal-analysis/history", requireAuth, async (req, res) => {
  try {
    const history = await db.select().from(behaviorAnalysis)
      .where(eq(behaviorAnalysis.userId, req.user!.userId))
      .orderBy(desc(behaviorAnalysis.createdAt))
      .limit(20);
    res.json(history.reverse());
  } catch (err) {
    console.error("Journal history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /ai/portfolio-health ───────────────────────────
// Deterministic metrics calculation + AI explanation only

const portfolioHealthSchema = z.object({
  holdings: z.array(z.object({
    coinId: z.string(),
    symbol: z.string(),
    name: z.string(),
    amount: z.number(),
    avgPrice: z.number(),
    currentPrice: z.number(),
  })),
  walletBalance: z.number(),
});

router.post("/portfolio-health", requireAuth, validate(portfolioHealthSchema), async (req, res) => {
  try {
    const { holdings, walletBalance } = req.body;
    const ph = config.portfolioHealth;

    const STABLECOINS = new Set(["usdt", "usdc", "dai", "busd", "tusd", "usdp", "frax"]);
    const BLUECHIPS = new Set(["bitcoin", "ethereum", "btc", "eth"]);

    // ─── Calculate portfolio values ───────────────────────
    const totalHoldingsValue = holdings.reduce((s: number, h: any) => s + h.currentPrice * h.amount, 0);
    const totalValue = totalHoldingsValue + walletBalance;

    if (totalValue <= 0) {
      res.status(400).json({ error: "Portfolio has no value to analyze." });
      return;
    }

    const walletRatio = walletBalance / totalValue;
    const stablecoinValue = holdings
      .filter((h: any) => STABLECOINS.has(h.symbol.toLowerCase()) || STABLECOINS.has(h.coinId.toLowerCase()))
      .reduce((s: number, h: any) => s + h.currentPrice * h.amount, 0);
    const stableRatio = (stablecoinValue + walletBalance) / totalValue;

    const volatileValue = totalHoldingsValue - stablecoinValue;
    const bluechipValue = holdings
      .filter((h: any) => BLUECHIPS.has(h.symbol.toLowerCase()) || BLUECHIPS.has(h.coinId.toLowerCase()))
      .reduce((s: number, h: any) => s + h.currentPrice * h.amount, 0);
    const bluechipRatio = volatileValue > 0 ? bluechipValue / volatileValue : 0;

    // HHI Diversification score
    const weightedHoldings = holdings.map((h: any) => ({
      ...h,
      value: h.currentPrice * h.amount,
      weight: (h.currentPrice * h.amount) / totalValue,
    }));
    const hhi = weightedHoldings.reduce((s: number, h: any) => s + Math.pow(h.weight * 100, 2), 0);
    const diversificationScore = Math.round(Math.max(0, Math.min(100, 100 - (hhi - 1500) / 85)));

    // Largest single asset
    const sorted = [...weightedHoldings].sort((a, b) => b.weight - a.weight);
    const largestAsset = sorted[0];
    const concentrationRisk = largestAsset ? largestAsset.weight : 0;

    // Stability score
    let stabilityScore = 50;
    if (stableRatio >= ph.IDEAL_STABLE_RATIO_MIN && stableRatio <= ph.IDEAL_STABLE_RATIO_MAX) stabilityScore = 90;
    else if (stableRatio < 0.05) stabilityScore = 20;
    else if (stableRatio < ph.IDEAL_STABLE_RATIO_MIN) stabilityScore = 50 + ((stableRatio - 0.05) / (ph.IDEAL_STABLE_RATIO_MIN - 0.05)) * 40;
    else if (stableRatio > ph.IDEAL_STABLE_RATIO_MAX && stableRatio <= 0.60) stabilityScore = 90 - ((stableRatio - ph.IDEAL_STABLE_RATIO_MAX) / (0.60 - ph.IDEAL_STABLE_RATIO_MAX)) * 40;
    else stabilityScore = 15;
    stabilityScore = Math.round(stabilityScore);

    // Quality score (blue-chip dominance in volatile portion)
    const qualityScore = Math.round(Math.min(100, bluechipRatio * 100));

    // Concentration score (penalizes over-concentration)
    const concentrationScore = Math.round(Math.max(0, Math.min(100,
      concentrationRisk <= ph.MAX_CONCENTRATION ? 100 : 100 - ((concentrationRisk - ph.MAX_CONCENTRATION) / (1 - ph.MAX_CONCENTRATION)) * 100
    )));

    // Overall health score (weighted average)
    const overallScore = Math.round(
      diversificationScore * 0.30 +
      stabilityScore * 0.25 +
      qualityScore * 0.20 +
      concentrationScore * 0.25
    );

    // Reason strings for "Why?" buttons
    const reasons = {
      diversification: largestAsset ? `${largestAsset.name} = ${(largestAsset.weight * 100).toFixed(0)}% of portfolio` : "No holdings to analyze",
      stability: `Cash + stablecoins = ${(stableRatio * 100).toFixed(0)}% of total portfolio`,
      quality: `${(bluechipRatio * 100).toFixed(0)}% of volatile assets are blue-chips (BTC/ETH)`,
      concentration: largestAsset ? `Largest single asset: ${largestAsset.name} at ${(concentrationRisk * 100).toFixed(0)}%` : "No concentration data",
    };

    const recommendations = {
      diversification: diversificationScore < 70 ? `Reduce ${largestAsset?.name ?? "largest position"} below 50% of portfolio` : "Diversification looks healthy",
      stability: stableRatio < ph.IDEAL_STABLE_RATIO_MIN ? "Hold 15–30% in cash or stablecoins as a safety buffer" : stableRatio > ph.IDEAL_STABLE_RATIO_MAX ? "Consider deploying some stable reserves into quality assets" : "Stable reserve balance is optimal",
      quality: qualityScore < 50 ? "Increase BTC/ETH exposure within your volatile holdings for stability" : "Good blue-chip foundation",
      concentration: concentrationRisk > ph.MAX_CONCENTRATION ? `Reduce ${largestAsset?.name ?? "top position"} to below 50% to manage risk` : "Concentration risk is well managed",
    };

    // AI explains the results (does not calculate them)
    const metricsDesc = `
- Overall Health: ${overallScore}/100
- Diversification: ${diversificationScore}/100 (HHI: ${hhi.toFixed(0)})
- Stability (Cash/Stablecoin ratio): ${stabilityScore}/100
- Quality (Blue-chip ratio): ${qualityScore}/100
- Concentration: ${concentrationScore}/100`;

    const prompt = `You are a portfolio health advisor for a crypto trading app.

The following metrics have been calculated deterministically by the backend:
${metricsDesc}

Explain what these scores mean in plain English for a beginner. 
Provide your response strictly as a JSON object with the following keys:
{
  "strengths": ["bullet point 1", "bullet point 2"],
  "weaknesses": ["bullet point 1", "bullet point 2"],
  "recommendations": ["bullet point 1", "bullet point 2"]
}

Keep bullet points short, concise, and educational. Base your insights strictly on the provided scores.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: "You are a crypto portfolio advisor. Respond ONLY with valid JSON." }, { role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: any = null;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match?.[0] ?? raw);
    } catch {
      res.status(500).json({ error: "AI returned malformed analysis" });
      return;
    }

    const metricsData = {
      hhi: Math.round(hhi),
      stableRatio: Math.round(stableRatio * 100),
      bluechipRatio: Math.round(bluechipRatio * 100),
      concentrationRisk: Math.round(concentrationRisk * 100),
      totalValue,
      largestAsset: largestAsset ? { name: largestAsset.name, weight: Math.round(largestAsset.weight * 100) } : null,
    };

    // Save to DB
    const [saved] = await db.insert(portfolioHealthHistory).values({
      userId: req.user!.userId,
      overallScore,
      diversificationScore,
      stabilityScore,
      qualityScore,
      concentrationScore,
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      recommendations: parsed.recommendations ?? [],
      metrics: metricsData,
    }).returning();

    res.json({
      ...saved,
      categories: {
        diversification: { score: diversificationScore, reason: reasons.diversification, recommendation: recommendations.diversification, contribution: Math.round(diversificationScore * 0.30) },
        stability: { score: stabilityScore, reason: reasons.stability, recommendation: recommendations.stability, contribution: Math.round(stabilityScore * 0.25) },
        quality: { score: qualityScore, reason: reasons.quality, recommendation: recommendations.quality, contribution: Math.round(qualityScore * 0.20) },
        concentration: { score: concentrationScore, reason: reasons.concentration, recommendation: recommendations.concentration, contribution: Math.round(concentrationScore * 0.25) },
      },
      metrics: metricsData,
    });
  } catch (err) {
    console.error("Portfolio health error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

// GET /ai/portfolio-health/history
router.get("/portfolio-health/history", requireAuth, async (req, res) => {
  try {
    const history = await db.select().from(portfolioHealthHistory)
      .where(eq(portfolioHealthHistory.userId, req.user!.userId))
      .orderBy(desc(portfolioHealthHistory.createdAt))
      .limit(20);
    res.json(history.reverse().map(h => ({
      ...h,
      categories: {
        diversification: { score: h.diversificationScore, reason: "Historical snapshot", recommendation: "Run a new scan for latest advice", contribution: Math.round(h.diversificationScore * 0.30) },
        stability: { score: h.stabilityScore, reason: "Historical snapshot", recommendation: "Run a new scan for latest advice", contribution: Math.round(h.stabilityScore * 0.25) },
        quality: { score: h.qualityScore, reason: "Historical snapshot", recommendation: "Run a new scan for latest advice", contribution: Math.round(h.qualityScore * 0.20) },
        concentration: { score: h.concentrationScore, reason: "Historical snapshot", recommendation: "Run a new scan for latest advice", contribution: Math.round(h.concentrationScore * 0.25) },
      }
    })));
  } catch (err) {
    console.error("Portfolio health history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
