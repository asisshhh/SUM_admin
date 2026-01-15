// DeleteAccountPage.jsx — Admin page to edit delete account policy
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { FileText, Save, Loader2, Scale, AlertCircle } from "lucide-react";

export default function DeleteAccountPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [content, setContent] = useState("");

  // Check if user is ADMIN or SUPER_ADMIN
  useEffect(() => {
    if (!authLoading) {
      const isAdmin = user?.role === "ADMIN";
      if (!isSuperAdmin && !isAdmin) {
        toast.error(
          "Access denied. Only administrators can manage delete account policy."
        );
        navigate("/");
      }
    }
  }, [user, isSuperAdmin, authLoading, navigate]);

  // Fetch current delete account policy
  const { data, isLoading, error } = useQuery({
    queryKey: ["delete-account"],
    queryFn: async () => {
      const response = await api.get("/delete-account");
      return response.data;
    },
    enabled: !authLoading && (isSuperAdmin || user?.role === "ADMIN")
  });

  // Update content when data loads
  useEffect(() => {
    if (data?.content !== undefined) {
      setContent(data.content || "");
    }
  }, [data]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (newContent) => {
      const response = await api.put("/delete-account", {
        content: newContent
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Delete account policy updated successfully");
      qc.invalidateQueries({ queryKey: ["delete-account"] });
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error || "Failed to update delete account policy"
      );
    }
  });

  const handleSave = () => {
    if (!content.trim()) {
      toast.error("Delete account policy content cannot be empty");
      return;
    }
    updateMutation.mutate(content);
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check access - only ADMIN and SUPER_ADMIN
  const isAdmin = user?.role === "ADMIN";
  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Access Denied
            </h2>
            <p className="text-slate-600 mb-4">
              Only administrators can manage the delete account policy. Please contact
              your system administrator if you need access.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-600">Loading delete account policy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-700">
            Failed to load delete account policy. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Scale className="text-purple-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Delete Account Policy</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage and update the delete account policy content
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {updateMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileText className="text-purple-600 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900 mb-1">
              Delete Account Policy Management
            </h3>
            <p className="text-sm text-purple-700">
              This content will be displayed on the public delete account page.
              Users can view this page without logging in. You can use HTML
              formatting for better presentation.
            </p>
            {data?.lastUpdated && (
              <p className="text-xs text-purple-600 mt-2">
                Last updated:{" "}
                {new Date(data.lastUpdated).toLocaleString("en-IN", {
                  dateStyle: "long",
                  timeStyle: "short"
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Delete Account Policy Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter delete account policy content here. You can use HTML formatting..."
            className="w-full min-h-[500px] px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none text-slate-800 font-mono text-sm resize-y"
            style={{ fontFamily: "inherit" }}
          />
          <p className="text-xs text-slate-500 mt-2">
            Tip: Use HTML tags like &lt;p&gt;, &lt;h1&gt;, &lt;ul&gt;,
            &lt;li&gt; for formatting. The content will be rendered as HTML on
            the public page.
          </p>
        </div>
      </div>

      {/* Preview Section */}
      {content && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Preview
            </h3>
            <div
              className="prose max-w-none border border-slate-200 rounded-lg p-6 bg-slate-50 min-h-[200px]"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      )}

      <ToastContainer position="top-right" />
    </div>
  );
}

