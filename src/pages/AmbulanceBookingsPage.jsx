import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import AmbulanceBookingModal from "../components/ambulance/AmbulanceBookingModal";
import AmbulanceDispatchPanel from "../components/ambulance/AmbulanceDispatchPanel";

export default function AmbulanceBookingsPage() {
  const [showBooking, setShowBooking] = useState(false);
  const [dispatchBooking, setDispatchBooking] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    emergency: "",
    page: 1,
    pageSize: 10
  });

  const { data } = useQuery({
    queryKey: ["ambulance-bookings", filters],
    queryFn: async () =>
      (await api.get("/ambulance-bookings", { params: filters })).data
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  const update = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Ambulance Bookings</h1>
        <button
          className="btn bg-blue-600 text-white"
          onClick={() => setShowBooking(true)}>
          + Book Ambulance
        </button>
      </div>

      <div className="card p-4 flex gap-4">
        <div>
          <label className="text-sm">Status</label>
          <select
            className="select"
            name="status"
            value={filters.status}
            onChange={update}>
            <option value="">All</option>
            <option value="REQUESTED">Requested</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Emergency</label>
          <select
            className="select"
            name="emergency"
            value={filters.emergency}
            onChange={update}>
            <option value="">All</option>
            <option value="true">Emergency</option>
            <option value="false">Non-Emergency</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-3">ID</th>
              <th className="p-3">Ambulance</th>
              <th className="p-3">Pickup</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Patient</th>
              <th className="p-3">Emergency</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">{b.id}</td>
                <td className="p-3">{b.ambulance?.vehicleNumber}</td>
                <td className="p-3">{b.pickupAddress}</td>
                <td className="p-3">{b.destination}</td>
                <td className="p-3">
                  {b.patientName}
                  <div className="text-xs text-slate-500">
                    {b.contactNumber}
                  </div>
                </td>

                <td className="p-3">
                  <span
                    className={`badge ${
                      b.emergency
                        ? "bg-red-200 text-red-800"
                        : "bg-slate-200 text-slate-700"
                    }`}>
                    {b.emergency ? "Yes" : "No"}
                  </span>
                </td>

                <td className="p-3">
                  <span className="badge bg-blue-100 text-blue-700">
                    {b.status}
                  </span>
                </td>

                <td className="p-3">
                  <button className="btn" onClick={() => setDispatchBooking(b)}>
                    Dispatch / Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BOOKING MODAL */}
      {showBooking && (
        <AmbulanceBookingModal onClose={() => setShowBooking(false)} />
      )}

      {/* DISPATCH PANEL */}
      {dispatchBooking && (
        <AmbulanceDispatchPanel
          booking={dispatchBooking}
          onClose={() => setDispatchBooking(null)}
        />
      )}
    </div>
  );
}
