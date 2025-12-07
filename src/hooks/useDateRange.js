import { useState } from "react";

export default function useDateRange() {
  // Default to today's date
  const today = new Date().toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [includeFuture, setIncludeFuture] = useState(false);

  const buildDateParams = () => ({
    from: fromDate || undefined,
    to: toDate || undefined,
    includeFuture: includeFuture || undefined
  });

  const resetDates = () => {
    // Reset to today's date instead of empty
    setFromDate(today);
    setToDate(today);
    setIncludeFuture(false);
  };

  // Clear dates completely (for "All Time" view)
  const clearDates = () => {
    setFromDate("");
    setToDate("");
    setIncludeFuture(false);
  };

  return {
    fromDate,
    toDate,
    includeFuture,
    setFromDate,
    setToDate,
    setIncludeFuture,
    buildDateParams,
    resetDates,
    clearDates,
    today // expose today for convenience
  };
}
