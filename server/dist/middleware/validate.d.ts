import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
/**
 * Express middleware factory that validates req.body against a Zod schema.
 * On validation failure, returns 400 with structured error details.
 */
export declare function validate(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
