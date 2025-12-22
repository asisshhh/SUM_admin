import React from "react";
import { SearchableDropdown } from "./shared";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PAYMENT_COMPLETED", label: "Payment Completed" },
  { value: "PAY_AT_HOSPITAL", label: "Pay at Hospital" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" }
];

export default function StatusFilter({ value, onChange }) {
  return (
    <SearchableDropdown
      value={value || ""}
      options={STATUS_OPTIONS}
      onChange={onChange}
      placeholder="All"
      className=""
    />
  );
}
