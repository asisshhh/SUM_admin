// PublicDeleteAccountPage.jsx — Public page to view delete account policy (no login required)
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Loader2 } from "lucide-react";
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

export default function PublicDeleteAccountPage() {
  // Fetch delete account policy (public, no auth required)
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-delete-account"],
    queryFn: async () => {
      const response = await publicApi.get("/delete-account");
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
            <Loader2 className="animate-spin text-red-600" size={32} />
            <p className="text-slate-600">Loading delete account policy...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="text-red-600" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Error Loading Policy
          </h2>
          <p className="text-slate-600 mb-4">
            Failed to load delete account policy. Please try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
            Retry
          </button>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Delete Account Policy
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Information about account deletion
                </p>
              </div>
            </div>
            <a
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
              Back to Login
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {!content ? (
            <div className="p-12 text-center">
              <Trash2 className="mx-auto text-slate-300 mb-4" size={64} />
              <h2 className="text-xl font-semibold text-slate-600 mb-2">
                Delete Account Policy Not Available
              </h2>
              <p className="text-slate-500">
                The delete account policy content has not been set up yet. Please
                check back later.
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
      </div>
    </div>
  );
}

