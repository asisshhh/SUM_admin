// PrivacyPolicyPage.jsx — Admin page to edit privacy policy
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { FileText, Save, Loader2, Shield, AlertCircle } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          "Access denied. Only administrators can manage privacy policy."
        );
        navigate("/");
      }
    }
  }, [user, isSuperAdmin, authLoading, navigate]);

  // Fetch current privacy policy
  const { data, isLoading, error } = useQuery({
    queryKey: ["privacy-policy"],
    queryFn: async () => {
      const response = await api.get("/privacy-policy");
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
      const response = await api.put("/privacy-policy", {
        content: newContent
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Privacy policy updated successfully");
      qc.invalidateQueries({ queryKey: ["privacy-policy"] });
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error || "Failed to update privacy policy"
      );
    }
  });

  const handleSave = () => {
    if (!content.trim()) {
      toast.error("Privacy policy content cannot be empty");
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
              Only administrators can manage the privacy policy. Please contact
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
          <p className="text-slate-600">Loading privacy policy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-700">
            Failed to load privacy policy. Please try again.
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
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <FileText className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage and update the privacy policy content
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
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
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileText className="text-blue-600 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">
              Privacy Policy Management
            </h3>
            <p className="text-sm text-blue-700">
              This content will be displayed on the public privacy policy page.
              Users can view this page without logging in. You can use HTML
              formatting for better presentation.
            </p>
            {data?.lastUpdated && (
              <p className="text-xs text-blue-600 mt-2">
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
            Privacy Policy Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter privacy policy content here. You can use HTML formatting..."
            className="w-full min-h-[500px] px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-800 font-mono text-sm resize-y"
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
