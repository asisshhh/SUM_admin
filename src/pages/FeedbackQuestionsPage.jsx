import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { MessageSquare, Plus, Edit2, Trash2, Eye, X, Save } from "lucide-react";
import { toast } from "react-toastify";

export default function FeedbackQuestionsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    search: "",
    active: "all"
  });

  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    question: "",
    active: true,
    displayOrder: 0
  });

  // Fetch feedback questions
  const { data, isLoading, error } = useQuery({
    queryKey: ["feedback-questions", filters],
    queryFn: async () => {
      const params = {};
      if (filters.search) params.search = filters.search;
      // Only filter by active if explicitly set, otherwise get all
      if (filters.active !== "all") {
        params.active = filters.active === "true";
      }
      params.page = filters.page;
      params.pageSize = filters.pageSize;
      // Include deleted items if needed (some APIs use includeDeleted)
      // params.includeDeleted = true;
      const response = await api.get("/feedback-questions", { params });
      // Log response for debugging (only in development)
      if (process.env.NODE_ENV === "development") {
        console.log("Feedback questions API response:", response.data);
      }
      return response.data;
    },
    refetchOnWindowFocus: true
  });

  // Handle different response structures
  const items = useMemo(() => {
    if (!data) return [];
    // If data is an array, return it directly
    if (Array.isArray(data)) return data;
    // If data has questions property (API returns {success: true, questions: [...]})
    if (data.questions && Array.isArray(data.questions)) return data.questions;
    // If data has items property, use it
    if (data.items && Array.isArray(data.items)) return data.items;
    // If data has data property (nested), use it
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  const total = useMemo(() => {
    if (!data) return 0;
    // If data is an array, return its length
    if (Array.isArray(data)) return data.length;
    // If data has questions property, return questions length
    if (data.questions && Array.isArray(data.questions)) return data.questions.length;
    // If data has total property, use it
    if (typeof data.total === "number") return data.total;
    // If data has count property, use it
    if (typeof data.count === "number") return data.count;
    // If data has items, return items length
    if (data.items && Array.isArray(data.items)) return data.items.length;
    return 0;
  }, [data]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/feedback-questions", data);
      console.log("Create question response:", response.data);
      return response.data;
    },
    onSuccess: (newQuestion) => {
      // Invalidate and refetch
      qc.invalidateQueries({ queryKey: ["feedback-questions"] });
      // Also refetch active questions used in feedback page
      qc.invalidateQueries({ queryKey: ["feedback-questions-active"] });
      toast.success("Question created successfully");
      setEditing(null);
      setFormData({ question: "", active: true, displayOrder: 0 });
    },
    onError: (err) => {
      console.error("Create question error:", err);
      toast.error(err.response?.data?.error || "Failed to create question");
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/feedback-questions/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback-questions"] });
      qc.invalidateQueries({ queryKey: ["feedback-questions-active"] });
      toast.success("Question updated successfully");
      setEditing(null);
      setFormData({ question: "", active: true, displayOrder: 0 });
    },
    onError: (err) => {
      console.error("Update question error:", err);
      toast.error(err.response?.data?.error || "Failed to update question");
    }
  });

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/feedback-questions/${id}`);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback-questions"] });
      qc.invalidateQueries({ queryKey: ["feedback-questions-active"] });
      toast.success("Question deleted successfully");
    },
    onError: (err) => {
      console.error("Delete question error:", err);
      toast.error(err.response?.data?.error || "Failed to delete question");
    }
  });

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setFilters((f) => ({ ...f, page }));
  }, []);

  const handleCreate = useCallback(() => {
    setEditing({});
    setFormData({ question: "", active: true, displayOrder: 0 });
  }, []);

  const handleEdit = useCallback((question) => {
    setEditing(question);
    setFormData({
      question: question.question || question.text || "",
      active: question.active !== false,
      displayOrder: question.displayOrder || 0
    });
  }, []);

  const handleCancel = useCallback(() => {
    setEditing(null);
    setFormData({ question: "", active: true, displayOrder: 0 });
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const payload = {
        question: formData.question,
        active: formData.active,
        displayOrder: Number(formData.displayOrder) || 0
      };

      if (editing?.id) {
        updateMutation.mutate({ id: editing.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    },
    [formData, editing, createMutation, updateMutation]
  );

  const handleDelete = useCallback(
    async (question) => {
      const ok = await confirm({
        title: "Delete Question",
        message: `Are you sure you want to delete "${question.question || question.text || "this question"}"?`,
        danger: true
      });
      if (ok) deleteMutation.mutate(question.id);
    },
    [confirm, deleteMutation]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl">
            <MessageSquare className="text-violet-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Feedback Questions
            </h1>
            <p className="text-sm text-slate-500">
              Manage feedback questions for ratings
            </p>
          </div>
        </div>
        {!editing && (
          <button
            className="btn bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2"
            onClick={handleCreate}>
            <Plus size={18} />
            Create Question
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {editing !== null && (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {editing.id ? "Edit Question" : "Create Question"}
            </h2>
            <button
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">
                Question Text *
              </label>
              <textarea
                className="input min-h-[100px]"
                value={formData.question}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, question: e.target.value }))
                }
                placeholder="Enter question text..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">
                  Display Order
                </label>
                <input
                  type="number"
                  className="input"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      displayOrder: e.target.value
                    }))
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Status</label>
                <select
                  className="select"
                  value={formData.active ? "true" : "false"}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      active: e.target.value === "true"
                    }))
                  }>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="btn bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2"
                disabled={createMutation.isPending || updateMutation.isPending}>
                <Save size={18} />
                {editing.id ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn border border-slate-300 text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-600 mb-1 block">Search</label>
            <input
              className="input pr-8"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search questions..."
            />
          </div>
          <div className="min-w-[120px]">
            <label className="text-sm text-slate-600 mb-1 block">Status</label>
            <select
              name="active"
              className="select"
              value={filters.active}
              onChange={handleFilterChange}>
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2" />
            Loading questions...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <MessageSquare className="mx-auto mb-2 text-red-300" size={40} />
            <p>Error loading questions</p>
            <p className="text-sm mt-1">
              {error.response?.data?.error || error.message || "Unknown error"}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <MessageSquare className="mx-auto mb-2 text-slate-300" size={40} />
            <p>No questions found</p>
            <p className="text-sm mt-1">
              {filters.search || filters.active !== "all"
                ? "Try adjusting your filters."
                : "Create a new question to get started."}
            </p>
            {process.env.NODE_ENV === "development" && data && (
              <p className="text-xs mt-2 text-slate-400">
                Debug: Received {JSON.stringify(data).substring(0, 100)}...
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">
                  Question
                </th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">
                  Display Order
                </th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-800">
                      {q.question || q.text || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm text-slate-600">
                      {q.displayOrder || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        q.active !== false
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {q.active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(q)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4">
          <div className="text-sm text-slate-600">
            Page {filters.page} of {Math.ceil(total / filters.pageSize) || 1}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={filters.page <= 1}
              onClick={() => handlePageChange(filters.page - 1)}>
              Previous
            </button>
            <button
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={filters.page >= Math.ceil(total / filters.pageSize)}
              onClick={() => handlePageChange(filters.page + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

