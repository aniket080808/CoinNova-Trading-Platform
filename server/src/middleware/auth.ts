import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

export interface JwtPayload {
  userId: string;
  email: string;
  role: "user" | "admin";
  isTemp?: boolean;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Sign a JWT for the given payload */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
}

/** Middleware — require a valid JWT from HTTP-only cookie or Authorization header */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.coinnova_session;
  const header = req.headers.authorization;
  const token = cookieToken || (header?.startsWith("Bearer ") ? header.slice(7) : null);

  if (!token) {
    res.status(401).json({ error: "Missing or invalid session. Please sign in." });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (decoded.isTemp) {
      res.status(403).json({ error: "Temporary token cannot access this resource. Please complete 2FA." });
      return;
    }

    // Check account block status for non-admin accounts
    if (decoded.email !== config.adminEmail) {
      const [dbUser] = await db
        .select({
          id: users.id,
          isBlocked: users.isBlocked,
          blockReason: users.blockReason,
        })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!dbUser || dbUser.isBlocked) {
        res.clearCookie("coinnova_session");

        res.status(403).json({
          error: "ACCOUNT_BLOCKED",
          message: dbUser?.blockReason
            ? `Your account has been suspended: ${dbUser.blockReason}`
            : "Your account has been suspended by the platform administrator.",
          reason: dbUser?.blockReason || "Account suspended by administrator.",
          isBlocked: true,
        });
        return;
      }
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
  }
}

/** Middleware — parse JWT from cookie or header if present, but don't fail if missing */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.coinnova_session;
  const header = req.headers.authorization;
  const token = cookieToken || (header?.startsWith("Bearer ") ? header.slice(7) : null);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (decoded.email !== config.adminEmail) {
      const [dbUser] = await db
        .select({ id: users.id, isBlocked: users.isBlocked })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);
      if (dbUser?.isBlocked) {
        next();
        return;
      }
    }
    req.user = decoded;
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
}

/** Middleware — require admin role (must come after requireAuth) */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.email !== config.adminEmail) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
