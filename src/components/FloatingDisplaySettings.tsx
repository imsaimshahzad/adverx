import { Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";

type Currency = "PKR" | "USD";

const CURRENCY_KEY = "adverx-display-currency";

export function FloatingDisplaySettings() {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window === "undefined") return "PKR";
    return window.localStorage.getItem(CURRENCY_KEY) === "USD" ? "USD" : "PKR";
  });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const changeCurrency = (next: Currency) => {
    window.localStorage.setItem(CURRENCY_KEY, next);
    setCurrency(next);
    window.dispatchEvent(new CustomEvent("adverx-currency-change", { detail: next }));
  };

  useEffect(() => {
    const syncCurrency = (event: Event) => {
      const next = (event as CustomEvent<Currency>).detail;
      if (next === "PKR" || next === "USD") setCurrency(next);
    };
    window.addEventListener("adverx-currency-change", syncCurrency);
    return () => window.removeEventListener("adverx-currency-change", syncCurrency);
  }, []);

  return (
    <div ref={panelRef} className="fixed right-4 top-[92px] z-40 sm:right-6 lg:right-8">
      <button
        type="button"
        aria-label="Display settings"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-background/95 text-foreground shadow-lg backdrop-blur-xl transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <Settings2 className="size-5" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Display settings"
          className="absolute right-0 top-[calc(100%+8px)] w-52 rounded-2xl border border-border/70 bg-popover p-3 shadow-xl backdrop-blur-xl"
        >
          <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">Display settings</p>
          <div className="rounded-xl bg-muted p-1">
            <div className="grid grid-cols-2 gap-1">
              {(["PKR", "USD"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeCurrency(option)}
                  className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${
                    currency === option
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-muted px-3 py-2">
            <span className="text-sm font-medium text-foreground">Dark mode</span>
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </div>
  );
}
