import React from "react";
import { Link } from "react-router-dom";
import { Building2, Edit2, Trash2, Users } from "lucide-react";

function DepartmentTableRow({
  department,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true
}) {
  return (
    <tr className="border-b hover:bg-slate-50 transition">
      <td className="p-3">
        <Link
          className="flex items-center gap-3 group"
          to={`/departments/${department.id}`}>
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Building2 size={18} className="text-indigo-600" />
          </div>
          <div>
            <div className="font-medium text-slate-800 group-hover:text-indigo-600 transition">
              {department.name}
            </div>
            {department.displayOrder !== null && (
              <div className="text-xs text-slate-400">
                Order: {department.displayOrder}
              </div>
            )}
          </div>
        </Link>
      </td>

      <td className="p-3 text-slate-600 max-w-xs truncate">
        {department.description || "—"}
      </td>

      <td className="p-3 text-center">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          <Users size={12} />
          {department.doctorCount || 0}
        </span>
      </td>

      <td className="p-3 text-center">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            department.active
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
          {department.active ? "Active" : "Inactive"}
        </span>
      </td>

      <td className="p-3">
        <div className="flex justify-center gap-2">
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

export default React.memo(DepartmentTableRow);
