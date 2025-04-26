// Currency Context

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Currency } from "@/lib/constants";
import { getAllCurrencyRates } from "@/lib/currencyExchange";

interface CurrencyContextType {
  preferredCurrency: Currency;
  setPreferredCurrency: (currency: Currency) => void;
  isLoading: boolean;
  rates: Map<string, number>;
}

// Create context
const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Provide currency-related state and exchange rates to the application after fetching from server
  const { data: session, status } = useSession();
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>("USD");
  const [rates, setRates] = useState<Map<string, number>>(
    new Map([["USD", 1]]),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (status === "loading") return;

      const fetchedRates = await getAllCurrencyRates();
      setRates(fetchedRates);

      if (session?.user?.preferences?.currency) {
        setPreferredCurrency(session.user.preferences.currency as Currency);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [session, status]);

  return (
    <CurrencyContext.Provider
      value={{ preferredCurrency, setPreferredCurrency, isLoading, rates }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

// Hook to access currency context, must be used inside a CurrencyProvider
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
