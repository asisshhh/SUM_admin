import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Save, X, Search, Settings } from "lucide-react";
import api from "../api/client";
import { toast } from "react-toastify";

const DATA_TYPES = ["string", "number", "boolean", "json"];

function SettingModal({ open, onClose, initial }) {
  const qc = useQueryClient();
  const isEdit = Boolean(initial?.settingKey);

  const [form, setForm] = useState({
    settingKey: initial?.settingKey || "",
    settingValue: initial?.settingValue || "",
    description: initial?.description || "",
    category: initial?.category || "",
    dataType: initial?.dataType || "string"
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        settingKey: initial?.settingKey || "",
        settingValue: initial?.settingValue || "",
        description: initial?.description || "",
        category: initial?.category || "",
        dataType: initial?.dataType || "string"
      });
    }
  }, [open, initial]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.settingKey.trim()) throw new Error("Key is required");
      if (form.settingValue === undefined || form.settingValue === null) {
        throw new Error("Value is required");
      }

      const payload = {
        settingValue: String(form.settingValue),
        description: form.description || undefined,
        category: form.category || undefined,
        dataType: form.dataType || "string"
      };

      return (
        await api.put(`/settings/${encodeURIComponent(form.settingKey)}`, payload)
      ).data;
    },
    onSuccess: () => {
      toast.success("Setting saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
      onClose();
    },
    onError: (err) => {
      const msg =
        err.response?.data?.error || err.message || "Failed to save setting";
      toast.error(msg);
    }
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-slate-500" />
            <h2 className="text-lg font-semibold">
              {isEdit ? "Edit Setting" : "Add Setting"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Key *
            </label>
            <input
              type="text"
              value={form.settingKey}
              onChange={(e) =>
                setForm((f) => ({ ...f, settingKey: e.target.value }))
              }
              disabled={isEdit}
              className="input"
              placeholder="e.g. appointment_booking_cutoff_hours"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Value *
            </label>
            <input
              type="text"
              value={form.settingValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, settingValue: e.target.value }))
              }
              className="input"
              placeholder="Enter value"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Data Type
              </label>
              <select
                value={form.dataType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dataType: e.target.value }))
                }
                className="input">
                {DATA_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className="input"
                placeholder="e.g. booking"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              className="input"
              placeholder="Optional description"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
            {saveMutation.isPending ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={16} /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get("/settings");
      return res.data?.settings || [];
    }
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data || [];
    return (data || []).filter((s) =>
      [s.settingKey, s.description, s.category]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term))
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Settings className="text-blue-600" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            <p className="text-sm text-slate-500">
              Manage system settings (e.g., appointment booking cutoff hours)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-outline flex items-center gap-2">
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="btn flex items-center gap-2">
            <Plus size={16} /> Add Setting
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="relative mb-4">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by key, description, or category"
            className="input !pl-10"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Key</th>
                <th className="px-3 py-2 text-left">Value</th>
                <th className="px-3 py-2 text-left">Data Type</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Updated</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                    Loading settings...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                    No settings found
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.settingKey} className="border-t">
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {s.settingKey}
                    </td>
                    <td className="px-3 py-2 text-slate-700 break-all">
                      {s.settingValue ?? ""}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{s.dataType}</td>
                    <td className="px-3 py-2 text-slate-700">{s.category || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {s.description || "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-xs">
                      {s.updatedAt
                        ? new Date(s.updatedAt).toLocaleString("en-IN")
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => {
                          setEditing(s);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:underline text-sm">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SettingModal
        open={showModal}
        onClose={() => setShowModal(false)}
        initial={editing}
      />
    </div>
  );
}

