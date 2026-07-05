import type { GuardianResult, RawTransaction } from "./types.js";
export interface ProposedTrade {
    type: "buy" | "sell";
    coinId: string;
    amount: number;
    price: number;
    confidence: number;
}
export declare function validateTrade(proposed: ProposedTrade, history: RawTransaction[]): GuardianResult;
