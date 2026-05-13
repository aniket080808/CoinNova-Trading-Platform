import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CurrencyState {
  currency: "USD" | "INR";
  rate: number; // 1 USD = X INR
  setCurrency: (c: "USD" | "INR") => void;
  updateRate: () => Promise<void>;
  convert: (amount: number) => number;
  format: (amount: number, opts?: Intl.NumberFormatOptions) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: "USD",
      rate: 83.5, // Fallback rate
      setCurrency: (c) => set({ currency: c }),
      updateRate: async () => {
        try {
          console.log("🪙 Fetching live USD/INR exchange rate...");
          const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
          if (!res.ok) throw new Error("Network response was not ok");
          const data = await res.json();
          if (data.rates && data.rates.INR) {
            console.log("✅ Rate updated:", data.rates.INR);
            set({ rate: data.rates.INR });
          }
        } catch (err) {
          console.error("❌ Failed to fetch exchange rate:", err);
          // Fallback to a reasonable default if API fails
          set({ rate: 83.5 });
        }
      },
      convert: (amount) => {
        const { currency, rate } = get();
        return currency === "INR" ? amount * rate : amount;
      },
      format: (amount, opts = {}) => {
        const { currency, rate } = get();
        const value = currency === "INR" ? amount * rate : amount;
        return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
          style: "currency",
          currency: currency,
          maximumFractionDigits: 2,
          ...opts,
        }).format(value);
      },
    }),
    {
      name: "coinnova-currency",
    }
  )
);
