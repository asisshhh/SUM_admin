import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  CalendarCheck,
  Ambulance,
  Package,
  FlaskConical,
  Home
} from "lucide-react";

const SubTab = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm
       ${
         isActive
           ? "bg-blue-50 text-blue-700 font-semibold"
           : "text-slate-600 hover:bg-slate-100"
       }`
    }>
    <Icon size={18} /> <span>{label}</span>
  </NavLink>
);

export default function OrderLayout() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order Management</h2>
      </div>

      <div className="flex gap-3 bg-white p-3 rounded-xl shadow-sm">
        <SubTab to="appointments" icon={CalendarCheck} label="Appointments" />
        <SubTab to="ambulance" icon={Ambulance} label="Ambulance" />
        <SubTab to="packages" icon={Package} label="Health Packages" />
        <SubTab to="lab" icon={FlaskConical} label="Lab / Investigation" />
        <SubTab to="homecare" icon={Home} label="Home Healthcare" />
      </div>

      <div>
        <Outlet />
      </div>
    </div>
  );
}
