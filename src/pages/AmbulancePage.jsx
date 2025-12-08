import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { Ambulance, Search, Plus, Edit, Trash2, UserPlus, Settings } from "lucide-react";
import { toast } from "react-toastify";
import { Pagination } from "../components/shared";
import AmbulanceFormModal from "../components/ambulance/AmbulanceFormModal";
import AssignFeatureModal from "../components/ambulance/AssignFeatureModal";
import AssignDriverModal from "../components/ambulance/AssignDriverModal";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AmbulancePage() {
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    search: "",
    ambulanceTypeId: "",
    type: "",
    active: "all",
    available: "all"
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const [showForm, setShowForm] = useState(null);
  const [selectedAmb, setSelectedAmb] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showDrivers, setShowDrivers] = useState(false);

  // Fetch ambulance types for filter
  const { data: typesData } = useQuery({
    queryKey: ["ambulance-types-all"],
    queryFn: async () => (await api.get("/ambulance-types", { params: { pageSize: 100 } })).data,
    staleTime: 5 * 60 * 1000
  });

  const ambulanceTypes = useMemo(() => typesData?.items || [], [typesData]);

  // Fetch ambulances
  const { data, isLoading } = useQuery({
    queryKey: ["ambulances", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "" && v !== "all")
      );
      return (await api.get("/ambulance", { params })).data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/ambulance/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulances"] });
      toast.success("Ambulance deleted successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to delete ambulance");
    }
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  // Handlers
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setFilters((f) => ({ ...f, page }));
  }, []);

  const handleDelete = useCallback(async (ambulance) => {
    const ok = await confirm({
      title: "Delete Ambulance",
      message: `Are you sure you want to delete ambulance "${ambulance.vehicleNumber}"? This action cannot be undone.`,
      danger: true
    });
    if (ok) deleteMutation.mutate(ambulance.id);
  }, [confirm, deleteMutation]);

  const handleEdit = useCallback((ambulance) => {
    setShowForm(ambulance);
  }, []);

  const handleAdd = useCallback(() => {
    setShowForm({});
  }, []);

  const handleAssignDriver = useCallback((ambulance) => {
    setSelectedAmb(ambulance);
    setShowDrivers(true);
  }, []);

  const handleManageFeatures = useCallback((ambulance) => {
    setSelectedAmb(ambulance);
    setShowFeatures(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowForm(null);
    setSelectedAmb(null);
    setShowFeatures(false);
    setShowDrivers(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Ambulance className="text-blue-600" size={32} />
            Ambulances
          </h1>
          <p className="text-slate-500 mt-1">Manage ambulance fleet and assignments</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus size={18} />
          Add Ambulance
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by vehicle number or model..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            name="ambulanceTypeId"
            value={filters.ambulanceTypeId}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Types</option>
            {ambulanceTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Types (Legacy)</option>
            <option value="BLS">BLS</option>
            <option value="ALS">ALS</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select
              name="available"
              value={filters.available}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Availability</option>
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
            <select
              name="active"
              value={filters.active}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No ambulances found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Vehicle Number</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Model</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Features</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{item.vehicleNumber}</div>
                        {item.registrationNumber && (
                          <div className="text-xs text-slate-500">Reg: {item.registrationNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {item.ambulanceType ? (
                            <>
                              <span className="font-medium text-slate-800">{item.ambulanceType.name}</span>
                              <span className="text-xs text-slate-500">({item.ambulanceType.code})</span>
                            </>
                          ) : (
                            <span className="text-slate-600">{item.type || "-"}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600">{item.model || "-"}</div>
                      </td>
                      <td className="px-6 py-4">
                        {item.driver ? (
                          <div>
                            <div className="font-medium text-slate-800">{item.driver.name}</div>
                            <div className="text-xs text-slate-500">{item.driver.phone}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">No Driver</span>
                        )}
                        <button
                          onClick={() => handleAssignDriver(item)}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                          <UserPlus size={12} />
                          {item.driver ? "Change" : "Assign"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {item.features?.slice(0, 2).map((f) => (
                            <span
                              key={f.feature.id}
                              className="inline-flex px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-full">
                              {f.feature.name}
                            </span>
                          ))}
                          {item.features?.length > 2 && (
                            <span className="text-xs text-slate-500">+{item.features.length - 2} more</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleManageFeatures(item)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                          <Settings size={12} />
                          Manage
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.available
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                            {item.available ? "Available" : "Unavailable"}
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.active
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                            {item.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > filters.pageSize && (
              <div className="border-t border-slate-200 p-4">
                <Pagination
                  currentPage={filters.page}
                  totalPages={Math.ceil(total / filters.pageSize)}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <AmbulanceFormModal
          data={showForm}
          ambulanceTypes={ambulanceTypes}
          onClose={handleCloseModal}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["ambulances"] });
            handleCloseModal();
          }}
        />
      )}

      {showFeatures && selectedAmb && (
        <AssignFeatureModal
          ambulance={selectedAmb}
          onClose={handleCloseModal}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["ambulances"] });
            handleCloseModal();
          }}
        />
      )}

      {showDrivers && selectedAmb && (
        <AssignDriverModal
          ambulance={selectedAmb}
          onClose={handleCloseModal}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["ambulances"] });
            handleCloseModal();
          }}
        />
      )}
    </div>
  );
}
