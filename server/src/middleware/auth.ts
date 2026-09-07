import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

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
export function requireAuth(req: Request, res: Response, next: NextFunction) {
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
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
  }
}

/** Middleware — parse JWT from cookie or header if present, but don't fail if missing */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.coinnova_session;
  const header = req.headers.authorization;
  const token = cookieToken || (header?.startsWith("Bearer ") ? header.slice(7) : null);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
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
