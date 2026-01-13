import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { toast } from "react-toastify";
import {
  Calendar,
  Plus,
  Search,
  User,
  Phone,
  Clock,
  Stethoscope,
  Edit,
  AlertCircle,
  X,
  HeartPulse,
  Building2,
  Loader2,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { SearchableDropdown, Pagination } from "../components/shared";

// Book Slot Modal Component
const BookSlotModal = ({ patient, onClose, onSuccess }) => {
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    patientProfileId: "",
    userId: "",
    doctorId: "",
    departmentId: "",
    date: "",
    timeSlot: "",
    paymentOption: "PAY_AT_HOSPITAL",
    status: "PENDING",
    notes: ""
  });
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patientProfiles, setPatientProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Reset form when patient changes
  useEffect(() => {
    if (patient?.id) {
      setFormData({
        patientProfileId: "",
        userId: patient.id.toString(),
        doctorId: "",
        departmentId: "",
        date: "",
        timeSlot: "",
        paymentOption: "PAY_AT_HOSPITAL",
        status: "PENDING",
        notes: ""
      });
      setErrors({});
      setDoctors([]);
      setAvailableSlots([]);
      setPatientProfiles([]);
    }
  }, [patient?.id]);

  // Fetch patient profiles when patient is provided
  useEffect(() => {
    if (patient?.id) {
      // First, check if patient already has profiles in the object
      const existingProfiles = patient?.patientProfiles || patient?.profiles || [];
      if (existingProfiles.length > 0) {
        setPatientProfiles(existingProfiles);
        // Auto-select primary profile if available
        const primaryProfile = existingProfiles.find((p) => p.isPrimary);
        if (primaryProfile) {
          setFormData((prev) => ({
            ...prev,
            patientProfileId: primaryProfile.id.toString()
          }));
        } else {
          // If no primary, select first profile
          setFormData((prev) => ({
            ...prev,
            patientProfileId: existingProfiles[0].id.toString()
          }));
        }
        return; // Don't fetch if we already have profiles
      }

      // If no profiles in patient object, fetch them
      setLoadingProfiles(true);
      api
        .get(`/users/patients/${patient.id}`)
        .then((res) => {
          const profiles = res.data?.patientProfiles || res.data?.profiles || res.data?.data?.patientProfiles || [];
          setPatientProfiles(profiles);
          // Auto-select primary profile if available
          if (profiles.length > 0) {
            const primaryProfile = profiles.find((p) => p.isPrimary);
            if (primaryProfile) {
              setFormData((prev) => ({
                ...prev,
                patientProfileId: primaryProfile.id.toString()
              }));
            } else {
              // If no primary, select first profile
              setFormData((prev) => ({
                ...prev,
                patientProfileId: profiles[0].id.toString()
              }));
            }
          }
        })
        .catch((err) => {
          console.error("Failed to load patient profiles:", err);
          // Silently fail - profiles might already be in patient object or endpoint might not exist
          // Don't show toast error as it's not critical if patient already has profiles
          setPatientProfiles([]);
        })
        .finally(() => setLoadingProfiles(false));
    }
  }, [patient?.id, patient?.patientProfiles]);

  // Fetch departments
  useEffect(() => {
    api
      .get("/departments", { params: { pageSize: 100 } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setDepartments(list);
      })
      .catch((err) => console.error("Failed to load departments:", err));
  }, []);

  // Fetch doctors when department changes
  useEffect(() => {
    if (!formData.departmentId) {
      setDoctors([]);
      setFormData((prev) => ({ ...prev, doctorId: "", timeSlot: "" }));
      setAvailableSlots([]);
      return;
    }
    api
      .get("/doctors", { params: { departmentId: formData.departmentId, pageSize: 100 } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.doctors || [];
        setDoctors(list);
      })
      .catch((err) => {
        console.error("Failed to load doctors:", err);
        setDoctors([]);
      });
  }, [formData.departmentId]);

  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    if (!formData.doctorId || !formData.date) {
      setAvailableSlots([]);
      setFormData((prev) => ({ ...prev, timeSlot: "" }));
      return;
    }

    // Check if selected date is in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setAvailableSlots([]);
      setFormData((prev) => ({ ...prev, timeSlot: "" }));
      toast.error("Cannot select past dates");
      return;
    }

    setLoadingSlots(true);
    api
      .get(`/schedule/${formData.doctorId}/slots`, {
        params: { date: formData.date }
      })
      .then((res) => {
        const slots = res.data?.slots || res.data || [];
        const available = Array.isArray(slots) ? slots.filter((slot) => slot.status === "AVAILABLE") : [];

        // Filter out past time slots (especially important for today's date)
        const now = new Date();
        const selectedDateObj = new Date(formData.date);
        const isToday = selectedDateObj.toDateString() === today.toDateString();

        const filteredSlots = available.filter((slot) => {
          if (!slot.time) return false;

          // If the selected date is today, filter out past time slots
          if (isToday) {
            const [hours, minutes] = slot.time.split(':').map(Number);
            const slotTime = new Date();
            slotTime.setHours(hours, minutes || 0, 0, 0);

            // Only include slots that are in the future (with 15 minute buffer)
            const bufferMinutes = 15;
            slotTime.setMinutes(slotTime.getMinutes() - bufferMinutes);

            return slotTime > now;
          }

          // For future dates, include all available slots
          return true;
        });

        setAvailableSlots(filteredSlots);
      })
      .catch((err) => {
        console.error("Failed to load slots:", err);
        toast.error("Failed to load available slots");
        setAvailableSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [formData.doctorId, formData.date]);

  const validate = () => {
    const newErrors = {};
    if (!formData.patientProfileId) newErrors.patientProfileId = "Patient profile is required";
    if (!formData.userId) newErrors.userId = "User is required";
    if (!formData.doctorId) newErrors.doctorId = "Doctor is required";
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.timeSlot) newErrors.timeSlot = "Time slot is required";
    // Payment option is optional - removed validation
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const bookMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        patientProfileId: Number(formData.patientProfileId),
        userId: Number(formData.userId),
        doctorId: Number(formData.doctorId),
        departmentId: Number(formData.departmentId),
        date: formData.date,
        timeSlot: formData.timeSlot,
        paymentOption: formData.paymentOption || undefined,
        status: formData.status,
        notes: formData.notes || undefined
      };
      return (await api.post("/appointments/book", payload)).data;
    },
    onSuccess: () => {
      toast.success("Appointment booked successfully");
      qc.invalidateQueries({ queryKey: ["patient-appointments-list"] });
      qc.invalidateQueries({ queryKey: ["patients-booking"] });
      onSuccess();
      onClose();
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.error || "Failed to book appointment";
      toast.error(errorMsg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    bookMutation.mutate();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Static */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">Book Appointment</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Patient Info */}
          {patient && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="text-blue-600" size={20} />
                </div>
                <div>
                  <div className="font-medium text-slate-900">{patient.name}</div>
                  <div className="text-sm text-slate-600">{patient.phone}</div>
                </div>
              </div>
            </div>
          )}

          {/* Patient Profile */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Patient Profile *
            </label>
            {loadingProfiles ? (
              <div className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg">
                <Loader2 className="animate-spin text-blue-600" size={16} />
                <span className="text-sm text-slate-600">Loading patient profiles...</span>
              </div>
            ) : (
              <SearchableDropdown
                value={formData.patientProfileId || ""}
                options={[
                  { value: "", label: "Select Patient Profile" },
                  ...patientProfiles.map((profile) => ({
                    value: profile.id.toString(),
                    label: `${profile.name} ${profile.isPrimary ? "(Self)" : `(${profile.relation || "Other"})`}`
                  }))
                ]}
                onChange={(value) => handleChange("patientProfileId", value)}
                placeholder="Select Patient Profile"
                disabled={patientProfiles.length === 0}
              />
            )}
            {errors.patientProfileId && (
              <p className="text-red-500 text-xs mt-1">{errors.patientProfileId}</p>
            )}
            {!loadingProfiles && patientProfiles.length === 0 && patient?.id && (
              <p className="text-yellow-600 text-xs mt-1">
                No patient profiles found. Please add a profile first.
              </p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Department *
            </label>
            <SearchableDropdown
              value={formData.departmentId || ""}
              options={[
                { value: "", label: "Select Department" },
                ...departments.map((dept) => ({
                  value: dept.id.toString(),
                  label: dept.name
                }))
              ]}
              onChange={(value) => handleChange("departmentId", value)}
              placeholder="Select Department"
            />
            {errors.departmentId && (
              <p className="text-red-500 text-xs mt-1">{errors.departmentId}</p>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Doctor *
            </label>
            <SearchableDropdown
              value={formData.doctorId || ""}
              options={[
                { value: "", label: "Select Doctor" },
                ...doctors.map((doc) => ({
                  value: doc.id.toString(),
                  label: `${doc.user?.name || "N/A"} - ${doc.specialization || "N/A"}`
                }))
              ]}
              onChange={(value) => handleChange("doctorId", value)}
              placeholder="Select Doctor"
              disabled={!formData.departmentId}
            />
            {errors.doctorId && (
              <p className="text-red-500 text-xs mt-1">{errors.doctorId}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.date ? "border-red-500" : "border-slate-300"
              }`}
            />
            {errors.date && (
              <p className="text-red-500 text-xs mt-1">{errors.date}</p>
            )}
          </div>

          {/* Time Slot */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Time Slot *
            </label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg">
                <Loader2 className="animate-spin text-blue-600" size={16} />
                <span className="text-sm text-slate-600">Loading available slots...</span>
              </div>
            ) : availableSlots.length === 0 && formData.doctorId && formData.date ? (
              <div className="px-4 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                No available slots for this date. Please select another date.
              </div>
            ) : (
              <SearchableDropdown
                value={formData.timeSlot || ""}
                options={[
                  { value: "", label: "Select Time Slot" },
                  ...availableSlots.map((slot) => ({
                    value: slot.time,
                    label: slot.time
                  }))
                ]}
                onChange={(value) => handleChange("timeSlot", value)}
                placeholder="Select Time Slot"
                disabled={!formData.doctorId || !formData.date || availableSlots.length === 0}
              />
            )}
            {errors.timeSlot && (
              <p className="text-red-500 text-xs mt-1">{errors.timeSlot}</p>
            )}
          </div>

          {/* Payment Option */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Option
            </label>
            <SearchableDropdown
              value={formData.paymentOption || ""}
              options={[
                { value: "", label: "Select Payment Option (Optional)" },
                { value: "PAY_AT_HOSPITAL", label: "Pay at Hospital" },
                { value: "ONLINE", label: "Online Payment" },
                { value: "FREE", label: "Free" }
              ]}
              onChange={(value) => handleChange("paymentOption", value)}
              placeholder="Select Payment Option (Optional)"
            />
            {errors.paymentOption && (
              <p className="text-red-500 text-xs mt-1">{errors.paymentOption}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status *
            </label>
            <SearchableDropdown
              value={formData.status || ""}
              options={[
                { value: "PENDING", label: "Pending" },
                { value: "CONFIRMED", label: "Confirmed" }
              ]}
              onChange={(value) => handleChange("status", value)}
              placeholder="Select Status"
            />
            {errors.status && (
              <p className="text-red-500 text-xs mt-1">{errors.status}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes..."
            />
          </div>
          </div>

          {/* Footer - Static */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={bookMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {bookMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Booking...
                </>
              ) : (
                "Book Appointment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Reschedule Modal Component
const RescheduleModal = ({ appointment, onClose, onSuccess }) => {
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    date: "",
    timeSlot: "",
    notes: ""
  });
  const [errors, setErrors] = useState({});
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Reset form when appointment changes
  useEffect(() => {
    if (appointment?.id) {
      setFormData({
        date: "",
        timeSlot: "",
        notes: ""
      });
      setErrors({});
      setAvailableSlots([]);
    }
  }, [appointment?.id]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (!appointment?.doctorId || !formData.date) {
      setAvailableSlots([]);
      setFormData((prev) => ({ ...prev, timeSlot: "" }));
      return;
    }

    // Check if selected date is in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setAvailableSlots([]);
      setFormData((prev) => ({ ...prev, timeSlot: "" }));
      toast.error("Cannot select past dates");
      return;
    }

    setLoadingSlots(true);
    api
      .get(`/schedule/${appointment.doctorId}/slots`, {
        params: { date: formData.date }
      })
      .then((res) => {
        const slots = res.data?.slots || res.data || [];
        const available = Array.isArray(slots) ? slots.filter((slot) => slot.status === "AVAILABLE") : [];

        // Filter out past time slots (especially important for today's date)
        const now = new Date();
        const selectedDateObj = new Date(formData.date);
        const isToday = selectedDateObj.toDateString() === today.toDateString();

        const filteredSlots = available.filter((slot) => {
          if (!slot.time) return false;

          // If the selected date is today, filter out past time slots
          if (isToday) {
            const [hours, minutes] = slot.time.split(':').map(Number);
            const slotTime = new Date();
            slotTime.setHours(hours, minutes || 0, 0, 0);

            // Only include slots that are in the future (with 15 minute buffer)
            const bufferMinutes = 15;
            slotTime.setMinutes(slotTime.getMinutes() - bufferMinutes);

            return slotTime > now;
          }

          // For future dates, include all available slots
          return true;
        });

        setAvailableSlots(filteredSlots);
      })
      .catch((err) => {
        console.error("Failed to load slots:", err);
        toast.error("Failed to load available slots");
        setAvailableSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [appointment?.doctorId, formData.date]);

  const validate = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.timeSlot) newErrors.timeSlot = "Time slot is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!appointment?.id) {
        throw new Error("Appointment ID is missing");
      }
      const payload = {
        date: formData.date,
        timeSlot: formData.timeSlot,
        notes: formData.notes || undefined
      };
      const url = `/appointments/${appointment.id}/reschedule`;
      const baseURL = api.defaults.baseURL || import.meta.env.VITE_API_URL || "http://localhost:4000/api/admin";
      const fullURL = `${baseURL}${url}`;
      console.log("Rescheduling appointment:", {
        url,
        fullURL,
        baseURL,
        appointmentId: appointment.id,
        appointment,
        payload
      });
      try {
        const response = await api.put(url, payload);
        return response.data;
      } catch (error) {
        console.error("Reschedule API error - Full Details:", {
          url,
          fullURL,
          baseURL,
          appointmentId: appointment.id,
          payload,
          error: {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack
          },
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers,
            data: error.response.data,
            config: {
              url: error.response.config?.url,
              method: error.response.config?.method,
              baseURL: error.response.config?.baseURL,
              headers: error.response.config?.headers
            }
          } : null,
          request: error.request ? {
            responseURL: error.request.responseURL,
            status: error.request.status,
            statusText: error.request.statusText
          } : null
        });
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Appointment rescheduled successfully");
      qc.invalidateQueries({ queryKey: ["patient-appointments-list"] });
      qc.invalidateQueries({ queryKey: ["patients-booking"] });
      onSuccess();
      onClose();
    },
    onError: (err) => {
      console.error("Reschedule mutation error - Full Axios Error:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        response: err.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        } : null,
        request: err.request ? {
          responseURL: err.request.responseURL,
          status: err.request.status
        } : null,
        config: err.config ? {
          url: err.config.url,
          method: err.config.method,
          baseURL: err.config.baseURL,
          data: err.config.data
        } : null
      });
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to reschedule appointment";
      toast.error(errorMsg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    rescheduleMutation.mutate();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-orange-600 to-amber-600">
          <h2 className="text-lg font-semibold text-white">Reschedule Appointment</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Current Appointment Info */}
          {appointment && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-sm font-medium text-slate-700 mb-2">
                Current Appointment
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div>Date: {new Date(appointment.date).toLocaleDateString("en-IN")}</div>
                <div>Time: {appointment.timeSlot}</div>
                <div>Doctor: {appointment.doctor?.user?.name || "N/A"}</div>
              </div>
            </div>
          )}

          {/* New Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.date ? "border-red-500" : "border-slate-300"
              }`}
            />
            {errors.date && (
              <p className="text-red-500 text-xs mt-1">{errors.date}</p>
            )}
          </div>

          {/* New Time Slot */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Time Slot *
            </label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg">
                <Loader2 className="animate-spin text-orange-600" size={16} />
                <span className="text-sm text-slate-600">Loading available slots...</span>
              </div>
            ) : availableSlots.length === 0 && formData.date ? (
              <div className="px-4 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                No available slots for this date. Please select another date.
              </div>
            ) : (
              <SearchableDropdown
                value={formData.timeSlot || ""}
                options={[
                  { value: "", label: "Select Time Slot" },
                  ...availableSlots.map((slot) => ({
                    value: slot.time,
                    label: slot.time
                  }))
                ]}
                onChange={(value) => handleChange("timeSlot", value)}
                placeholder="Select Time Slot"
                disabled={!formData.date || availableSlots.length === 0}
              />
            )}
            {errors.timeSlot && (
              <p className="text-red-500 text-xs mt-1">{errors.timeSlot}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
              placeholder="Add any additional notes..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={rescheduleMutation.isPending}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {rescheduleMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Rescheduling...
                </>
              ) : (
                "Reschedule"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusStyles = {
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    CHECKED_IN: "bg-purple-100 text-purple-700",
    IN_PROGRESS: "bg-indigo-100 text-indigo-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-gray-100 text-gray-700"
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        statusStyles[status] || statusStyles.PENDING
      }`}>
      {status?.replace(/_/g, " ") || "PENDING"}
    </span>
  );
};

// Main Component
export default function PatientsBookingPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Fetch patients
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ["patients-booking", search, page, pageSize],
    queryFn: async () => {
      const params = {
        page,
        pageSize,
        search: search || undefined
      };
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );
      return (await api.get("/users/patients", { params })).data;
    }
  });

  const patients = patientsData?.patients || [];
  const pagination = patientsData?.pagination || {};

  // Fetch appointments for all visible patients
  const patientIds = patients.map((p) => p.id).join(",");
  const { data: appointmentsData } = useQuery({
    queryKey: ["patient-appointments-list", patientIds],
    queryFn: async () => {
      if (patients.length === 0) return { appointments: [] };

      // Fetch appointments from orders endpoint (same as AppointmentOrders page)
      // Appointments are stored as orders with type "appointments"
      try {
        const res = await api.get("/orders", {
          params: {
            type: "appointments",
            pageSize: 1000 // Get a large batch to filter client-side
          }
        });
        const orders = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.items || [];

        // Filter appointments that belong to any of the visible patients
        // Match by userId or patient.id or patient?.id
        const patientIdSet = new Set(patients.map(p => p.id));
        const allAppointments = orders.filter((order) => {
          return (
            (order.userId && patientIdSet.has(order.userId)) ||
            (order.user?.id && patientIdSet.has(order.user?.id)) ||
            (order.patientId && patientIdSet.has(order.patientId)) ||
            (order.patient?.id && patientIdSet.has(order.patient?.id))
          );
        });

        return { appointments: allAppointments };
      } catch (err) {
        console.error("Failed to fetch appointments from orders:", err);
        // Fallback: try individual patient fetches
        const allAppointments = [];
        for (const patient of patients) {
          try {
            const res = await api.get("/appointments", {
              params: { patientId: patient.id, pageSize: 100 }
            });
            const apts = res.data?.appointments || res.data?.items || [];
            allAppointments.push(...apts);
          } catch (err2) {
            console.error(`Failed to fetch appointments for patient ${patient.id}:`, err2);
          }
        }
        return { appointments: allAppointments };
      }
    },
    enabled: patients.length > 0
  });

  const allAppointments = appointmentsData?.appointments || [];

  const handleBookAppointment = useCallback((patient) => {
    setSelectedPatient(patient);
    setBookModalOpen(true);
  }, []);

  const handleReschedule = useCallback((appointment) => {
    console.log("handleReschedule called with appointment:", appointment);
    if (!appointment) {
      console.error("No appointment provided to handleReschedule");
      toast.error("No appointment selected for rescheduling");
      return;
    }
    setSelectedAppointment(appointment);
    setRescheduleModalOpen(true);
  }, []);

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ["patient-appointments-list"] });
    qc.invalidateQueries({ queryKey: ["patients-booking"] });
  };

  const [expandedPatients, setExpandedPatients] = useState(new Set());

  const togglePatientExpand = useCallback((patientId) => {
    setExpandedPatients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Calendar className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Patients Booking</h1>
            <p className="text-sm text-slate-500">
              Book and manage patient appointments
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search patients by name or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Appointments Count
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {patientsLoading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-blue-600" size={32} />
                      <p className="text-sm text-slate-500">Loading patients...</p>
                    </div>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <HeartPulse className="text-slate-300" size={48} />
                      <p className="text-sm text-slate-500">No patients found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                patients.map((patient) => {
                  const patientAppointments = allAppointments.filter(
                    (apt) =>
                      apt.patientId === patient.id ||
                      apt.patient?.id === patient.id ||
                      apt.userId === patient.id ||
                      apt.user?.id === patient.id
                  );
                  const isExpanded = expandedPatients.has(patient.id);
                  return (
                    <React.Fragment key={patient.id}>
                      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => togglePatientExpand(patient.id)}
                            className={`p-1 rounded hover:bg-slate-200 transition ${
                              isExpanded ? "bg-blue-100 text-blue-600" : "text-slate-400"
                            }`}>
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="text-blue-600" size={18} />
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
                            <div className="text-xs text-slate-500 mt-0.5">
                              {patient.email}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {patientAppointments.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBookAppointment(patient);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5">
                              <Plus size={14} />
                              Book Appointment
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="5" className="px-4 py-4 bg-slate-50">
                            <div className="space-y-3">
                              {patientAppointments.length > 0 ? (
                                patientAppointments.map((appointment) => {
                                  const canReschedule = appointment.status !== "COMPLETED" && appointment.status !== "CANCELLED";
                                  return (
                                    <div
                                      key={appointment.id}
                                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                                      <div className="flex items-center gap-4 flex-1">
                                        <Calendar size={16} className="text-slate-400" />
                                        <div className="text-sm text-slate-700">
                                          {new Date(appointment.date).toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric"
                                          })}
                                        </div>
                                        <Clock size={16} className="text-slate-400" />
                                        <div className="text-sm text-slate-700">{appointment.timeSlot}</div>
                                        <Stethoscope size={16} className="text-slate-400" />
                                        <div className="text-sm text-slate-700">{appointment.doctor?.user?.name || "N/A"}</div>
                                        <Building2 size={16} className="text-slate-400" />
                                        <div className="text-sm text-slate-700">{appointment.department?.name || "N/A"}</div>
                                        <StatusBadge status={appointment.status} />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (canReschedule) {
                                            handleReschedule(appointment);
                                          } else {
                                            toast.error("Cannot reschedule COMPLETED or CANCELLED appointments");
                                          }
                                        }}
                                        disabled={!canReschedule}
                                        className={`px-3 py-1.5 text-white text-sm rounded-lg transition flex items-center gap-1.5 ${
                                          canReschedule
                                            ? "bg-orange-600 hover:bg-orange-700 cursor-pointer"
                                            : "bg-slate-400 cursor-not-allowed opacity-60"
                                        }`}>
                                        <Edit size={14} />
                                        Reschedule
                                      </button>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-center py-8 text-slate-400 italic text-sm">
                                  No appointments yet
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > pageSize && (
          <div className="px-4 py-3 border-t border-slate-200">
            <Pagination
              page={pagination.page || 1}
              total={pagination.total || 0}
              pageSize={pagination.pageSize || pageSize}
              onPage={setPage}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {bookModalOpen && selectedPatient && (
        <BookSlotModal
          patient={selectedPatient}
          onClose={() => {
            setBookModalOpen(false);
            setSelectedPatient(null);
          }}
          onSuccess={handleSuccess}
        />
      )}

      {rescheduleModalOpen && selectedAppointment && (
        <RescheduleModal
          appointment={selectedAppointment}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}


