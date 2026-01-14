import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
  X,
  Users,
  HeartPulse,
  Shield,
  User,
  Crown,
  FileText,
  Scale,
  RotateCcw,
  Calendar
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

// Default navigation structure
const DEFAULT_NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, category: "Main" },

  { path: "/orders", label: "Orders", icon: ListChecks, category: "Main" },
  {
    path: "/doctors",
    label: "Doctors",
    icon: Stethoscope,
    category: "Clinical"
  },
  {
    path: "/doctor-calendar",
    label: "Doctor Calendar",
    icon: Stethoscope,
    category: "Clinical"
  },
  {
    path: "/doctor-schedule",
    label: "Doctor Schedule",
    icon: Clock,
    category: "Clinical"
  },
  {
    path: "/global-schedule",
    label: "Global Schedule",
    icon: Clock,
    category: "Clinical"
  },
  {
    path: "/time-slot-templates",
    label: "Time Slot Templates",
    icon: Clock,
    category: "Clinical"
  },
  {
    path: "/slot-configurations",
    label: "Slot Configurations",
    icon: Clock,
    category: "Clinical"
  },
  {
    path: "/departments",
    label: "Departments",
    icon: Building2,
    category: "Clinical"
  },
  {
    path: "/ambulance",
    label: "Ambulances",
    icon: Ambulance,
    category: "Ambulance"
  },
  {
    path: "/ambulance-types",
    label: "Ambulance Types",
    icon: Ambulance,
    category: "Ambulance"
  },
  {
    path: "/ambulance-features",
    label: "Features",
    icon: Settings,
    category: "Ambulance"
  },
  {
    path: "/drivers",
    label: "Drivers",
    icon: Ambulance,
    category: "Ambulance"
  },
  {
    path: "/ambulance-logs",
    label: "Logs",
    icon: Ambulance,
    category: "Ambulance"
  },
  {
    path: "/test-categories",
    label: "Test Categories",
    icon: FolderTree,
    category: "Lab"
  },
  {
    path: "/lab-tests",
    label: "Lab Tests",
    icon: FlaskConical,
    category: "Lab"
  },
  {
    path: "/health-packages",
    label: "Health Packages",
    icon: Gift,
    category: "Lab"
  },
  {
    path: "/home-healthcare-service-categories",
    label: "Service Categories",
    icon: FolderTree,
    category: "Home Healthcare"
  },
  {
    path: "/home-healthcare-services",
    label: "Services",
    icon: Home,
    category: "Home Healthcare"
  },
  {
    path: "/home-healthcare-packages",
    label: "Packages",
    icon: Package,
    category: "Home Healthcare"
  },
  {
    path: "/feedback",
    label: "Feedback",
    icon: MessageSquare,
    category: "Content"
  },
  {
    path: "/feedback-questions",
    label: "Feedback Questions",
    icon: FileText,
    category: "Content"
  },
  {
    path: "/grievances",
    label: "Grievances",
    icon: AlertCircle,
    category: "Content"
  },
  { path: "/banners", label: "Banners", icon: Image, category: "Content" },
  { path: "/reports", label: "Reports", icon: BarChart2, category: "Content" },
  {
    path: "/activity-logs",
    label: "Activity Logs",
    icon: Activity,
    category: "Admin"
  },
  {
    path: "/admin-users",
    label: "Admin Users",
    icon: Users,
    category: "Admin"
  },
  { path: "/patients", label: "Patients", icon: HeartPulse, category: "Admin" },
  {
    path: "/patients-booking",
    label: "Patients Booking",
    icon: Calendar,
    category: "Admin"
  },
  {
    path: "/role-management",
    label: "Role Management",
    icon: Shield,
    category: "Admin"
  },
  {
    path: "/add-privacy-policy",
    label: "Privacy Policy",
    icon: FileText,
    category: "Admin"
  },
  {
    path: "/add-terms-of-use",
    label: "Terms of Use",
    icon: Scale,
    category: "Admin"
  },
  {
    path: "/add-refund-policy",
    label: "Refund Policy",
    icon: RotateCcw,
    category: "Admin"
  }
];

