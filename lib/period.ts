import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

export type PeriodSelection =
  | { mode: "single"; offset: 0 | 1 | 2 }
  | { mode: "range"; months: number };

export interface ResolvedPeriod {
  from: string;
  to: string;
  sinceDate: string;
  untilDate: string;
  label: string;
  mode: PeriodSelection["mode"];
}

const SINGLE_LABELS: Record<number, string> = {
  0: "今月",
  1: "先月",
  2: "先々月",
};

export function resolvePeriod(
  selection: PeriodSelection,
  reference: Date = new Date()
): ResolvedPeriod {
  if (selection.mode === "single") {
    const target = subMonths(reference, selection.offset);
    const monthStr = format(target, "yyyy-MM");
    return {
      from: monthStr,
      to: monthStr,
      sinceDate: format(startOfMonth(target), "yyyy-MM-dd"),
      untilDate: format(endOfMonth(target), "yyyy-MM-dd"),
      label: SINGLE_LABELS[selection.offset] ?? `${monthStr}`,
      mode: "single",
    };
  }
  const toMonth = format(reference, "yyyy-MM");
  const fromMonth = format(
    subMonths(startOfMonth(reference), selection.months - 1),
    "yyyy-MM"
  );
  return {
    from: fromMonth,
    to: toMonth,
    sinceDate: format(
      subMonths(startOfMonth(reference), selection.months - 1),
      "yyyy-MM-dd"
    ),
    untilDate: format(endOfMonth(reference), "yyyy-MM-dd"),
    label: `${selection.months}ヶ月`,
    mode: "range",
  };
}

export const SINGLE_MONTH_OPTIONS: Array<{ offset: 0 | 1 | 2; label: string }> = [
  { offset: 0, label: "今月" },
  { offset: 1, label: "先月" },
  { offset: 2, label: "先々月" },
];
