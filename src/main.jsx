import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfirmProvider } from "./contexts/ConfirmContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./styles.css";
import LoginPage from "./pages/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DoctorsPage from "./pages/DoctorsPage.jsx";
import DepartmentsPage from "./pages/DepartmentsPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import AmbulancePage from "./pages/AmbulancePage.jsx";
import FeedbackPage from "./pages/FeedbackPage.jsx";
import BannersPage from "./pages/BannersPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import DoctorDetail from "./pages/DoctorDetail.jsx";
import DepartmentDetail from "./pages/DepartmentDetail.jsx";
import DoctorCalendarPage from "./pages/DoctorCalendarPage.jsx";
import OrderLayout from "./layouts/OrderLayout.jsx";
import AppointmentOrders from "./pages/AppointmentOrders.jsx";
import AmbulanceOrders from "./pages/AmbulanceOrders.jsx";
import PackageOrders from "./pages/PackageOrders.jsx";
import LabOrders from "./pages/LabOrders.jsx";
import HomeHealthcareOrders from "./pages/HomeHealthcareOrders.jsx";
import DoctorQueue from "./pages/DoctorQueue.jsx";
import DoctorQueueMonitor from "./pages/DoctorQueueMonitor.jsx";
import DoctorActionPanel from "./pages/DoctorActionPanel.jsx";
import TokenWidgetPage from "./pages/TokenWidgetPage.jsx";
// Lab Tests & Packages Management
import LabTestsPage from "./pages/LabTestsPage.jsx";
import TestCategoriesPage from "./pages/TestCategoriesPage.jsx";
import HealthPackagesPage from "./pages/HealthPackagesPage.jsx";
// Home Healthcare Management
import HomeHealthcareServicesPage from "./pages/HomeHealthcareServicesPage.jsx";
import HomeHealthcarePackagesPage from "./pages/HomeHealthcarePackagesPage.jsx";
// Ambulance Management
import AmbulanceTypesPage from "./pages/AmbulanceTypesPage.jsx";
import AmbulanceChargesPage from "./pages/AmbulanceChargesPage.jsx";
import AmbulanceFeaturesPage from "./pages/AmbulanceFeaturesPage.jsx";
import DriversPage from "./pages/DriversPage.jsx";
import AmbulanceLogsPage from "./pages/AmbulanceLogsPage.jsx";
// Grievances Management
import GrievancesPage from "./pages/GrievancesPage.jsx";
// Admin Activity Logs
import AdminActivityLogsPage from "./pages/AdminActivityLogsPage.jsx";
// Admin Users Management
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
// Patients Management
import PatientsPage from "./pages/PatientsPage.jsx";
// Role Management
import RoleManagementPage from "./pages/RoleManagementPage.jsx";
// Doctor Dashboard
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
// Global Schedule Management
import GlobalSchedulePage from "./pages/GlobalSchedulePage.jsx";
// Doctor Schedule Management
import DoctorSchedulePage from "./pages/DoctorSchedulePage.jsx";
// Time Slot Templates Management
import TimeSlotTemplatesPage from "./pages/TimeSlotTemplatesPage.jsx";
// Privacy Policy Management
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import PublicPrivacyPolicyPage from "./pages/PublicPrivacyPolicyPage.jsx";
// Terms of Use Management
import TermsOfUsePage from "./pages/TermsOfUsePage.jsx";
import PublicTermsOfUsePage from "./pages/PublicTermsOfUsePage.jsx";
// Refund Policy Management
import RefundPolicyPage from "./pages/RefundPolicyPage.jsx";
import PublicRefundPolicyPage from "./pages/PublicRefundPolicyPage.jsx";

const qc = new QueryClient();

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/privacy-policy"
                element={<PublicPrivacyPolicyPage />}
              />
              <Route path="/terms-of-use" element={<PublicTermsOfUsePage />} />
              <Route
                path="/refund-policy"
                element={<PublicRefundPolicyPage />}
              />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <AppLayout />
                  </PrivateRoute>
                }>
                <Route index element={<Dashboard />} />
                <Route path="doctor-dashboard" element={<DoctorDashboard />} />
                {/* <Route path="orders" element={<OrdersPage />} /> */}
                <Route path="orders" element={<OrderLayout />}>
                  <Route
                    index
                    element={<Navigate to="appointments" replace />}
                  />
                  <Route path="appointments" element={<AppointmentOrders />} />
                  <Route path="ambulance" element={<AmbulanceOrders />} />
                  <Route path="packages" element={<PackageOrders />} />
                  <Route path="lab" element={<LabOrders />} />
                  <Route path="homecare" element={<HomeHealthcareOrders />} />
                </Route>
                <Route path="doctor-queue" element={<DoctorQueue />} />
                <Route
                  path="doctor/queue-monitor/:doctorId"
                  element={<DoctorQueueMonitor />}
                />
                <Route
                  path="doctor/actions/:doctorId"
                  element={<DoctorActionPanel />}
                />
                <Route
                  path="widgets/token/:doctorId"
                  element={<TokenWidgetPage />}
                />
                <Route path="doctors" element={<DoctorsPage />} />
                <Route path="doctors/:id" element={<DoctorDetail />} />
                <Route path="departments" element={<DepartmentsPage />} />
                <Route path="departments/:id" element={<DepartmentDetail />} />
                <Route path="ambulance" element={<AmbulancePage />} />
                {/* Ambulance Management */}
                <Route
                  path="ambulance-types"
                  element={<AmbulanceTypesPage />}
                />
                <Route
                  path="ambulance-features"
                  element={<AmbulanceFeaturesPage />}
                />
                <Route path="drivers" element={<DriversPage />} />
                <Route path="ambulance-logs" element={<AmbulanceLogsPage />} />
                {/* Lab Tests & Packages Management */}
                <Route path="lab-tests" element={<LabTestsPage />} />
                <Route
                  path="test-categories"
                  element={<TestCategoriesPage />}
                />
                <Route
                  path="health-packages"
                  element={<HealthPackagesPage />}
                />
                {/* Home Healthcare Management */}
                <Route
                  path="home-healthcare-services"
                  element={<HomeHealthcareServicesPage />}
                />
                <Route
                  path="home-healthcare-packages"
                  element={<HomeHealthcarePackagesPage />}
                />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="grievances" element={<GrievancesPage />} />
                <Route path="banners" element={<BannersPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route
                  path="doctor-calendar"
                  element={<DoctorCalendarPage />}
                />
                <Route
                  path="doctor-schedule"
                  element={<DoctorSchedulePage />}
                />
                <Route
                  path="global-schedule"
                  element={<GlobalSchedulePage />}
                />
                <Route
                  path="time-slot-templates"
                  element={<TimeSlotTemplatesPage />}
                />
                <Route
                  path="activity-logs"
                  element={<AdminActivityLogsPage />}
                />
                <Route path="admin-users" element={<AdminUsersPage />} />
                <Route path="patients" element={<PatientsPage />} />
                <Route
                  path="role-management"
                  element={<RoleManagementPage />}
                />
                <Route
                  path="add-privacy-policy"
                  element={<PrivacyPolicyPage />}
                />
                <Route path="add-terms-of-use" element={<TermsOfUsePage />} />
                <Route
                  path="add-refund-policy"
                  element={<RefundPolicyPage />}
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
