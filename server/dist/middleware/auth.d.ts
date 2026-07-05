import { Request, Response, NextFunction } from "express";
export interface JwtPayload {
    userId: string;
    email: string;
    role: "user" | "admin";
    isTemp?: boolean;
}
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
/** Sign a JWT for the given payload */
export declare function signToken(payload: JwtPayload): string;
/** Middleware — require a valid JWT in Authorization header */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
/** Middleware — parse JWT if present, but don't fail if missing */
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): void;
/** Middleware — require admin role (must come after requireAuth) */
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
