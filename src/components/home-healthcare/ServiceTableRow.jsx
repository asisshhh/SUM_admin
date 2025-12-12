import React from "react";
import { Edit2, Trash2, Home, Star, Sparkles, Eye, Clock } from "lucide-react";

function ServiceTableRow({ service, onView, onEdit, onDelete }) {
  return (
    <tr className="border-b hover:bg-slate-50 transition">
      <td className="p-3">
        <div className="font-medium text-slate-800">{service.name}</div>
        <div className="flex gap-2 mt-1">
          {service.popular && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star size={10} /> Popular
            </span>
          )}
          {service.featured && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={10} /> Featured
            </span>
          )}
        </div>
      </td>
      <td className="p-3 text-slate-600">{service.category?.name || "—"}</td>
      <td className="p-3 text-center">
        <div className="flex items-center justify-center gap-1 text-slate-600">
          <Clock size={14} />
          <span>{service.duration} min</span>
        </div>
      </td>
      <td className="p-3 text-right font-semibold">
        ₹{service.price?.toLocaleString()}
      </td>
      <td className="p-3 text-right">
        {service.discountPrice ? (
          <span className="text-emerald-600 font-medium">
            ₹{service.discountPrice?.toLocaleString()}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="p-3 text-center">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            service.active
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
          {service.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="p-3">
        <div className="flex justify-center gap-1">
          <button
            className="p-2 hover:bg-blue-50 rounded-lg transition"
            onClick={onView}
            title="View Details">
            <Eye size={16} className="text-blue-500" />
          </button>
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

export default React.memo(ServiceTableRow);
