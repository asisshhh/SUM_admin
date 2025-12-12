import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client";
import { Search, X, Check, Home } from "lucide-react";

// Internal debounce hook
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function ServiceSelector({ selectedIds, onChange, existingServices }) {
  const [searchInput, setSearchInput] = useState("");
  const [showSelected, setShowSelected] = useState(true);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Fetch services
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ["home-healthcare-services-selector", debouncedSearch],
    queryFn: async () => {
      const params = { pageSize: 100, active: "true" };
      if (debouncedSearch) params.search = debouncedSearch;
      return (await api.get("/home-healthcare-services", { params })).data;
    },
    staleTime: 30000
  });

  const availableServices = servicesData?.items || [];

  // Build service map
  const serviceMap = useMemo(() => {
    const map = new Map();
    availableServices.forEach((s) => map.set(s.id, s));
    existingServices?.forEach((s) => {
      const id = s.serviceId || s.id;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: s.service?.name || s.name || `Service #${id}`,
          price: s.service?.price || s.price || 0,
          duration: s.service?.duration || s.duration || 0
        });
      }
    });
    return map;
  }, [availableServices, existingServices]);

  // Get selected service details
  const selectedServices = useMemo(
    () => selectedIds.map((id) => serviceMap.get(id)).filter(Boolean),
    [selectedIds, serviceMap]
  );

  const toggleService = useCallback(
    (serviceId) => {
      if (selectedIds.includes(serviceId)) {
        onChange(selectedIds.filter((id) => id !== serviceId));
      } else {
        onChange([...selectedIds, serviceId]);
      }
    },
    [selectedIds, onChange]
  );

  const removeService = useCallback(
    (serviceId) => {
      onChange(selectedIds.filter((id) => id !== serviceId));
    },
    [selectedIds, onChange]
  );

  return (
    <div className="space-y-3">
      {/* Selected Services Display */}
      {selectedIds.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSelected(!showSelected)}
            className="w-full flex items-center justify-between p-3 bg-purple-50 border-b text-left">
            <span className="text-sm font-medium text-purple-800">
              ✓ {selectedIds.length} Service(s) Included
            </span>
            <span className="text-xs text-purple-600">
              {showSelected ? "Hide" : "Show"}
            </span>
          </button>
          {showSelected && (
            <div className="max-h-40 overflow-y-auto divide-y">
              {selectedServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between px-4 py-2 bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {service.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {service.duration} min
                      {service.price ? ` • ₹${service.price}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeService(service.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search services..."
          className="input pl-10 w-full"
        />
      </div>

      {/* Services List */}
      <div className="border rounded-xl max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : availableServices.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            No services found
          </div>
        ) : (
          <div className="divide-y">
            {availableServices.map((service) => {
              const isSelected = selectedIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`w-full flex items-center justify-between p-3 text-left transition ${
                    isSelected
                      ? "bg-purple-50 border-l-4 border-purple-500"
                      : "hover:bg-slate-50"
                  }`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-800">
                      {service.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {service.duration} minutes • ₹
                      {service.price?.toLocaleString()}
                    </div>
                    {service.category && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {service.category.name}
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    {isSelected ? (
                      <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 border-2 border-slate-300 rounded-full" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ServiceSelector;
