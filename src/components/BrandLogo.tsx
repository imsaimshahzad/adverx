import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <img
      src="/adverx-logo.png"
      alt="AdverX"
      className={cn(
        "block h-auto w-auto max-w-full object-contain object-center",
        compact ? "max-h-10 max-w-[10rem]" : "max-h-12 max-w-[14rem]",
        className,
      )}
    />
  );
}
