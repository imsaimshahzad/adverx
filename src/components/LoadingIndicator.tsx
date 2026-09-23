import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

type LoadingIndicatorProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

const sizes = {
  sm: "loader-wrapper--sm",
  md: "loader-wrapper--md",
  lg: "loader-wrapper--lg",
} as const;

export function LoadingIndicator({ size = "md", label = "Loading", className }: LoadingIndicatorProps) {
  return (
    <span
      className={cn("loader-wrapper wallet-loader", sizes[size], className)}
      role="status"
      aria-label={label}
    >
      <span className="wallet-back" />
      <span className="bill bill-1" />
      <span className="bill bill-2" />
      <span className="bill bill-3" />
      <span className="wallet-front">
        <span className="wallet-loading-text">
          {label}
          <span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </span>
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function LoadingScreen({ label = "Loading your workspace" }: { label?: string }) {
  return (
    <div className="loading-screen flex min-h-screen flex-col items-center justify-center gap-5 bg-background text-sm text-muted-foreground" role="status" aria-live="polite">
      <BrandLogo className="max-w-[26rem] sm:max-w-[31.5rem]" />
      <LoadingIndicator size="lg" label="Loading" />
      <span>{label}</span>
    </div>
  );
}

export function LoadingButtonContent({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LoadingIndicator size="sm" label={label} />
      <span>{label}</span>
    </span>
  );
}
