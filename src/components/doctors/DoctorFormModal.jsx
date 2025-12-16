import React, { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import {
  Stethoscope,
  X,
  AlertCircle,
  Upload,
  Image as ImageIcon
} from "lucide-react";

const INITIAL_FORM = {
  name: "",
  phone: "",
  email: "",
  specialization: "",
  registrationNumber: "",
  departmentId: "",
  gender: "",
  dateOfBirth: "",
  address: "",
  experience: "",
  consultationFee: "",
  description: "",
  available: true
};

function DoctorFormModal({ doc, departments, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!doc?.id;

  const [form, setForm] = useState(() => ({
    name: doc?.user?.name || "",
    phone: doc?.user?.phone || "",
    email: doc?.user?.email || "",
    specialization: doc?.specialization || "",
    registrationNumber: doc?.registrationNumber || "",
    departmentId: doc?.department?.id || "",
    gender: doc?.gender || "",
    dateOfBirth: doc?.dateOfBirth ? doc.dateOfBirth.split("T")[0] : "",
    address: doc?.address || "",
    experience: doc?.experience ?? "",
    consultationFee: doc?.consultationFee ?? "",
    description: doc?.description || "",
    available: doc?.available ?? true,
    photoUrl: doc?.photoUrl || ""
  }));

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const validate = useCallback(() => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (form.name.trim().length > 100) {
      newErrors.name = "Name cannot exceed 100 characters";
    }

    if (form.phone && form.phone.trim() && !/^[0-9]{10}$/.test(form.phone)) {
      newErrors.phone = "Phone must be exactly 10 digits";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!form.specialization.trim()) {
      newErrors.specialization = "Specialization is required";
    } else if (form.specialization.trim().length < 2) {
      newErrors.specialization = "Specialization must be at least 2 characters";
    }

    if (!form.departmentId) {
      newErrors.departmentId = "Please select a department";
    }

    if (form.experience !== "" && form.experience !== null) {
      const exp = Number(form.experience);
      if (isNaN(exp) || exp < 0) {
        newErrors.experience = "Experience cannot be negative";
      } else if (exp > 100) {
        newErrors.experience = "Experience cannot exceed 100 years";
      }
    }

    if (form.consultationFee !== "" && form.consultationFee !== null) {
      const fee = Number(form.consultationFee);
      if (isNaN(fee) || fee < 0) {
        newErrors.consultationFee = "Consultation fee cannot be negative";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleBlur = useCallback(
    (field) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validate();
    },
    [validate]
  );

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handlePhotoUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          photoUrl: "Please select an image file"
        }));
        return;
      }

      // Validate file size (100KB)
      if (file.size > 100 * 1024) {
        setErrors((prev) => ({
          ...prev,
          photoUrl: "Image size must be less than 100KB"
        }));
        return;
      }

      setUploadingPhoto(true);
      setErrors((prev) => ({ ...prev, photoUrl: undefined }));

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post("/doctors/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });

        if (response.data.success && response.data.imageUrl) {
          updateField("photoUrl", response.data.imageUrl);
        } else {
          setErrors((prev) => ({
            ...prev,
            photoUrl: "Failed to upload image"
          }));
        }
      } catch (error) {
        console.error("Photo upload error:", error);
        setErrors((prev) => ({
          photoUrl: error.response?.data?.error || "Failed to upload image"
        }));
      } finally {
        setUploadingPhoto(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [updateField]
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        specialization: form.specialization.trim(),
        registrationNumber: form.registrationNumber.trim() || null,
        departmentId: Number(form.departmentId),
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        address: form.address.trim() || null,
        photoUrl: form.photoUrl || null,
        experience: form.experience !== "" ? Number(form.experience) : null,
        consultationFee:
          form.consultationFee !== "" ? Number(form.consultationFee) : null,
        description: form.description.trim() || null,
        available: form.available
      };

      if (isEdit) {
        return (await api.put(`/doctors/${doc.id}`, payload)).data;
      }
      return (await api.post(`/doctors`, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      onClose();
    }
  });

  const handleSubmit = useCallback(() => {
    const allTouched = Object.keys(form).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouched(allTouched);

    if (validate()) {
      save.mutate();
    }
  }, [form, validate, save]);

  const inputClass = (field) =>
    `input ${
      touched[field] && errors[field] ? "border-red-500 focus:ring-red-500" : ""
    }`;

  const deptList = departments?.items ?? departments ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-cyan-600 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <Stethoscope className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">
              {isEdit ? "Edit Doctor" : "Add New Doctor"}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {save.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {save.error?.response?.data?.error || "Failed to save doctor"}
            </div>
          )}

          {/* Row 1: Name, Phone, Email */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass("name")}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="Dr. John Doe"
              />
              {touched.name && errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone</label>
              <input
                className={inputClass("phone")}
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  updateField(
                    "phone",
                    e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                onBlur={() => handleBlur("phone")}
                placeholder="9876543210"
              />
              {touched.phone && errors.phone && (
                <p className="text-xs text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Email <span className="text-slate-400 text-xs"></span>
              </label>
              <input
                className={inputClass("email")}
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="doctor@soahospitals.com"
              />
              {touched.email && errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Row 2: Registration No, Specialization, Department */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Registration No */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Registration No.</label>
              <input
                className="input"
                value={form.registrationNumber}
                onChange={(e) =>
                  updateField("registrationNumber", e.target.value)
                }
                placeholder="MCI-12345"
              />
            </div>

            {/* Specialization */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Specialization <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass("specialization")}
                value={form.specialization}
                onChange={(e) => updateField("specialization", e.target.value)}
                onBlur={() => handleBlur("specialization")}
                placeholder="Cardiology"
              />
              {touched.specialization && errors.specialization && (
                <p className="text-xs text-red-500">{errors.specialization}</p>
              )}
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                className={`select ${
                  touched.departmentId && errors.departmentId
                    ? "border-red-500"
                    : ""
                }`}
                value={form.departmentId}
                onChange={(e) => updateField("departmentId", e.target.value)}
                onBlur={() => handleBlur("departmentId")}>
                <option value="">Select Department</option>
                {deptList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {touched.departmentId && errors.departmentId && (
                <p className="text-xs text-red-500">{errors.departmentId}</p>
              )}
            </div>
          </div>

          {/* Row 3: Gender, Date of Birth, Experience */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Gender */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Gender</label>
              <select
                className="select"
                value={form.gender}
                onChange={(e) => updateField("gender", e.target.value)}>
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Date of Birth</label>
              <input
                type="date"
                className="input"
                value={form.dateOfBirth}
                onChange={(e) => updateField("dateOfBirth", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Experience */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Experience (years)</label>
              <input
                className={inputClass("experience")}
                type="number"
                min="0"
                max="100"
                value={form.experience}
                onChange={(e) => updateField("experience", e.target.value)}
                onBlur={() => handleBlur("experience")}
                placeholder="0"
              />
              {touched.experience && errors.experience && (
                <p className="text-xs text-red-500">{errors.experience}</p>
              )}
            </div>
          </div>

          {/* Row 4: Consultation Fee, Available */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Consultation Fee */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Consultation Fee (₹)
              </label>
              <input
                className={inputClass("consultationFee")}
                type="number"
                min="0"
                value={form.consultationFee}
                onChange={(e) => updateField("consultationFee", e.target.value)}
                onBlur={() => handleBlur("consultationFee")}
                placeholder="500"
              />
              {touched.consultationFee && errors.consultationFee && (
                <p className="text-xs text-red-500">{errors.consultationFee}</p>
              )}
            </div>

            {/* Available */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Available</label>
              <select
                className="select"
                value={String(form.available)}
                onChange={(e) =>
                  updateField("available", e.target.value === "true")
                }>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          {/* Profile Picture Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Profile Picture</label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {form.photoUrl ? (
                  <>
                    <img
                      src={
                        form.photoUrl.startsWith("http")
                          ? form.photoUrl
                          : form.photoUrl.startsWith("/")
                          ? `${
                              import.meta.env.VITE_API_URL?.replace(
                                "/api/admin",
                                ""
                              ) || "http://localhost:4000"
                            }${form.photoUrl}`
                          : `${
                              import.meta.env.VITE_API_URL?.replace(
                                "/api/admin",
                                ""
                              ) || "http://localhost:4000"
                            }/${form.photoUrl}`
                      }
                      alt="Doctor profile"
                      className="w-24 h-24 object-cover rounded-lg border-2 border-slate-200"
                      onError={(e) => {
                        e.target.style.display = "none";
                        const fallback = e.target.nextElementSibling;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    <div className="w-24 h-24 bg-slate-100 rounded-lg border-2 border-slate-200 hidden items-center justify-center">
                      <ImageIcon size={32} className="text-slate-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField("photoUrl", "")}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                      form.name.trim() || "Doctor"
                    )}&size=96&background=3b82f6&color=ffffff&bold=true&font-size=0.5`}
                    alt="Doctor placeholder"
                    className="w-24 h-24 object-cover rounded-lg border-2 border-slate-200"
                  />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="btn btn-outline cursor-pointer inline-flex items-center gap-2">
                  {uploadingPhoto ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      {form.photoUrl ? "Change Photo" : "Upload Photo"}
                    </>
                  )}
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  JPG, PNG or WEBP (Max 100KB)
                </p>
                {errors.photoUrl && (
                  <p className="text-xs text-red-500 mt-1">{errors.photoUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Address</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Clinic/Hospital address"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="input min-h-[80px]"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Brief description about the doctor's expertise..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-slate-50 rounded-b-2xl flex-shrink-0">
          <p className="text-xs text-slate-500">
            <span className="text-red-500">*</span> Required fields
          </p>
          <div className="flex gap-3">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={save.isPending}>
              {save.isPending
                ? "Saving..."
                : isEdit
                ? "Update Doctor"
                : "Create Doctor"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(DoctorFormModal);
