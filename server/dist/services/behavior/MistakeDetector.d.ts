import type { RawTransaction, MistakeResult } from "./types.js";
export declare function detectMistakes(txs: RawTransaction[]): MistakeResult[];
export declare function findMostExpensiveHabit(txs: RawTransaction[], mistakes: MistakeResult[]): {
    label: string;
    detected: number;
    averageLossPct: number;
    largestLossAmount: number;
    estimatedTotalLoss: number;
} | null;
