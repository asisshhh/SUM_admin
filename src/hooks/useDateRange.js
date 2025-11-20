import { useState } from "react";

export default function useDateRange() {
  const today = new Date().toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [includeFuture, setIncludeFuture] = useState(false);

  const resetDates = () => {
    setFromDate(today);
    setToDate(today);
    setIncludeFuture(false);
  };

  const buildDateParams = () => {
    if (includeFuture) {
      return { from: fromDate };
    }
    return { from: fromDate, to: toDate };
  };

  return {
    today,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    includeFuture,
    setIncludeFuture,
    buildDateParams,
    resetDates
  };
}
