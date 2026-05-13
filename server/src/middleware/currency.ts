import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

declare global {
  namespace Express {
    interface Request {
      currencyPref?: string;
    }
  }
}

export async function attachCurrencyPref(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    req.currencyPref = "USD";
    return next();
  }

  try {
    const [user] = await db
      .select({ currencyPreference: users.currencyPreference })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    req.currencyPref = user?.currencyPreference || "USD";
  } catch {
    req.currencyPref = "USD";
  }
  
  next();
}
