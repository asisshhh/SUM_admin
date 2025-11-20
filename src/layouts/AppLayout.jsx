import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Stethoscope,
  Building2,
  Ambulance,
  Package,
  MessageSquare,
  Image,
  BarChart2,
  LogOut,
  ListChecks
} from "lucide-react";

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      `
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
      hover:bg-slate-100 hover:text-blue-600
      ${
        isActive
          ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
          : "text-slate-700"
      }
      `
    }>
    <Icon size={18} />
    <span>{label}</span>
  </NavLink>
);

export default function AppLayout() {
  const nav = useNavigate();
  const logout = () => {
    localStorage.removeItem("token");
    nav("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ---------------- SIDEBAR ---------------- */}
      <aside className="w-[260px] bg-white border-r border-slate-200 flex flex-col">
        {/* Branding */}
        <div className="px-5 py-6 text-2xl font-bold tracking-tight text-slate-800">
          🏥 Hospital Admin
        </div>

        {/* NAV MENU */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/orders" icon={ListChecks} label="Orders" />
          <NavItem to="/doctors" icon={Stethoscope} label="Doctors" />
          <NavItem
            to="/doctor-calendar"
            icon={Stethoscope}
            label="Doctor Calendar"
          />
          <NavItem to="/departments" icon={Building2} label="Departments" />
          <NavItem to="/ambulance" icon={Ambulance} label="Ambulance" />
          <NavItem to="/packages" icon={Package} label="Health Packages" />
          <NavItem to="/feedback" icon={MessageSquare} label="Feedback" />
          <NavItem to="/banners" icon={Image} label="Banners" />
          <NavItem to="/reports" icon={BarChart2} label="Reports" />
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="flex-1 p-8">
        {/* TOP HEADER BAR */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold text-slate-800">
            Admin Dashboard
          </h1>

          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 bg-white border rounded-full shadow-sm text-sm text-slate-600">
              Admin Panel
            </div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="space-y-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
