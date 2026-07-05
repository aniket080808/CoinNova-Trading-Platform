export const EXCHANGE_RATES = {
    USD: 1,
    INR: 83.5, // Mock static rate, can be replaced by an external API cache
};
/**
 * Converts an amount from one currency to another
 */
export function convertAmount(amount, from, to) {
    if (from === to)
        return amount;
    const fromRate = EXCHANGE_RATES[from] || 1;
    const toRate = EXCHANGE_RATES[to] || 1;
    // Convert to base USD, then to target
    const amountInUsd = amount / fromRate;
    return amountInUsd * toRate;
}
/**
 * Converts a string or number amount into the user's preferred currency
 */
export function formatToUserCurrency(amount, userPref = "USD") {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return convertAmount(numAmount, "USD", userPref);
}
