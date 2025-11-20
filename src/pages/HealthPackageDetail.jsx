import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import TestModal from "../components/health-package/TestModal";
import PackageModal from "../components/health-package/PackageModal";

export default function HealthPackageDetail() {
  const { id } = useParams();
  const qc = useQueryClient();

  const [showEdit, setShowEdit] = useState(false);
  const [showTestModal, setShowTestModal] = useState(null); // test or null
  const [editingTest, setEditingTest] = useState(null);

  /** Fetch package with tests */
  const query = useQuery({
    queryKey: ["package", id],
    queryFn: async () => (await api.get(`/packages/${id}`)).data
  });

  const pkg = query.data;

  const deleteTest = useMutation({
    mutationFn: async (testId) =>
      (await api.delete(`/packages/${id}/tests/${testId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["package", id] })
  });

  if (!pkg) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">{pkg.name}</h1>

        <button
          className="btn bg-blue-600 text-white"
          onClick={() => setShowEdit(true)}>
          Edit Package
        </button>
      </div>

      {/* PACKAGE INFO */}
      <div className="card p-4 grid md:grid-cols-3 gap-4">
        {pkg.imageUrl ? (
          <img
            src={pkg.imageUrl}
            alt="package"
            className="w-full rounded-lg shadow-md"
          />
        ) : (
          <div className="bg-slate-200 rounded h-40 flex items-center justify-center">
            No Image
          </div>
        )}

        <div className="col-span-2 space-y-2">
          <div>
            <div className="text-sm text-slate-500">Description</div>
            <div className="font-medium">{pkg.description || "—"}</div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-slate-500">Price</div>
              <div className="font-semibold">₹{pkg.price}</div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Validity</div>
              <div className="font-semibold">
                {pkg.validityDays ?? "—"} days
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Category</div>
              <div className="font-semibold">{pkg.category || "—"}</div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Status</div>
              <span
                className={`badge ${
                  pkg.active
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                {pkg.active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TEST LIST */}
      <div className="card p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">Included Tests</h2>

          <button
            className="btn bg-blue-600 text-white"
            onClick={() => {
              setEditingTest(null);
              setShowTestModal(true);
            }}>
            + Add Test
          </button>
        </div>

        {pkg.tests?.length === 0 && (
          <div className="text-slate-500 text-sm">No tests added yet.</div>
        )}

        {pkg.tests?.length > 0 && (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Test Name</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Normal Range</th>
                  <th className="p-3 text-left">Price</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {pkg.tests.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3">{t.testName}</td>
                    <td className="p-3">{t.testCategory || "—"}</td>
                    <td className="p-3">{t.normalRange || "—"}</td>
                    <td className="p-3">₹{t.price ?? "—"}</td>
                    <td className="p-3">{t.description || "—"}</td>

                    <td className="p-3 flex gap-2">
                      <button
                        className="btn"
                        onClick={() => {
                          setEditingTest(t);
                          setShowTestModal(true);
                        }}>
                        Edit
                      </button>

                      <button
                        className="btn bg-red-600 text-white"
                        onClick={() => deleteTest.mutate(t.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PACKAGE EDIT MODAL */}
      {showEdit && (
        <PackageModal pkg={pkg} onClose={() => setShowEdit(false)} />
      )}

      {/* ADD / EDIT TEST MODAL */}
      {showTestModal && (
        <TestModal
          packageId={id}
          existingTest={editingTest}
          onClose={() => setShowTestModal(false)}
        />
      )}
    </div>
  );
}
