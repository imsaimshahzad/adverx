import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, plainDescription, shortId, statusBadge, typeLabel } from "@/lib/display";

type TransactionRowData = {
  id?: string | null;
  transaction_no?: string | null;
  kind?: string | null;
  entry_type?: string | null;
  source?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  description?: string | null;
  created_at?: string | number | null;
};

type Props = {
  row: TransactionRowData;
  onClick?: () => void;
  showId?: boolean;
};

export function TransactionRow({ row, onClick, showId = true }: Props) {
  const type = typeLabel(row.kind ?? row.entry_type ?? row.source);
  const badge = statusBadge(row.status);
  const description = plainDescription(row.kind ?? row.entry_type ?? row.source) === "—"
    ? "Transaction activity"
    : plainDescription(row.kind ?? row.entry_type ?? row.source);

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full gap-3 border-b border-border/60 px-4 py-4 text-left transition-colors hover:bg-muted/30 md:grid-cols-[minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(180px,1.6fr)_minmax(90px,.8fr)_minmax(110px,.8fr)] md:items-center"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-base" aria-hidden="true">{type.icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{type.label}</p>
          {showId ? <p className="font-mono text-[11px] font-semibold text-primary">{shortId(row.id ?? row.transaction_no)}</p> : null}
        </div>
      </div>
      <p className="truncate text-sm text-muted-foreground">{description}</p>
      <p className="text-xs text-muted-foreground">{formatDate(row.created_at)}</p>
      <Badge className={`w-fit ${badge.className}`}>{badge.label}</Badge>
      <p className={`text-sm font-semibold tabular-nums md:text-right ${Number(row.amount ?? 0) < 0 ? "text-destructive" : "text-success"}`}>
        {formatMoney(row.amount, row.currency ?? "PKR")}
      </p>
    </button>
  );
}
