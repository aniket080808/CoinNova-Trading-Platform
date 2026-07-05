import jwt from "jsonwebtoken";
import { config } from "../config.js";
/** Sign a JWT for the given payload */
export function signToken(payload) {
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
    });
}
/** Middleware — require a valid JWT in Authorization header */
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid Authorization header" });
        return;
    }
    try {
        const token = header.slice(7);
        const decoded = jwt.verify(token, config.jwtSecret);
        if (decoded.isTemp) {
            res.status(403).json({ error: "Temporary token cannot access this resource. Please complete 2FA." });
            return;
        }
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
/** Middleware — parse JWT if present, but don't fail if missing */
export function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        next();
        return;
    }
    try {
        const token = header.slice(7);
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
    }
    catch {
        // Ignore invalid tokens for optional auth
    }
    next();
}
/** Middleware — require admin role (must come after requireAuth) */
export function requireAdmin(req, res, next) {
    if (req.user?.email !== config.adminEmail) {
        res.status(403).json({ error: "Admin access required" });
        return;
    }
    next();
}
