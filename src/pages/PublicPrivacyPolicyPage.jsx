// PublicPrivacyPolicyPage.jsx — Public page to view privacy policy (no login required)
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import api from "../api/client";
import logo from "../assets/logo.webp";

// Create a separate API client for public routes (no auth token)
const publicApi = {
  get: async (url) => {
    const baseURL =
      import.meta.env.VITE_API_URL?.replace("/api/admin", "") ||
      "http://localhost:4000";
    const response = await fetch(`${baseURL}/api${url}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { data: await response.json() };
  }
};

export default function PublicPrivacyPolicyPage() {
  const navigate = useNavigate();

  // Fetch privacy policy (public, no auth required)
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-privacy-policy"],
    queryFn: async () => {
      const response = await publicApi.get("/privacy-policy");
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src={logo}
            alt="SUM Ultimate Medicare"
            className="h-16 w-auto object-contain opacity-50"
          />
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <p className="text-slate-600">Loading privacy policy...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src={logo}
                alt="SUM Ultimate Medicare"
                className="h-16 w-auto object-contain opacity-50"
              />
            </div>
            <FileText className="mx-auto text-slate-400 mb-4" size={48} />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Unable to Load Privacy Policy
            </h2>
            <p className="text-slate-600 mb-4">
              We're sorry, but we couldn't load the privacy policy at this time.
              Please try again later.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const content = data?.content || "";
  const lastUpdated = data?.lastUpdated;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Logo Section */}
          <div className="flex justify-center mb-6">
            <img
              src={logo}
              alt="SUM Ultimate Medicare"
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/login")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="text-slate-600" size={20} />
              </button>
              <div className="flex items-center gap-2">
                <FileText className="text-blue-600" size={24} />
                <h1 className="text-xl font-bold text-slate-800">
                  Privacy Policy
                </h1>
              </div>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium">
              Back to Login
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {!content ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto text-slate-300 mb-4" size={64} />
              <h2 className="text-xl font-semibold text-slate-600 mb-2">
                Privacy Policy Not Available
              </h2>
              <p className="text-slate-500">
                The privacy policy content has not been set up yet. Please check
                back later.
              </p>
            </div>
          ) : (
            <>
              {lastUpdated && (
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <p className="text-xs text-slate-500">
                    Last updated:{" "}
                    {new Date(lastUpdated).toLocaleString("en-IN", {
                      dateStyle: "long",
                      timeStyle: "short"
                    })}
                  </p>
                </div>
              )}
              <div className="p-6 sm:p-8">
                <div
                  className="prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
