import React from "react";
import { Package, Edit2, Trash2, Star, Sparkles, Eye } from "lucide-react";

function PackageTableRow({
  pkg,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true
}) {
  return (
    <tr className="border-b hover:bg-slate-50 transition">
      <td className="p-3">
        <div className="flex items-center gap-3">
          {pkg.imageUrl ? (
            <img
              src={pkg.imageUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package size={20} className="text-blue-600" />
            </div>
          )}
          <div>
            <div className="font-medium text-slate-800">{pkg.name}</div>
            <div className="flex gap-2 mt-1">
              {pkg.popular && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star size={10} /> Popular
                </span>
              )}
              {pkg.featured && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={10} /> Featured
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="p-3 text-right font-semibold">
        ₹{pkg.price?.toLocaleString()}
      </td>
      <td className="p-3 text-right">
        {pkg.discountPrice ? (
          <span className="text-green-600 font-medium">
            ₹{pkg.discountPrice?.toLocaleString()}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="p-3 text-center">
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          {pkg.testCount || pkg.tests?.length || 0} tests
        </span>
      </td>
      <td className="p-3 text-center text-slate-600">
        {pkg.validityDays ? `${pkg.validityDays} days` : "—"}
      </td>
      <td className="p-3 text-center">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            pkg.active
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
          {pkg.active ? "Active" : "Inactive"}
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
          {canEdit && (
            <button
              className="p-2 hover:bg-slate-100 rounded-lg transition"
              onClick={onEdit}
              title="Edit">
              <Edit2 size={16} className="text-slate-600" />
            </button>
          )}
          {canDelete && (
            <button
              className="p-2 hover:bg-red-50 rounded-lg transition"
              onClick={onDelete}
              title="Delete">
              <Trash2 size={16} className="text-red-500" />
            </button>
          )}
          {!canEdit && !canDelete && (
            <span className="text-xs text-slate-400">View only</span>
          )}
        </div>
      </td>
    </tr>
  );
}

export default React.memo(PackageTableRow);
