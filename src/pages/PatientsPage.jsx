import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { usePagePermissions } from "../hooks/usePagePermissions";
import {
  HeartPulse,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  User,
  Heart,
  Phone,
  Mail,
  Calendar,
  X,
  UserPlus,
  MapPin,
  UserX,
  CheckCircle2,
  IndianRupee,
  Hash,
  XCircle
} from "lucide-react";
import { Pagination, SearchableDropdown } from "../components/shared";
import { toast } from "react-toastify";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Relation badge
const RelationBadge = ({ relation, isPrimary }) => {
  if (isPrimary) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Self
      </span>
    );
  }

  const relationStyles = {
    Spouse: "bg-pink-100 text-pink-700",
    Child: "bg-blue-100 text-blue-700",
    Parent: "bg-purple-100 text-purple-700",
    Father: "bg-purple-100 text-purple-700",
    Mother: "bg-purple-100 text-purple-700",
    Sibling: "bg-orange-100 text-orange-700",
    Other: "bg-gray-100 text-gray-700"
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        relationStyles[relation] || relationStyles.Other
      }`}>
      {relation || "Other"}
    </span>
  );
};

// Patient Modal (Create/Edit)
const PatientModal = ({ patient, onClose, onSuccess }) => {
  const isEdit = !!patient;

  // Get primary profile for editing
  const primaryProfile = patient?.patientProfiles?.find((p) => p.isPrimary);

  const [formData, setFormData] = useState({
    name: patient?.name || "",
    phone: patient?.phone || "",
    email: patient?.email || "",
    // Profile fields
    gender: primaryProfile?.gender || "",
    dob: primaryProfile?.dob ? primaryProfile.dob.split("T")[0] : "",
    bloodGroup: primaryProfile?.bloodGroup || "",
    addressLine1: primaryProfile?.addressLine1 || "",
    city: primaryProfile?.city || "",
    state: primaryProfile?.state || "",
    pin: primaryProfile?.pin || "",
    uhid: primaryProfile?.uhid || "",
    registrationFeeCollected: primaryProfile?.registrationFeeCollected || false,
    registrationFeeCollectedAt: primaryProfile?.registrationFeeCollectedAt
      ? new Date(primaryProfile.registrationFeeCollectedAt)
          .toISOString()
          .slice(0, 16)
      : "",
    registrationFeeAmount: primaryProfile?.registrationFeeAmount || 200
  });
  const [errors, setErrors] = useState({});

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/users/patients", data),
    onSuccess: () => {
      toast.success("Patient created successfully");
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to create patient");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/users/patients/${patient.id}`, data),
    onSuccess: () => {
      toast.success("Patient updated successfully");
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to update patient");
    }
  });

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const profileData = {
      gender: formData.gender || null,
      dob: formData.dob || null,
      bloodGroup: formData.bloodGroup || null,
      addressLine1: formData.addressLine1 || null,
      city: formData.city || null,
      state: formData.state || null,
      pin: formData.pin || null,
      uhid: formData.uhid || null,
      registrationFeeCollected: formData.registrationFeeCollected || false,
      registrationFeeCollectedAt: formData.registrationFeeCollectedAt
        ? new Date(formData.registrationFeeCollectedAt).toISOString()
        : null,
      registrationFeeAmount: formData.registrationFeeCollected
        ? parseFloat(formData.registrationFeeAmount) || 200
        : null
    };

    if (isEdit) {
      updateMutation.mutate({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        profile: profileData
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        profile: {
          name: formData.name,
          ...profileData
        }
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-green-600 to-emerald-600">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? "Edit Patient" : "Add Patient"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Account Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Account Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.name ? "border-red-500" : "border-slate-300"
                  }`}
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.phone ? "border-red-500" : "border-slate-300"
                  }`}
                  placeholder="Phone number"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.email ? "border-red-500" : "border-slate-300"
                  }`}
                  placeholder="Email address"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              {isEdit ? "Profile Details (Self)" : "Primary Profile (Self)"}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <SearchableDropdown
                  label="Gender"
                  value={formData.gender || ""}
                  options={[
                    { value: "", label: "Select" },
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                    { value: "Other", label: "Other" }
                  ]}
                  onChange={(value) =>
                    handleChange({ target: { name: "gender", value } })
                  }
                  placeholder="Select"
                  className=""
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <SearchableDropdown
                  label="Blood Group"
                  value={formData.bloodGroup || ""}
                  options={[
                    { value: "", label: "Select" },
                    { value: "A+", label: "A+" },
                    { value: "A-", label: "A-" },
                    { value: "B+", label: "B+" },
                    { value: "B-", label: "B-" },
                    { value: "AB+", label: "AB+" },
                    { value: "AB-", label: "AB-" },
                    { value: "O+", label: "O+" },
                    { value: "O-", label: "O-" }
                  ]}
                  onChange={(value) =>
                    handleChange({ target: { name: "bloodGroup", value } })
                  }
                  placeholder="Select"
                  className=""
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  name="pin"
                  value={formData.pin}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="PIN"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  UHID
                </label>
                <input
                  type="text"
                  name="uhid"
                  value={formData.uhid}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Unique Health ID"
                />
              </div>
            </div>

            {/* Registration Fee Section */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Registration Fee
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="registrationFeeCollected"
                      checked={formData.registrationFeeCollected}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          registrationFeeCollected: e.target.checked,
                          registrationFeeCollectedAt: e.target.checked
                            ? new Date().toISOString().slice(0, 16)
                            : ""
                        }));
                      }}
                      className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Registration Fee Collected
                    </span>
                  </label>
                </div>

                {formData.registrationFeeCollected && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Collection Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        name="registrationFeeCollectedAt"
                        value={formData.registrationFeeCollectedAt}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        name="registrationFeeAmount"
                        value={formData.registrationFeeAmount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="200"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isEdit ? "Saving..." : "Creating..."}
                </>
              ) : (
                <>{isEdit ? "Save Changes" : "Create Patient"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Profile Modal (Add/Edit Relative)
const ProfileModal = ({ patient, profile, onClose, onSuccess }) => {
  const isEdit = !!profile;
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    relation: profile?.relation || "",
    gender: profile?.gender || "",
    dob: profile?.dob ? profile.dob.split("T")[0] : "",
    bloodGroup: profile?.bloodGroup || "",
    addressLine1: profile?.addressLine1 || "",
    addressLine2: profile?.addressLine2 || "",
    city: profile?.city || "",
    state: profile?.state || "",
    pin: profile?.pin || "",
    uhid: profile?.uhid || "",
    registrationFeeCollected: profile?.registrationFeeCollected || false,
    registrationFeeCollectedAt: profile?.registrationFeeCollectedAt
      ? new Date(profile.registrationFeeCollectedAt).toISOString().slice(0, 16)
      : "",
    registrationFeeAmount: profile?.registrationFeeAmount || 200
  });
  const [errors, setErrors] = useState({});

  const createMutation = useMutation({
    mutationFn: (data) =>
      api.post(`/users/patients/${patient.id}/profiles`, data),
    onSuccess: () => {
      toast.success("Profile added successfully");
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to add profile");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) =>
      api.put(`/users/patients/${patient.id}/profiles/${profile.id}`, data),
    onSuccess: () => {
      toast.success("Profile updated successfully");
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to update profile");
    }
  });

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!isEdit && !profile?.isPrimary && !formData.relation) {
      newErrors.relation = "Relation is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name,
      relation: formData.relation || (profile?.isPrimary ? "Self" : null),
      gender: formData.gender || null,
      dob: formData.dob || null,
      bloodGroup: formData.bloodGroup || null,
      addressLine1: formData.addressLine1 || null,
      addressLine2: formData.addressLine2 || null,
      city: formData.city || null,
      state: formData.state || null,
      pin: formData.pin || null,
      uhid: formData.uhid || null,
      registrationFeeCollected: formData.registrationFeeCollected || false,
      registrationFeeCollectedAt: formData.registrationFeeCollectedAt
        ? new Date(formData.registrationFeeCollectedAt).toISOString()
        : null,
      registrationFeeAmount: formData.registrationFeeCollected
        ? parseFloat(formData.registrationFeeAmount) || 200
        : null
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-pink-600 to-rose-600">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? "Edit Profile" : "Add Family Member"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                  errors.name ? "border-red-500" : "border-slate-300"
                }`}
                placeholder="Full name"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {!profile?.isPrimary && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Relation *
                </label>
                <SearchableDropdown
                  label="Relation *"
                  value={formData.relation || ""}
                  options={[
                    { value: "", label: "Select relation" },
                    { value: "Spouse", label: "Spouse" },
                    { value: "Father", label: "Father" },
                    { value: "Mother", label: "Mother" },
                    { value: "Child", label: "Child" },
                    { value: "Sibling", label: "Sibling" },
                    { value: "Other", label: "Other" }
                  ]}
                  onChange={(value) =>
                    handleChange({ target: { name: "relation", value } })
                  }
                  placeholder="Select relation"
                  className={errors.relation ? "border-red-500" : ""}
                />
                {errors.relation && (
                  <p className="text-red-500 text-xs mt-1">{errors.relation}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gender
              </label>
              <SearchableDropdown
                label="Gender"
                value={formData.gender || ""}
                options={[
                  { value: "", label: "Select" },
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" }
                ]}
                onChange={(value) =>
                  handleChange({ target: { name: "gender", value } })
                }
                placeholder="Select"
                className=""
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div>
              <SearchableDropdown
                label="Blood Group"
                value={formData.bloodGroup || ""}
                options={[
                  { value: "", label: "Select" },
                  { value: "A+", label: "A+" },
                  { value: "A-", label: "A-" },
                  { value: "B+", label: "B+" },
                  { value: "B-", label: "B-" },
                  { value: "AB+", label: "AB+" },
                  { value: "AB-", label: "AB-" },
                  { value: "O+", label: "O+" },
                  { value: "O-", label: "O-" }
                ]}
                onChange={(value) =>
                  handleChange({ target: { name: "bloodGroup", value } })
                }
                placeholder="Select"
                className=""
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="State"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                PIN Code
              </label>
              <input
                type="text"
                name="pin"
                value={formData.pin}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="PIN"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                UHID
              </label>
              <input
                type="text"
                name="uhid"
                value={formData.uhid}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Unique Health ID"
              />
            </div>
          </div>

          {/* Registration Fee Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Registration Fee
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="registrationFeeCollected"
                    checked={formData.registrationFeeCollected}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        registrationFeeCollected: e.target.checked,
                        registrationFeeCollectedAt: e.target.checked
                          ? new Date().toISOString().slice(0, 16)
                          : ""
                      }));
                    }}
                    className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Registration Fee Collected
                  </span>
                </label>
              </div>

              {formData.registrationFeeCollected && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Collection Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="registrationFeeCollectedAt"
                      value={formData.registrationFeeCollectedAt}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      name="registrationFeeAmount"
                      value={formData.registrationFeeAmount}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="200"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>{isEdit ? "Save Changes" : "Add Profile"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Patient Row Component
const PatientRow = ({
  patient,
  onEdit,
  onAnonymize,
  onAddProfile,
  onEditProfile,
  canCreate = true,
  canEdit = true,
  canDelete = true
}) => {
  const [expanded, setExpanded] = useState(false);
  const profiles = patient.patientProfiles || [];
  const primaryProfile = profiles.find((p) => p.isPrimary);

  return (
    <>
      {/* Main Row */}
      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`p-1 rounded hover:bg-slate-200 transition ${
              expanded ? "bg-blue-100 text-blue-600" : "text-slate-400"
            }`}>
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
              <User className="text-green-600" size={18} />
            </div>
            <div>
              <div className="font-medium text-slate-900">{patient.name}</div>
              <div className="text-xs text-slate-500">ID: #{patient.id}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-slate-700 flex items-center gap-1.5">
            <Phone size={14} className="text-slate-400" />
            {patient.phone}
          </div>
          {patient.email && (
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Mail size={12} className="text-slate-400" />
              {patient.email}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {profiles.length}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-1.5">
            {primaryProfile?.bloodGroup && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">
                  Blood:
                </span>
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                  {primaryProfile.bloodGroup}
                </span>
              </div>
            )}
            {primaryProfile?.uhid && (
              <div className="flex items-center gap-1.5 text-xs">
                <Hash size={12} className="text-slate-400" />
                <span className="text-slate-500 font-medium">UHID:</span>
                <span className="text-slate-700 font-medium">
                  {primaryProfile.uhid}
                </span>
              </div>
            )}
            {!primaryProfile?.bloodGroup && !primaryProfile?.uhid && (
              <span className="text-xs text-slate-400">-</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          {primaryProfile?.registrationFeeCollected ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 size={14} className="text-green-600" />
                <span className="font-medium text-green-700">Paid</span>
              </div>
              {primaryProfile.registrationFeeAmount && (
                <div className="flex items-center gap-1 text-xs text-slate-700 font-medium">
                  <IndianRupee size={12} />
                  {primaryProfile.registrationFeeAmount}
                </div>
              )}
              {primaryProfile.registrationFeeCollectedAt && (
                <div className="text-xs text-slate-500">
                  {new Date(
                    primaryProfile.registrationFeeCollectedAt
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <XCircle size={14} className="text-red-500" />
              <span className="text-xs font-medium text-red-600">Not Paid</span>
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {canCreate && (
              <button
                onClick={() => onAddProfile(patient)}
                className="p-1.5 text-pink-600 hover:bg-pink-50 rounded-lg transition"
                title="Add Family Member">
                <UserPlus size={16} />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(patient)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Edit Patient">
                <Edit size={16} />
              </button>
            )}
            {canDelete && (
              <>
                <button
                  onClick={() => onAnonymize(patient)}
                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                  title="Anonymize Account">
                  <UserX size={16} />
                </button>
              </>
            )}
            {!canCreate && !canEdit && !canDelete && (
              <span className="text-xs text-slate-400">View only</span>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Profiles */}
      {expanded && (
        <tr>
          <td colSpan="7" className="bg-slate-50 px-4 py-3">
            <div className="ml-8 space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Patient Profiles ({profiles.length})
              </div>
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        profile.isPrimary ? "bg-green-100" : "bg-pink-100"
                      }`}>
                      {profile.isPrimary ? (
                        <User className="text-green-600" size={16} />
                      ) : (
                        <Heart className="text-pink-600" size={16} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {profile.name}
                        </span>
                        <RelationBadge
                          relation={profile.relation}
                          isPrimary={profile.isPrimary}
                        />
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5 flex-wrap">
                        {profile.gender && <span>{profile.gender}</span>}
                        {profile.dob && (
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(profile.dob).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        )}
                        {profile.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {profile.city}
                          </span>
                        )}
                      </div>
                      {/* Blood Group and UHID */}
                      {(profile.bloodGroup || profile.uhid) && (
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {profile.bloodGroup && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500 font-medium">
                                Blood:
                              </span>
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                {profile.bloodGroup}
                              </span>
                            </div>
                          )}
                          {profile.uhid && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Hash size={12} className="text-slate-400" />
                              <span className="text-slate-500 font-medium">
                                UHID:
                              </span>
                              <span className="text-slate-700 font-medium">
                                {profile.uhid}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Registration Fee Status */}
                      <div className="mt-1.5">
                        {profile.registrationFeeCollected ? (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1 text-green-700">
                              <CheckCircle2
                                size={12}
                                className="text-green-600"
                              />
                              <span className="font-medium">Fee Paid</span>
                            </div>
                            {profile.registrationFeeAmount && (
                              <div className="flex items-center gap-0.5 text-slate-700 font-medium">
                                <IndianRupee size={10} />
                                {profile.registrationFeeAmount}
                              </div>
                            )}
                            {profile.registrationFeeCollectedAt && (
                              <div className="text-slate-500">
                                {new Date(
                                  profile.registrationFeeCollectedAt
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs">
                            <XCircle size={12} className="text-red-500" />
                            <span className="font-medium text-red-600">
                              Fee Not Paid
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Only show edit/delete for non-primary profiles */}
                  {!profile.isPrimary && (canEdit || canDelete) && (
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => onEditProfile(patient, profile)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Profile">
                          <Edit size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default function PatientsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { canCreate, canEdit, canDelete } = usePagePermissions();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    search: ""
  });

  // Modal states
  const [patientModal, setPatientModal] = useState({
    open: false,
    patient: null
  });
  const [profileModal, setProfileModal] = useState({
    open: false,
    patient: null,
    profile: null
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Fetch patients
  const { data, isLoading } = useQuery({
    queryKey: ["patients", filters],
    queryFn: async () => {
      const params = { ...filters };
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === undefined) &&
          delete params[key]
      );
      return (await api.get("/users/patients", { params })).data;
    }
  });

  const patients = data?.patients || [];
  const pagination = data?.pagination || {};

  // Anonymize mutation
  const anonymizePatientMutation = useMutation({
    mutationFn: (id) => api.post(`/users/patients/${id}/anonymize`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success(
        `Patient account anonymized successfully. ${
          data.data?.anonymizedPatientProfiles || 0
        } patient profile(s) anonymized.`
      );
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error || "Failed to anonymize patient account"
      );
    }
  });

  // Handlers
  const handlePageChange = useCallback((page) => {
    setFilters((f) => ({ ...f, page }));
  }, []);

  const handleAddPatient = useCallback(() => {
    setPatientModal({ open: true, patient: null });
  }, []);

  const handleEditPatient = useCallback((patient) => {
    setPatientModal({ open: true, patient });
  }, []);

  const handleAnonymizePatient = useCallback(
    async (patient) => {
      const ok = await confirm({
        title: "Anonymize Patient Account",
        message: `Are you sure you want to anonymize "${patient.name}"? This will:

• Create an anonymous user clone with anonymized personal information
• Anonymize all patient profiles (including relatives) for this user
• Update all related records (appointments, bookings, orders, etc.) to reference the anonymous user
• Delete the original patient account

This action cannot be undone.`,
        danger: true
      });
      if (ok) anonymizePatientMutation.mutate(patient.id);
    },
    [confirm, anonymizePatientMutation]
  );

  const handleAddProfile = useCallback((patient) => {
    setProfileModal({ open: true, patient, profile: null });
  }, []);

  const handleEditProfile = useCallback((patient, profile) => {
    setProfileModal({ open: true, patient, profile });
  }, []);

  const handleSuccess = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["patients"] });
  }, [qc]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <HeartPulse className="text-green-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Patients</h1>
            <p className="text-sm text-slate-500">
              Manage patients and their family profiles
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={handleAddPatient}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
            <Plus size={18} />
            Add Patient
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 flex items-center">
            <span className="font-semibold text-green-600 mr-1">
              {pagination.total || 0}
            </span>
            total patients
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left w-12"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Profiles
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Blood / UHID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Registration Fee
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                      <p className="text-sm text-slate-500">
                        Loading patients...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <HeartPulse className="text-slate-300" size={48} />
                      <p className="text-sm text-slate-500">
                        No patients found
                      </p>
                      {canCreate && (
                        <button
                          onClick={handleAddPatient}
                          className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
                          Add Your First Patient
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    onEdit={handleEditPatient}
                    onAnonymize={handleAnonymizePatient}
                    onAddProfile={handleAddProfile}
                    onEditProfile={handleEditProfile}
                    canCreate={canCreate}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > pagination.pageSize && (
          <div className="px-4 py-3 border-t border-slate-200">
            <Pagination
              page={pagination.page || 1}
              total={pagination.total || 0}
              pageSize={pagination.pageSize || 15}
              onPage={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {patientModal.open && (
        <PatientModal
          patient={patientModal.patient}
          onClose={() => setPatientModal({ open: false, patient: null })}
          onSuccess={handleSuccess}
        />
      )}

      {profileModal.open && (
        <ProfileModal
          patient={profileModal.patient}
          profile={profileModal.profile}
          onClose={() =>
            setProfileModal({ open: false, patient: null, profile: null })
          }
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
