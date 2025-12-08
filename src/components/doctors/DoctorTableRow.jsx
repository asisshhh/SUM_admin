import React from "react";
import { Link } from "react-router-dom";
import { Stethoscope, Edit2, Trash2, UserCheck, UserX } from "lucide-react";

function DoctorTableRow({ doctor, isSelected, onSelect, onEdit, onDelete }) {
  return (
    <tr className="border-b hover:bg-slate-50 transition">
      <td className="p-3">
        <input
          type="checkbox"
          className="w-4 h-4 accent-blue-600"
          checked={isSelected}
          onChange={onSelect}
        />
      </td>

      <td className="p-3">
        <Link className="flex items-center gap-3 group" to={`/doctors/${doctor.id}`}>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Stethoscope size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-slate-800 group-hover:text-blue-600 transition">
              {doctor.user?.name}
            </div>
            <div className="text-xs text-slate-500">{doctor.user?.phone}</div>
          </div>
        </Link>
      </td>

      <td className="p-3 text-slate-600">{doctor.specialization || "—"}</td>

      <td className="p-3">
        {doctor.department?.name ? (
          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
            {doctor.department.name}
          </span>
        ) : "—"}
      </td>

      <td className="p-3 text-slate-600">
        {doctor.experience ? `${doctor.experience} yrs` : "—"}
      </td>

      <td className="p-3 font-medium">
        ₹{doctor.consultationFee?.toLocaleString() ?? "—"}
      </td>

      <td className="p-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          doctor.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {doctor.available ? <UserCheck size={12} /> : <UserX size={12} />}
          {doctor.available ? "Available" : "Unavailable"}
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

export default React.memo(DoctorTableRow);