// Sidebar Navigation Content
const SidebarNav = ({
  onNavClick,
  canAccess,
  isSuperAdmin,
  permissions,
  user
}) => {
  // Get accessible items
  const getAccessibleItems = () => {
    let items = DEFAULT_NAV_ITEMS;

    if (!isSuperAdmin) {
      // Filter based on permissions
      const isAdmin = user?.role === "ADMIN";
      items = DEFAULT_NAV_ITEMS.filter((item) => {
        // Home Healthcare Specialists can only see their dashboard
        if (user?.role === "HOME_HEALTHCARE_SPECIALIST") {
          return (
            item.path === "/homecare-specialist-dashboard" || item.path === "/"
          );
        }
        // Allow ADMIN-only routes for ADMIN users (before permission check)
        if (
          (item.path === "/add-privacy-policy" ||
            item.path === "/add-terms-of-use" ||
            item.path === "/add-refund-policy" ||
            item.path === "/patients-booking") &&
          isAdmin
        ) {
          return true;
        }
        // Role-specific items - show only for specific role
        if (item.role && item.role !== user?.role) {
          return false;
        }
        // Check if user has permission for this path
        return canAccess(item.path);
      });
    }

    // Filter Privacy Policy, Terms of Use, Refund Policy, and Patients Booking - only for ADMIN and SUPER_ADMIN
    const isAdmin = user?.role === "ADMIN";
    items = items.filter((item) => {
      if (
        item.path === "/add-privacy-policy" ||
        item.path === "/add-terms-of-use" ||
        item.path === "/add-refund-policy" ||
        item.path === "/patients-booking"
      ) {
        return isSuperAdmin || isAdmin;
      }
      // Role-specific items
      if (item.role && item.role !== user?.role) {
        return false;
      }
      return true;
    });

    return items;
  };

  const accessibleItems = getAccessibleItems();

  // Group by category
  const groupedItems = accessibleItems.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const categoryOrder = [
    "Main",
    "Clinical",
    "Ambulance",
    "Lab",
    "Home Healthcare",
    "Content",
    "Admin"
  ];

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {categoryOrder.map((category) => {
        const items = groupedItems[category];
        if (!items || items.length === 0) return null;

        return (
          <React.Fragment key={category}>
            {category !== "Main" && (
              <div className="mt-4 mb-2 px-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {category}
                </span>
              </div>
            )}
            {items.map((item) => {
              const Icon = item.icon || LayoutDashboard;
              return (
                <NavItem
                  key={item.path}
                  to={item.path}
                  icon={Icon}
                  label={item.label}
                  onClick={onNavClick}
                />
              );
            })}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default function AppLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const {
    user,
    logout: authLogout,
    canAccess,
    isSuperAdmin,
    permissions,
    loading
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Check access for current route
  useEffect(() => {
    if (!loading && !isSuperAdmin && permissions.length > 0) {
      const currentPath = location.pathname;

      // Home Healthcare Specialists can only access their dashboard
      if (user?.role === "HOME_HEALTHCARE_SPECIALIST") {
        if (
          currentPath !== "/homecare-specialist-dashboard" &&
          currentPath !== "/"
        ) {
          nav("/homecare-specialist-dashboard");
          return;
        }
        return;
      }

      // Allow access to doctor-specific routes
      if (
        currentPath.startsWith("/doctor/") ||
        currentPath === "/doctor-dashboard"
      ) {
        return;
      }
      // Allow ADMIN-only routes for ADMIN users
      const isAdmin = user?.role === "ADMIN";
      if (
        isAdmin &&
        (currentPath === "/patients-booking" ||
          currentPath === "/add-privacy-policy" ||
          currentPath === "/add-terms-of-use" ||
          currentPath === "/add-refund-policy")
      ) {
        return; // Allow access
      }
      // Check if user can access this path
      if (!canAccess(currentPath) && currentPath !== "/") {
        // Redirect to dashboard or first accessible page
        nav("/");
      }
    }
  }, [
    location.pathname,
    permissions,
    isSuperAdmin,
    canAccess,
    nav,
    loading,
    user
  ]);

  const handleLogout = () => {
    authLogout();
    nav("/login");
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Role badge color
  const getRoleBadgeColor = (role) => {
    const colors = {
      ADMIN: "bg-purple-100 text-purple-700",
      DOCTOR: "bg-blue-100 text-blue-700",
      RECEPTIONIST: "bg-yellow-100 text-yellow-700",
      DEPARTMENT_HEAD: "bg-orange-100 text-orange-700",
      NURSE: "bg-pink-100 text-pink-700",
      HOME_HEALTHCARE_SPECIALIST: "bg-green-100 text-green-700"
    };
    return colors[role] || "bg-slate-100 text-slate-700";
  };

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

        {/* User Info */}
        {user && (
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                {isSuperAdmin ? (
                  <Crown className="text-amber-500" size={20} />
                ) : (
                  <User className="text-blue-600" size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user.name}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(
                      user.role
                    )}`}>
                    {user.role?.replace(/_/g, " ")}
                  </span>
                  {isSuperAdmin && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Super Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <SidebarNav
          onNavClick={closeMobileMenu}
          canAccess={canAccess}
          isSuperAdmin={isSuperAdmin}
          permissions={permissions}
          user={user}
        />
        {/* Mobile Logout */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
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

        {/* User Info */}
        {user && (
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                {isSuperAdmin ? (
                  <Crown className="text-amber-500" size={20} />
                ) : (
                  <User className="text-blue-600" size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user.name}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(
                      user.role
                    )}`}>
                    {user.role?.replace(/_/g, " ")}
                  </span>
                  {isSuperAdmin && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Super Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <SidebarNav
          canAccess={canAccess}
          isSuperAdmin={isSuperAdmin}
          permissions={permissions}
          user={user}
        />
        {/* Logout Button */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="lg:ml-[260px] pt-16 lg:pt-0 min-h-screen">
        {/* TOP HEADER BAR (Desktop) - Fixed */}
        <div className="hidden lg:flex fixed top-0 left-[260px] right-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4 items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-full shadow-sm text-sm">
                <User size={16} className="text-slate-400" />
                <span className="text-slate-600">{user.name}</span>
                {isSuperAdmin && <Crown size={14} className="text-amber-500" />}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-24">
          {/* PAGE CONTENT */}
          <div className="space-y-6 lg:space-y-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
