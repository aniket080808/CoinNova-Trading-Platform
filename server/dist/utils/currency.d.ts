export declare const EXCHANGE_RATES: Record<string, number>;
/**
 * Converts an amount from one currency to another
 */
export declare function convertAmount(amount: number, from: "USD" | "INR" | string, to: "USD" | "INR" | string): number;
/**
 * Converts a string or number amount into the user's preferred currency
 */
export declare function formatToUserCurrency(amount: number | string, userPref?: string): number;
