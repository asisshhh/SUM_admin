import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { toast } from "react-toastify";
import {
  X,
  Ambulance,
  User,
  Search,
  CheckCircle,
  RefreshCw
} from "lucide-react";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AssignAmbulanceModal({ booking, onClose, onSuccess }) {
  const qc = useQueryClient();
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState(
    booking?.ambulanceId?.toString() || ""
  );

  // Update selected ambulance when booking changes
  useEffect(() => {
    if (booking?.ambulanceId) {
      setSelectedAmbulanceId(booking.ambulanceId.toString());
    }
  }, [booking?.ambulanceId]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  // Fetch available ambulances matching the booking's ambulance type
  const { data: ambulancesData, isLoading } = useQuery({
    queryKey: [
      "available-ambulances",
      booking?.ambulanceTypeId,
      debouncedSearch
    ],
    queryFn: async () => {
      const params = {
        pageSize: 100,
        available: "true",
        active: "true",
        ...(booking?.ambulanceTypeId && {
          ambulanceTypeId: booking.ambulanceTypeId
        }),
        ...(debouncedSearch && { search: debouncedSearch })
      };
      return (await api.get("/ambulance", { params })).data;
    },
    enabled: !!booking?.ambulanceTypeId,
    staleTime: 2 * 60 * 1000
  });

  const ambulances = useMemo(
    () => ambulancesData?.items || [],
    [ambulancesData]
  );

  // Assign ambulance mutation
  const assignMutation = useMutation({
    mutationFn: async (ambulanceId) => {
      return await api.post(
        `/ambulance-orders/${booking.id}/assign-ambulance`,
        {
          ambulanceId: Number(ambulanceId)
        }
      );
    },
    onSuccess: () => {
      toast.success("Ambulance assigned successfully");
      qc.invalidateQueries(["ambulance-orders"]);
      qc.invalidateQueries(["ambulance-order", booking.id]);
      qc.invalidateQueries(["ambulances"]);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to assign ambulance");
    }
  });

  const handleAssign = () => {
    if (!selectedAmbulanceId) {
      toast.error("Please select an ambulance");
      return;
    }
    assignMutation.mutate(selectedAmbulanceId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Ambulance className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                Assign Ambulance
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Booking #{booking.id} - {booking.ambulanceType?.name || "N/A"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Current Assignment */}
          {booking.ambulanceId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-yellow-800 mb-1">
                    Currently Assigned:
                  </div>
                  <div className="text-sm text-yellow-700">
                    {booking.ambulance?.vehicleNumber ||
                      `Ambulance #${booking.ambulanceId}`}
                    {booking.ambulance?.driver && (
                      <span className="ml-2">
                        - Driver: {booking.ambulance.driver.name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAmbulanceId("")}
                  className="flex items-center gap-1 text-xs text-yellow-700 hover:text-yellow-800 font-medium">
                  <RefreshCw size={14} />
                  Change
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by vehicle number, model..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Ambulance List */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Select Available Ambulance
            </label>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">
                Loading ambulances...
              </div>
            ) : ambulances.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {debouncedSearch
                  ? "No ambulances found matching your search"
                  : "No available ambulances found for this ambulance type"}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {ambulances.map((ambulance) => {
                  const isSelected =
                    selectedAmbulanceId === ambulance.id.toString();
                  return (
                    <label
                      key={ambulance.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}>
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="radio"
                          name="ambulance"
                          value={ambulance.id}
                          checked={isSelected}
                          onChange={(e) =>
                            setSelectedAmbulanceId(e.target.value)
                          }
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Ambulance className="text-blue-600" size={18} />
                            <div className="font-semibold text-slate-800">
                              {ambulance.vehicleNumber}
                            </div>
                            {ambulance.ambulanceType && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                {ambulance.ambulanceType.code}
                              </span>
                            )}
                          </div>
                          {ambulance.driver && (
                            <div className="flex items-center gap-1 mt-1 text-sm text-slate-600">
                              <User size={14} />
                              <span>{ambulance.driver.name}</span>
                              {ambulance.driver.phone && (
                                <span className="text-slate-400">
                                  - {ambulance.driver.phone}
                                </span>
                              )}
                            </div>
                          )}
                          {ambulance.model && (
                            <div className="text-xs text-slate-500 mt-1">
                              Model: {ambulance.model}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-1">
                        {ambulance.id.toString() ===
                          booking?.ambulanceId?.toString() && (
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                            Currently Assigned
                          </span>
                        )}
                        {ambulance.available ? (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                            Available
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedAmbulanceId || assignMutation.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {assignMutation.isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                {selectedAmbulanceId === booking?.ambulanceId?.toString()
                  ? "Keep Assignment"
                  : booking?.ambulanceId
                  ? "Reassign Ambulance"
                  : "Assign Ambulance"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
