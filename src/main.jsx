import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles.css";
import LoginPage from "./pages/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DoctorsPage from "./pages/DoctorsPage.jsx";
import DepartmentsPage from "./pages/DepartmentsPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import AmbulancePage from "./pages/AmbulancePage.jsx";
import PackagesPage from "./pages/PackagesPage.jsx";
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
import HomecareOrders from "./pages/HomecareOrders.jsx";

const qc = new QueryClient();
const token = () => localStorage.getItem("token");

function PrivateRoute({ children }) {
  return token() ? children : <Navigate to="/login" replace />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }>
            <Route index element={<Dashboard />} />
            {/* <Route path="orders" element={<OrdersPage />} /> */}
            <Route path="orders" element={<OrderLayout />}>
              <Route index element={<Navigate to="appointments" replace />} />
              <Route path="appointments" element={<AppointmentOrders />} />
              <Route path="ambulance" element={<AmbulanceOrders />} />
              <Route path="packages" element={<PackageOrders />} />
              <Route path="lab" element={<LabOrders />} />
              <Route path="homecare" element={<HomecareOrders />} />
            </Route>

            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="doctors/:id" element={<DoctorDetail />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="departments/:id" element={<DepartmentDetail />} />
            <Route path="ambulance" element={<AmbulancePage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="banners" element={<BannersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="doctor-calendar" element={<DoctorCalendarPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
