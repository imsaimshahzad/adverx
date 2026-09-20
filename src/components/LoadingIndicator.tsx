import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

type LoadingIndicatorProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

const sizes = {
  sm: "bounce-loader--sm",
  md: "bounce-loader--md",
  lg: "bounce-loader--lg",
} as const;

export function LoadingIndicator({ size = "md", label, className }: LoadingIndicatorProps) {
  return (
    <span className={cn("newtons-cradle", sizes[size], className)} role="status" aria-label={label ?? "Loading"}>
      <span className="bounce-loader__circle" />
      <span className="bounce-loader__circle" />
      <span className="bounce-loader__circle" />
      <span className="bounce-loader__shadow" />
      <span className="bounce-loader__shadow" />
      <span className="bounce-loader__shadow" />
      <span className="sr-only">{label ?? "Loading"}</span>
    </span>
  );
}

export function LoadingScreen({ label = "Loading your workspace" }: { label?: string }) {
  return (
    <div className="loading-screen flex min-h-screen flex-col items-center justify-center gap-5 bg-background text-sm text-muted-foreground" role="status" aria-live="polite">
      <BrandLogo className="max-w-[26rem] sm:max-w-[31.5rem]" />
      <LoadingIndicator size="lg" label={label} />
      <span>{label}</span>
    </div>
  );
}

export function LoadingButtonContent({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-2"><LoadingIndicator size="sm" label={label} /><span>{label}</span></span>;
}
