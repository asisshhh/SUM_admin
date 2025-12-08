import React from "react";

export default function ConfirmModal({
  open,
  title = "Confirm",
  message,
  onCancel,
  onConfirm
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0 bg-black opacity-40"
        onClick={onCancel}
      />
      <div className="bg-white p-6 rounded shadow z-10 w-11/12 max-w-md">
        <h4 className="text-lg font-semibold mb-2">{title}</h4>
        <div className="mb-4">{message}</div>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 border rounded" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-emerald-600 text-white rounded"
            onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
