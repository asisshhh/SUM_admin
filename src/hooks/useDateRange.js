import { useState } from "react";

export default function useDateRange() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [includeFuture, setIncludeFuture] = useState(false);

  const buildDateParams = () => ({
    from: fromDate || undefined,
    to: toDate || undefined,
    includeFuture: includeFuture || undefined
  });

  const resetDates = () => {
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
    resetDates
  };
}
