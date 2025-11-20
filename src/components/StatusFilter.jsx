import React from "react";

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
    <div>
      <select
        className="w-full border p-2 rounded-lg"
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
