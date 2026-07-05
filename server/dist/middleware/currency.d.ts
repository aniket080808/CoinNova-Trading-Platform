import { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            currencyPref?: string;
        }
    }
}
export declare function attachCurrencyPref(req: Request, res: Response, next: NextFunction): Promise<void>;
