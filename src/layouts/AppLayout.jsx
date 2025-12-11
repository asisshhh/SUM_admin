import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Stethoscope,
  Building2,
  Ambulance,
  MessageSquare,
  Image,
  BarChart2,
  LogOut,
  ListChecks,
  FlaskConical,
  FolderTree,
  Gift,
  Settings
} from "lucide-react";
import logo from "../assets/logo.webp";

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
        <div className="px-5 py-6 flex items-center gap-3 border-b border-slate-200">
          <img
            src={logo}
            alt="Hospital Logo"
            className="h-10 w-auto object-contain"
          />
          <span className="text-lg font-bold tracking-tight text-slate-800">
            App Admin
          </span>
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

          {/* Ambulance Section */}
          <div className="mt-4 mb-2 px-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ambulance</span>
          </div>
          <NavItem to="/ambulance" icon={Ambulance} label="Ambulances" />
          <NavItem to="/ambulance-types" icon={Ambulance} label="Ambulance Types" />
          <NavItem to="/ambulance-charges" icon={Ambulance} label="Charges" />
          <NavItem to="/ambulance-features" icon={Settings} label="Features" />
          <NavItem to="/drivers" icon={Ambulance} label="Drivers" />
          <NavItem to="/ambulance-logs" icon={Ambulance} label="Logs" />

          {/* Lab & Packages Section */}
          <div className="mt-4 mb-2 px-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lab & Packages</span>
          </div>
          <NavItem to="/test-categories" icon={FolderTree} label="Test Categories" />
          <NavItem to="/lab-tests" icon={FlaskConical} label="Lab Tests" />
          <NavItem to="/health-packages" icon={Gift} label="Health Packages" />

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
