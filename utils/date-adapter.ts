import { format } from "date-fns";

export interface FlashCalendarDateRange {
  startId?: string;
  endId?: string;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export function flashCalendarToDateRange(
  flashRange: FlashCalendarDateRange
): DateRange | undefined {
  if (!flashRange.startId && !flashRange.endId) return undefined;

  return {
    from: flashRange.startId ? new Date(flashRange.startId) : undefined,
    to: flashRange.endId ? new Date(flashRange.endId) : undefined,
  };
}

export function dateRangeToFlashCalendar(
  dateRange: DateRange
): FlashCalendarDateRange {
  return {
    startId: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    endId: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  };
}

export function formatSeismicMonitorDateFromFlash(
  flashRange: FlashCalendarDateRange | undefined
) {
  const dateRange = flashCalendarToDateRange(flashRange || {});

  if (!dateRange?.from || !dateRange?.to) return "";

  const isSameDay =
    dateRange.from.getDate() === dateRange.to.getDate() &&
    dateRange.from.getMonth() === dateRange.to.getMonth() &&
    dateRange.from.getFullYear() === dateRange.to.getFullYear();

  if (isSameDay) {
    return format(dateRange.from, "MMMM d, yyyy");
  }

  const fromYear = dateRange.from.getFullYear();
  const toYear = dateRange.to.getFullYear();

  if (fromYear === toYear) {
    return `${format(dateRange.from, "MMM d")} - ${format(
      dateRange.to,
      "MMM d, yyyy"
    )}`;
  } else {
    return `${format(dateRange.from, "MMM d, yyyy")} - ${format(
      dateRange.to,
      "MMM d, yyyy"
    )}`;
  }
}
