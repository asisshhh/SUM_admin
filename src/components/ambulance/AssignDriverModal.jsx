import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { toast } from "react-toastify";
import { X, UserCircle, Search } from "lucide-react";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AssignDriverModal({ ambulance, onClose, onSuccess }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(ambulance.driverId?.toString() || "");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  // Fetch all drivers
  const { data: driversData, isLoading } = useQuery({
    queryKey: ["drivers-all", debouncedSearch],
    queryFn: async () => {
      const params = {
        pageSize: 100,
        active: "true",
        ...(debouncedSearch && { search: debouncedSearch })
      };
      return (await api.get("/drivers", { params })).data;
    },
    staleTime: 2 * 60 * 1000
  });

  const drivers = useMemo(() => driversData?.items || [], [driversData]);

  const assignMutation = useMutation({
    mutationFn: async (driverId) => {
      return await api.put(`/ambulance/${ambulance.id}`, {
        driverId: driverId ? Number(driverId) : null
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulances"] });
      qc.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Driver assigned successfully");
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to assign driver");
    }
  });

  const handleAssign = () => {
    assignMutation.mutate(selected);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Assign Driver</h2>
            <p className="text-sm text-slate-500 mt-1">
              Ambulance: <span className="font-semibold">{ambulance.vehicleNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search drivers by name, phone, or license..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Driver List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center text-slate-500 py-8">Loading drivers...</div>
          ) : drivers.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No drivers found</div>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="driver"
                  value=""
                  checked={selected === ""}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <UserCircle className="text-slate-400" size={20} />
                <div>
                  <div className="font-medium text-slate-800">No Driver (Unassign)</div>
                  <div className="text-xs text-slate-500">Remove current driver assignment</div>
                </div>
              </label>
              {drivers.map((driver) => (
                <label
                  key={driver.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                    selected === driver.id.toString()
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}>
                  <input
                    type="radio"
                    name="driver"
                    value={driver.id}
                    checked={selected === driver.id.toString()}
                    onChange={(e) => setSelected(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <UserCircle
                    className={driver.available ? "text-green-600" : "text-red-600"}
                    size={20}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{driver.name}</div>
                    <div className="text-sm text-slate-600">{driver.phone}</div>
                    <div className="text-xs text-slate-500">
                      License: {driver.licenseNumber}
                      {driver.experience && ` • ${driver.experience} years exp`}
                      {driver.rating && ` • ⭐ ${driver.rating}`}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        driver.available
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {driver.available ? "Available" : "Unavailable"}
                    </span>
                    {ambulance.driverId === driver.id && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={assignMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            {assignMutation.isPending ? "Assigning..." : "Assign Driver"}
          </button>
        </div>
      </div>
    </div>
  );
}
