import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
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
  Settings,
  Home,
  Package,
  AlertCircle,
  Activity,
  Clock,
  Menu,
  X
} from "lucide-react";
import logo from "../assets/logo.webp";

const NavItem = ({ to, icon: Icon, label, onClick }) => {
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (onClick) onClick();
  };

  return (
    <NavLink
      to={to}
      end
      onClick={handleClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
        hover:bg-slate-100 hover:text-blue-600
        ${
          isActive
            ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
            : "text-slate-700"
        }`
      }>
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
};

// Sidebar Navigation Content
const SidebarNav = ({ onNavClick }) => (
  <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
    <NavItem
      to="/"
      icon={LayoutDashboard}
      label="Dashboard"
      onClick={onNavClick}
    />
    <NavItem
      to="/orders"
      icon={ListChecks}
      label="Orders"
      onClick={onNavClick}
    />
    <NavItem
      to="/doctors"
      icon={Stethoscope}
      label="Doctors"
      onClick={onNavClick}
    />
    <NavItem
      to="/doctor-calendar"
      icon={Stethoscope}
      label="Doctor Calendar"
      onClick={onNavClick}
    />
    <NavItem
      to="/doctor-schedule"
      icon={Clock}
      label="Doctor Schedule"
      onClick={onNavClick}
    />
    <NavItem
      to="/global-schedule"
      icon={Clock}
      label="Global Schedule"
      onClick={onNavClick}
    />
    <NavItem
      to="/time-slot-templates"
      icon={Clock}
      label="Time Slot Templates"
      onClick={onNavClick}
    />
    <NavItem
      to="/departments"
      icon={Building2}
      label="Departments"
      onClick={onNavClick}
    />

    {/* Ambulance Section */}
    <div className="mt-4 mb-2 px-4">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Ambulance
      </span>
    </div>
    <NavItem
      to="/ambulance"
      icon={Ambulance}
      label="Ambulances"
      onClick={onNavClick}
    />
    <NavItem
      to="/ambulance-types"
      icon={Ambulance}
      label="Ambulance Types"
      onClick={onNavClick}
    />
    <NavItem
      to="/ambulance-features"
      icon={Settings}
      label="Features"
      onClick={onNavClick}
    />
    <NavItem
      to="/drivers"
      icon={Ambulance}
      label="Drivers"
      onClick={onNavClick}
    />
    <NavItem
      to="/ambulance-logs"
      icon={Ambulance}
      label="Logs"
      onClick={onNavClick}
    />

    {/* Lab & Packages Section */}
    <div className="mt-4 mb-2 px-4">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Lab & Packages
      </span>
    </div>
    <NavItem
      to="/test-categories"
      icon={FolderTree}
      label="Test Categories"
      onClick={onNavClick}
    />
    <NavItem
      to="/lab-tests"
      icon={FlaskConical}
      label="Lab Tests"
      onClick={onNavClick}
    />
    <NavItem
      to="/health-packages"
      icon={Gift}
      label="Health Packages"
      onClick={onNavClick}
    />

    {/* Home Healthcare Section */}
    <div className="mt-4 mb-2 px-4">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Home Healthcare
      </span>
    </div>
    <NavItem
      to="/home-healthcare-services"
      icon={Home}
      label="Services"
      onClick={onNavClick}
    />
    <NavItem
      to="/home-healthcare-packages"
      icon={Package}
      label="Packages"
      onClick={onNavClick}
    />

    <NavItem
      to="/feedback"
      icon={MessageSquare}
      label="Feedback"
      onClick={onNavClick}
    />
    <NavItem
      to="/grievances"
      icon={AlertCircle}
      label="Grievances"
      onClick={onNavClick}
    />
    <NavItem to="/banners" icon={Image} label="Banners" onClick={onNavClick} />
    <NavItem
      to="/reports"
      icon={BarChart2}
      label="Reports"
      onClick={onNavClick}
    />

    {/* Admin Section */}
    <div className="mt-4 mb-2 px-4">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Admin
      </span>
    </div>
    <NavItem
      to="/activity-logs"
      icon={Activity}
      label="Activity Logs"
      onClick={onNavClick}
    />
  </nav>
);

export default function AppLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    nav("/login");
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ---------------- MOBILE HEADER ---------------- */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
          <span className="text-base font-bold tracking-tight text-slate-800">
            App Admin
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition"
          aria-label="Toggle menu">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={closeMobileMenu}
        />
      )}

      {/* ---------------- MOBILE SIDEBAR ---------------- */}
      <aside
        className={`
          lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
        {/* Mobile sidebar header */}
        <div className="px-5 py-6 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
            <span className="text-lg font-bold tracking-tight text-slate-800">
              App Admin
            </span>
          </div>
          <button
            onClick={closeMobileMenu}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <SidebarNav onNavClick={closeMobileMenu} />
        {/* Mobile Logout */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* ---------------- DESKTOP STICKY SIDEBAR ---------------- */}
      <aside className="hidden lg:flex lg:flex-col fixed top-0 left-0 h-screen w-[260px] bg-white border-r border-slate-200 z-30">
        {/* Branding */}
        <div className="px-5 py-6 flex items-center gap-3 border-b border-slate-200">
          <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
          <span className="text-lg font-bold tracking-tight text-slate-800">
            App Admin
          </span>
        </div>
        <SidebarNav />
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
      <main className="lg:ml-[260px] pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* TOP HEADER BAR (Desktop) */}
          <div className="hidden lg:flex items-center justify-between mb-8">
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
          <div className="space-y-6 lg:space-y-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
