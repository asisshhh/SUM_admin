import React, { useState } from "react";
import api from "../../api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function TestModal({ packageId, existingTest, onClose }) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    testName: existingTest?.testName || "",
    testCategory: existingTest?.testCategory || "",
    description: existingTest?.description || "",
    price: existingTest?.price || "",
    normalRange: existingTest?.normalRange || ""
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (existingTest) {
        // Edit test
        return (
          await api.put(`/packages/${packageId}/tests/${existingTest.id}`, form)
        ).data;
      }
      // Add new test
      return (
        await api.post(`/packages/${packageId}/tests`, {
          ...form,
          price: Number(form.price)
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["package", packageId] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="card p-6 w-full max-w-lg space-y-4">
        <h2 className="text-lg font-semibold">
          {existingTest ? "Edit Test" : "Add Test"}
        </h2>

        <div className="grid gap-3">
          <div>
            <label className="text-sm">Test Name</label>
            <input
              className="input"
              value={form.testName}
              onChange={(e) => update("testName", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Category</label>
            <input
              className="input"
              value={form.testCategory}
              onChange={(e) => update("testCategory", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Price</label>
            <input
              className="input"
              type="number"
              value={form.price}
              onChange={(e) => update("price", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm">Normal Range</label>
            <input
              className="input"
              value={form.normalRange}
              onChange={(e) => update("normalRange", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Description</label>
            <textarea
              className="input"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
        </div>

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
      </div>
    </div>
  );
}
