import type { MistakeResult, PatternResult, RawTransaction, ScoreEngineResult } from "./types.js";
export declare function generateTradingDNA(txs: RawTransaction[], mistakes: MistakeResult[], patterns: PatternResult): ScoreEngineResult;
