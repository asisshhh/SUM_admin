import React from "react";
import { Edit2, Trash2, Home, Star } from "lucide-react";

function LabTestTableRow({ test, onEdit, onDelete }) {
  return (
    <tr className="border-b hover:bg-slate-50 transition">
      <td className="p-3">
        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{test.code}</span>
      </td>
      <td className="p-3">
        <div className="font-medium text-slate-800">{test.name}</div>
        <div className="flex gap-2 mt-1">
          {test.homeCollection && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Home size={10} /> Home
            </span>
          )}
          {test.popular && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star size={10} /> Popular
            </span>
          )}
        </div>
      </td>
      <td className="p-3 text-slate-600">{test.category?.name || "—"}</td>
      <td className="p-3 text-right font-semibold">₹{test.price?.toLocaleString()}</td>
      <td className="p-3 text-right">
        {test.discountPrice ? (
          <span className="text-emerald-600 font-medium">₹{test.discountPrice?.toLocaleString()}</span>
        ) : (
          "—"
        )}
      </td>
      <td className="p-3 text-center text-slate-600">{test.turnaroundTime || "—"}</td>
      <td className="p-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          test.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {test.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="p-3">
        <div className="flex justify-center gap-2">
          <button
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            onClick={onEdit}
            title="Edit">
            <Edit2 size={16} className="text-slate-600" />
          </button>
          <button
            className="p-2 hover:bg-red-50 rounded-lg transition"
            onClick={onDelete}
            title="Delete">
            <Trash2 size={16} className="text-red-500" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default React.memo(LabTestTableRow);

