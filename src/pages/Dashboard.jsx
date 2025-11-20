import React, { useEffect, useState } from "react";
import api from "../api/client";
import {
  CalendarCheck,
  User,
  Users,
  Ambulance,
  Box,
  Stethoscope
} from "lucide-react";
import StatCard from "../components/analytics/StatCard";
import ChartCard from "../components/analytics/ChartCard";

const Dashboard = () => {
  const [summary, setSummary] = useState({});
  const [appointmentGraph, setAppointmentGraph] = useState([]);

  useEffect(() => {
    loadSummary();
    loadGraph();
  }, []);

  const loadSummary = async () => {
    const res = await api.get("/analytics/summary");
    setSummary(res.data);
  };

  const loadGraph = async () => {
    const res = await api.get("/analytics/appointments-graph");
    setAppointmentGraph(
      res.data.map((d) => ({
        day: new Date(d.day).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short"
        }),
        count: Number(d.count)
      }))
    );
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Top Title */}
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Today's Appointments"
          value={summary.appointmentsToday}
          icon={<CalendarCheck />}
        />
        <StatCard
          title="Total Appointments"
          value={summary.totalAppointments}
          icon={<CalendarCheck />}
        />
        <StatCard
          title="Doctors"
          value={summary.totalDoctors}
          icon={<Stethoscope />}
        />
        <StatCard
          title="Patients"
          value={summary.totalPatients}
          icon={<Users />}
        />
        <StatCard
          title="Ambulance Requests"
          value={summary.pendingAmbulances}
          icon={<Ambulance />}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${summary.totalRevenue || 0}`}
          icon={<Box />}
        />
      </div>

      {/* Revenue Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Total Revenue"
          value={`₹${summary.totalRevenue || 0}`}
          icon={<Box />}
        />
        <StatCard
          title="Health Package Orders"
          value={summary.totalPackageOrders || 0}
          icon={<Box />}
        />
      </div>

      {/* Chart: Appointments */}
      <ChartCard title="Daily Appointments Trend" data={appointmentGraph} />
    </div>
  );
};

export default Dashboard;
