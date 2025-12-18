import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import BannerModal from "../components/banner/BannerModal";
import api from "../api/client";
import { usePagePermissions } from "../hooks/usePagePermissions";
import {
  Image,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowUpDown,
  ExternalLink,
  Navigation,
  Calendar,
  Users,
  CheckCircle,
  XCircle
} from "lucide-react";
import { toast } from "react-toastify";
import { useConfirm } from "../contexts/ConfirmContext";

export default function BannersPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { canCreate, canEdit, canDelete } = usePagePermissions();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const {
    data: banners,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => (await api.get("/banners")).data.items
  });

  const del = useMutation({
    mutationFn: async (id) => await api.delete(`/banners/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(["banners"]);
      toast.success("Banner deleted successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to delete banner");
    }
  });

  const handleDelete = useCallback(
    async (banner) => {
      const ok = await confirm({
        title: "Delete Banner",
        message: `Are you sure you want to delete "${
          banner.title || "this banner"
        }"? This action cannot be undone.`,
        danger: true
      });
      if (ok) del.mutate(banner.id);
    },
    [confirm, del]
  );

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case "navigation":
        return <Navigation size={16} className="text-blue-600" />;
      case "external_link":
        return <ExternalLink size={16} className="text-purple-600" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      PATIENT: "bg-blue-100 text-blue-700",
      DOCTOR: "bg-emerald-100 text-emerald-700",
      ADMIN: "bg-purple-100 text-purple-700",
      RECEPTIONIST: "bg-orange-100 text-orange-700"
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
          colors[role] || "bg-slate-100 text-slate-700"
        }`}>
        <Users size={12} />
        {role}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-200">
                <Image className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Home Screen Banners
                </h1>
                <p className="text-sm text-slate-500">
                  Manage promotional banners and announcements
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
              onClick={() => refetch()}>
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
            {canCreate && (
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-pink-700 shadow-lg shadow-pink-200/50 transition-all"
                onClick={() => setAdding(true)}>
                <Plus size={18} />
                Add Banner
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {banners && banners.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Total Banners</div>
              <div className="text-2xl font-bold text-slate-800">
                {banners.length}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Active</div>
              <div className="text-2xl font-bold text-emerald-600">
                {banners.filter((b) => b.active).length}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Inactive</div>
              <div className="text-2xl font-bold text-slate-400">
                {banners.filter((b) => !b.active).length}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">For Patients</div>
              <div className="text-2xl font-bold text-blue-600">
                {banners.filter((b) => b.targetUserRole === "PATIENT").length}
              </div>
            </div>
          </div>
        )}

        {/* Banners Grid */}
        {!banners || banners.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 p-12 text-center">
            <Image className="mx-auto text-slate-300 mb-4" size={64} />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              No Banners Yet
            </h3>
            <p className="text-slate-500 mb-6">
              Get started by creating your first promotional banner
            </p>
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-pink-700 shadow-lg shadow-pink-200/50 transition-all">
              <Plus size={18} />
              Add Your First Banner
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                {/* Banner Image */}
                <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                  {b.imageUrl ? (
                    <img
                      src={b.imageUrl}
                      alt={b.title || "Banner"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="text-slate-300" size={48} />
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {b.active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-500 text-white rounded-full shadow-lg">
                        <Eye size={12} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-500 text-white rounded-full shadow-lg">
                        <EyeOff size={12} />
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner Content */}
                <div className="p-5 space-y-4">
                  {/* Title */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1 line-clamp-1">
                      {b.title || "Untitled Banner"}
                    </h3>
                    {b.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {b.description}
                      </p>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-2">
                    {/* Action Type */}
                    {b.actionType !== "none" && (
                      <div className="flex items-center gap-2 text-sm">
                        {getActionIcon(b.actionType)}
                        <span className="text-slate-600 font-medium">
                          {b.actionType === "navigation"
                            ? "Navigation"
                            : "External Link"}
                        </span>
                        {b.actionValue && (
                          <span className="text-slate-400 text-xs">
                            → {b.actionValue}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Order */}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <ArrowUpDown size={14} className="text-slate-400" />
                      <span>Display Order: {b.positionOrder ?? "—"}</span>
                    </div>

                    {/* Role */}
                    <div className="flex items-center gap-2">
                      {getRoleBadge(b.targetUserRole)}
                    </div>

                    {/* Date Range */}
                    {(b.startDate || b.endDate) && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <Calendar size={12} />
                        <span>
                          {b.startDate
                            ? new Date(b.startDate).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                }
                              )
                            : "—"}{" "}
                          {b.endDate && (
                            <>
                              {" to "}
                              {new Date(b.endDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              })}
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      {canEdit && (
                        <button
                          onClick={() => setEditing(b)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <Edit size={14} />
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(b)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {(adding || editing) && (
          <BannerModal
            banner={editing}
            onClose={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
