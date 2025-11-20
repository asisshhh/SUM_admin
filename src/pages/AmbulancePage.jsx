import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import AmbulanceFormModal from "../components/ambulance/AmbulanceFormModal";
import AssignFeatureModal from "../components/ambulance/AssignFeatureModal";
import AssignDriverModal from "../components/ambulance/AssignDriverModal";

export default function AmbulancePage() {
  const qc = useQueryClient();

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    type: "",
    active: ""
  });

  const [showForm, setShowForm] = useState(null); // create/edit
  const [selectedAmb, setSelectedAmb] = useState(null); // feature assignment
  const [showFeatures, setShowFeatures] = useState(false);
  const [showDrivers, setShowDrivers] = useState(false);

  /** Fetch ambulances */
  const query = useQuery({
    queryKey: ["ambulances", filters],
    queryFn: async () => (await api.get("/ambulance", { params: filters })).data
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const deleteAmb = useMutation({
    mutationFn: async (id) => (await api.delete(`/ambulance/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambulances"] })
  });

  const onChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ambulance Management</h1>

        <button
          className="btn bg-blue-600 text-white"
          onClick={() => setShowForm({})}>
          + Add Ambulance
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-4 flex-wrap items-end">
        <div>
          <label className="text-sm">Search</label>
          <input
            className="input"
            name="search"
            value={filters.search}
            onChange={onChange}
            placeholder="Vehicle No / Model"
          />
        </div>

        <div>
          <label className="text-sm">Type</label>
          <select
            className="select"
            name="type"
            value={filters.type}
            onChange={onChange}>
            <option value="">All</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="NON_EMERGENCY">Non-Emergency</option>
            <option value="Type 1">Type 1</option>
            <option value="Type 2">Type 2</option>
            <option value="Type 3">Type 3</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Active</label>
          <select
            className="select"
            name="active"
            value={filters.active}
            onChange={onChange}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Vehicle No</th>
              <th className="p-3">Model</th>
              <th className="p-3">Type</th>
              <th className="p-3">Driver</th>
              <th className="p-3">Features</th>
              <th className="p-3">Base Fare</th>
              <th className="p-3">Per KM</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3 font-medium">{a.vehicleNumber}</td>
                <td className="p-3">{a.model || "—"}</td>
                <td className="p-3">{a.type}</td>

                <td className="p-3">
                  {a.driver ? (
                    <div>
                      {a.driver.name}
                      <div className="text-xs text-slate-500">
                        {a.driver.phone}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400">No Driver</span>
                  )}

                  <button
                    className="text-blue-600 text-xs underline"
                    onClick={() => {
                      setSelectedAmb(a);
                      setShowDrivers(true);
                    }}>
                    Assign / Change
                  </button>
                </td>

                <td className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    {a.features.map((f) => (
                      <span
                        key={f.feature.id}
                        className="badge bg-slate-200 text-slate-700">
                        {f.feature.name}
                      </span>
                    ))}
                  </div>

                  <button
                    className="text-blue-600 text-xs underline"
                    onClick={() => {
                      setSelectedAmb(a);
                      setShowFeatures(true);
                    }}>
                    Manage
                  </button>
                </td>

                <td className="p-3">₹{a.baseFare ?? "—"}</td>
                <td className="p-3">₹{a.perKmFare ?? "—"}/km</td>

                <td className="p-3">
                  <span
                    className={`badge ${
                      a.available
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {a.available ? "Available" : "Busy"}
                  </span>
                </td>

                <td className="p-3 flex gap-2">
                  <button className="btn" onClick={() => setShowForm(a)}>
                    Edit
                  </button>
                  <button
                    className="btn bg-red-600 text-white"
                    onClick={() => deleteAmb.mutate(a.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-end gap-4 items-center mt-4">
        <button
          className="btn"
          disabled={filters.page <= 1}
          onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
          Prev
        </button>

        <span>
          Page {filters.page} / {Math.ceil(total / filters.pageSize) || 1}
        </span>

        <button
          className="btn"
          disabled={filters.page >= Math.ceil(total / filters.pageSize)}
          onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
          Next
        </button>
      </div>

      {/* Modals */}
      {showForm && (
        <AmbulanceFormModal data={showForm} onClose={() => setShowForm(null)} />
      )}

      {showFeatures && selectedAmb && (
        <AssignFeatureModal
          ambulance={selectedAmb}
          onClose={() => setShowFeatures(false)}
        />
      )}

      {showDrivers && selectedAmb && (
        <AssignDriverModal
          ambulance={selectedAmb}
          onClose={() => setShowDrivers(false)}
        />
      )}
    </div>
  );
}
