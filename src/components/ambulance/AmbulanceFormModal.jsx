import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { SearchableDropdown } from "../shared";

export default function AmbulanceFormModal({
  data,
  onClose,
  ambulanceTypes = [],
  onSuccess
}) {
  const qc = useQueryClient();
  const isEdit = !!data?.id;

  // Fetch ambulance types if not provided
  const { data: typesData } = useQuery({
    queryKey: ["ambulance-types-all"],
    queryFn: async () =>
      (await api.get("/ambulance-types", { params: { pageSize: 100 } })).data,
    enabled: ambulanceTypes.length === 0,
    staleTime: 5 * 60 * 1000
  });

  const allTypes = useMemo(() => {
    return ambulanceTypes.length > 0 ? ambulanceTypes : typesData?.items || [];
  }, [ambulanceTypes, typesData]);

  // Fetch drivers for assignment
  const { data: driversData } = useQuery({
    queryKey: ["drivers-all"],
    queryFn: async () =>
      (await api.get("/drivers", { params: { pageSize: 100, active: "true" } }))
        .data,
    staleTime: 2 * 60 * 1000
  });

  const drivers = useMemo(() => driversData?.items || [], [driversData]);

  const [form, setForm] = useState({
    vehicleNumber: data?.vehicleNumber || "",
    model: data?.model || "",
    ambulanceTypeId: data?.ambulanceTypeId?.toString() || "",
    insuranceExpiry: data?.insuranceExpiry
      ? new Date(data.insuranceExpiry).toISOString().split("T")[0]
      : "",
    lastMaintenanceDate: data?.lastMaintenanceDate
      ? new Date(data.lastMaintenanceDate).toISOString().split("T")[0]
      : "",
    available: data?.available !== undefined ? data.available : true,
    active: data?.active !== undefined ? data.active : true,
    driverId: data?.driverId?.toString() || ""
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (data) {
      setForm({
        vehicleNumber: data.vehicleNumber || "",
        model: data.model || "",
        ambulanceTypeId: data.ambulanceTypeId?.toString() || "",
        insuranceExpiry: data.insuranceExpiry
          ? new Date(data.insuranceExpiry).toISOString().split("T")[0]
          : "",
        lastMaintenanceDate: data.lastMaintenanceDate
          ? new Date(data.lastMaintenanceDate).toISOString().split("T")[0]
          : "",
        available: data.available !== undefined ? data.available : true,
        active: data.active !== undefined ? data.active : true,
        driverId: data.driverId?.toString() || ""
      });
    }
  }, [data]);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) {
      setErrors((e) => ({ ...e, [k]: null }));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      const payload = {
        vehicleNumber: formData.vehicleNumber.trim(),
        model: formData.model.trim(),
        ambulanceTypeId: Number(formData.ambulanceTypeId),
        insuranceExpiry: formData.insuranceExpiry || null,
        lastMaintenanceDate: formData.lastMaintenanceDate || null,
        available: Boolean(formData.available),
        active: Boolean(formData.active),
        driverId: formData.driverId ? Number(formData.driverId) : null
      };

      if (isEdit) {
        return await api.put(`/ambulance/${data.id}`, payload);
      }
      return await api.post("/ambulance", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulances"] });
      toast.success(
        isEdit
          ? "Ambulance updated successfully"
          : "Ambulance created successfully"
      );
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to save ambulance");
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors = {};

    if (!form.vehicleNumber.trim()) {
      newErrors.vehicleNumber = "Vehicle number is required";
    } else if (form.vehicleNumber.trim().length < 2) {
      newErrors.vehicleNumber = "Vehicle number must be at least 2 characters";
    }

    if (!form.model.trim()) {
      newErrors.model = "Model is required";
    } else if (form.model.trim().length < 2) {
      newErrors.model = "Model must be at least 2 characters";
    }

    if (!form.ambulanceTypeId) {
      newErrors.ambulanceTypeId = "Ambulance type is required";
    }

    if (!form.insuranceExpiry) {
      newErrors.insuranceExpiry = "Insurance expiry date is required";
    } else {
      const insuranceDate = new Date(form.insuranceExpiry);
      if (isNaN(insuranceDate.getTime())) {
        newErrors.insuranceExpiry = "Invalid insurance expiry date";
      }
    }

    if (!form.lastMaintenanceDate) {
      newErrors.lastMaintenanceDate = "Last maintenance date is required";
    } else {
      const maintenanceDate = new Date(form.lastMaintenanceDate);
      if (isNaN(maintenanceDate.getTime())) {
        newErrors.lastMaintenanceDate = "Invalid maintenance date";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    saveMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">
            {isEdit ? "Edit Ambulance" : "Add Ambulance"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Vehicle Number *
              </label>
              <input
                type="text"
                value={form.vehicleNumber}
                onChange={(e) => update("vehicleNumber", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.vehicleNumber ? "border-red-300" : "border-slate-300"
                }`}
                placeholder="e.g., DL-01-AB-1234"
              />
              {errors.vehicleNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.vehicleNumber}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Model *
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.model ? "border-red-300" : "border-slate-300"
                }`}
                placeholder="e.g., Tata Winger"
              />
              {errors.model && (
                <p className="text-red-500 text-sm mt-1">{errors.model}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <SearchableDropdown
                label={
                  <>
                    Ambulance Type <span className="text-red-500">*</span>
                  </>
                }
                value={form.ambulanceTypeId || ""}
                options={[
                  { value: "", label: "Select Type" },
                  ...allTypes.map((type) => ({
                    value: String(type.id),
                    label: `${type.name} (${type.code})`
                  }))
                ]}
                onChange={(value) => update("ambulanceTypeId", value)}
                placeholder="Select Type"
                className={errors.ambulanceTypeId ? "border-red-300" : ""}
              />
              {errors.ambulanceTypeId && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.ambulanceTypeId}
                </p>
              )}
            </div>

            <div>
              <SearchableDropdown
                label="Driver"
                value={form.driverId || ""}
                options={[
                  { value: "", label: "No Driver" },
                  ...drivers.map((driver) => ({
                    value: String(driver.id),
                    label: `${driver.name} - ${driver.phone}`
                  }))
                ]}
                onChange={(value) => update("driverId", value)}
                placeholder="No Driver"
                className=""
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Insurance Expiry *
              </label>
              <input
                type="date"
                value={form.insuranceExpiry}
                onChange={(e) => update("insuranceExpiry", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.insuranceExpiry ? "border-red-300" : "border-slate-300"
                }`}
              />
              {errors.insuranceExpiry && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.insuranceExpiry}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last Maintenance Date *
              </label>
              <input
                type="date"
                value={form.lastMaintenanceDate}
                onChange={(e) => update("lastMaintenanceDate", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.lastMaintenanceDate
                    ? "border-red-300"
                    : "border-slate-300"
                }`}
              />
              {errors.lastMaintenanceDate && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.lastMaintenanceDate}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <SearchableDropdown
                label="Availability"
                value={String(form.available)}
                options={[
                  { value: "true", label: "Available" },
                  { value: "false", label: "Unavailable" }
                ]}
                onChange={(value) => update("available", value === "true")}
                placeholder="Select"
                className=""
              />
            </div>

            <div>
              <SearchableDropdown
                label="Status"
                value={String(form.active)}
                options={[
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" }
                ]}
                onChange={(value) => update("active", value === "true")}
                placeholder="Select"
                className=""
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {saveMutation.isPending
                ? "Saving..."
                : isEdit
                ? "Update"
                : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
