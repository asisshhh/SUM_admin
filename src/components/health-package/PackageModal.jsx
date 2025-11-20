import React, { useState } from "react";
import api from "../../api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TestModal from "./TestModal";

export default function PackageModal({ pkg = {}, onClose }) {
  const qc = useQueryClient();
  const [showTestModal, setShowTestModal] = useState(false);

  const [form, setForm] = useState({
    name: pkg.name || "",
    price: pkg.price || "",
    description: pkg.description || "",
    validityDays: pkg.validityDays || "",
    category: pkg.category || "",
    imageUrl: pkg.imageUrl || "",
    active: pkg.active ?? true
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (pkg.id) {
        return (await api.put(`/packages/${pkg.id}`, form)).data;
      }
      return (await api.post("/packages", form)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages"] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="card p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold">
          {pkg.id ? "Edit Package" : "Add Package"}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Price</label>
            <input
              className="input"
              value={form.price}
              onChange={(e) => update("price", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm">Validity (days)</label>
            <input
              className="input"
              value={form.validityDays}
              onChange={(e) => update("validityDays", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm">Category</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm">Image URL</label>
            <input
              className="input"
              value={form.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm">Description</label>
            <textarea
              className="input"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Active</label>
            <select
              className="select"
              value={String(form.active)}
              onChange={(e) => update("active", e.target.value === "true")}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        {/* TESTS */}
        {pkg.id && (
          <div className="space-y-2 mt-4">
            <div className="flex justify-between">
              <div className="font-semibold">Included Tests</div>
              <button
                className="btn bg-blue-600 text-white"
                onClick={() => setShowTestModal(true)}>
                + Add Test
              </button>
            </div>

            {pkg.tests?.length ? (
              <ul className="list-disc ml-6 text-sm">
                {pkg.tests.map((t) => (
                  <li key={t.id}>
                    {t.testName} — ₹{t.price ?? "—"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No tests added yet.</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn bg-slate-900 text-white"
            onClick={() => save.mutate()}>
            Save
          </button>
        </div>

        {showTestModal && (
          <TestModal
            packageId={pkg.id}
            onClose={() => setShowTestModal(false)}
          />
        )}
      </div>
    </div>
  );
}
