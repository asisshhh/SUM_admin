import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  Eye,
  PenLine,
  PlusCircle,
  Trash,
  RefreshCw,
  Database
} from "lucide-react";
import { toast } from "react-toastify";

const ROLES = ["ADMIN", "DOCTOR", "RECEPTIONIST", "DEPARTMENT_HEAD", "NURSE"];
const ROLE_LABELS = {
  ADMIN: "Admin",
  DOCTOR: "Doctor",
  RECEPTIONIST: "Receptionist",
  DEPARTMENT_HEAD: "Department Head",
  NURSE: "Nurse"
};

// Tab Component
const Tab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium text-sm rounded-lg transition ${
      active ? "bg-purple-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`}>
    {children}
  </button>
);

// Permission Checkbox
const PermCheckbox = ({ checked, onChange, disabled }) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`w-6 h-6 rounded flex items-center justify-center transition ${
      disabled
        ? "bg-slate-100 cursor-not-allowed"
        : checked
        ? "bg-green-500 text-white"
        : "bg-slate-200 hover:bg-slate-300"
    }`}>
    {checked && <Check size={14} />}
  </button>
);

// Page Modal
const PageModal = ({ page, onClose, onSuccess }) => {
  const isEdit = !!page?.id;
  const [formData, setFormData] = useState({
    name: page?.name || "",
    path: page?.path || "",
    icon: page?.icon || "",
    category: page?.category || "Main",
    sortOrder: page?.sortOrder || 0,
    isActive: page?.isActive !== false
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post("/role-management/pages", data),
    onSuccess: () => {
      toast.success(isEdit ? "Page updated" : "Page created");
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed")
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? "Edit Page" : "Add Page"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} className="text-white" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ ...formData, id: page?.id });
          }}
          className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Path *
            </label>
            <input
              type="text"
              value={formData.path}
              onChange={(e) =>
                setFormData({ ...formData, path: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              placeholder="/page-path"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg">
                <option value="Main">Main</option>
                <option value="Clinical">Clinical</option>
                <option value="Ambulance">Ambulance</option>
                <option value="Lab">Lab</option>
                <option value="Home Healthcare">Home Healthcare</option>
                <option value="Content">Content</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt(e.target.value) || 0
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Icon
            </label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) =>
                setFormData({ ...formData, icon: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              placeholder="LayoutDashboard"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-4 h-4 text-purple-600 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Role Permissions Section
const RolePermissionsSection = ({ pages, permissions, onRefresh }) => {
  const [expandedRoles, setExpandedRoles] = useState(new Set(["ADMIN"]));
  const [editingRole, setEditingRole] = useState(null);
  const [editedPermissions, setEditedPermissions] = useState({});

  const bulkMutation = useMutation({
    mutationFn: ({ role, permissions }) =>
      api.put("/role-management/permissions/bulk", { role, permissions }),
    onSuccess: () => {
      toast.success("Permissions saved");
      setEditingRole(null);
      setEditedPermissions({});
      onRefresh();
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed")
  });

  const toggleRole = (role) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const startEditing = (role) => {
    const rolePerms = permissions.byRole?.[role] || [];
    const permsMap = {};
    pages.forEach((page) => {
      const existing = rolePerms.find((p) => p.pageId === page.id);
      permsMap[page.id] = {
        pageId: page.id,
        canView: existing?.canView || false,
        canCreate: existing?.canCreate || false,
        canEdit: existing?.canEdit || false,
        canDelete: existing?.canDelete || false
      };
    });
    setEditedPermissions(permsMap);
    setEditingRole(role);
  };

  const togglePerm = (pageId, field) => {
    setEditedPermissions((prev) => ({
      ...prev,
      [pageId]: { ...prev[pageId], [field]: !prev[pageId][field] }
    }));
  };

  return (
    <div className="space-y-4">
      {ROLES.map((role) => {
        const isExpanded = expandedRoles.has(role);
        const isEditing = editingRole === role;
        const rolePerms = isEditing
          ? editedPermissions
          : Object.fromEntries(
              (permissions.byRole?.[role] || []).map((p) => [p.pageId, p])
            );

        return (
          <div
            key={role}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50"
              onClick={() => !isEditing && toggleRole(role)}>
              <div className="flex items-center gap-3">
                <button
                  className={`p-1 rounded ${
                    isExpanded ? "bg-purple-100" : ""
                  }`}>
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-purple-600" />
                  ) : (
                    <ChevronRight size={18} className="text-slate-400" />
                  )}
                </button>
                <Shield size={18} className="text-purple-600" />
                <span className="font-medium text-slate-900">
                  {ROLE_LABELS[role]}
                </span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {
                    (permissions.byRole?.[role] || []).filter((p) => p.canView)
                      .length
                  }{" "}
                  pages
                </span>
              </div>
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}>
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setEditingRole(null);
                        setEditedPermissions({});
                      }}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                      Cancel
                    </button>
                    <button
                      onClick={() =>
                        bulkMutation.mutate({
                          role,
                          permissions: Object.values(editedPermissions)
                        })
                      }
                      disabled={bulkMutation.isPending}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                      <Save size={14} /> Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startEditing(role)}
                    className="px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg flex items-center gap-1">
                    <Edit size={14} /> Edit
                  </button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">
                        Page
                      </th>
                      <th className="px-4 py-2 text-center font-medium text-slate-600 w-20">
                        <Eye size={14} className="inline" /> View
                      </th>
                      <th className="px-4 py-2 text-center font-medium text-slate-600 w-20">
                        <PlusCircle size={14} className="inline" /> Create
                      </th>
                      <th className="px-4 py-2 text-center font-medium text-slate-600 w-20">
                        <PenLine size={14} className="inline" /> Edit
                      </th>
                      <th className="px-4 py-2 text-center font-medium text-slate-600 w-20">
                        <Trash size={14} className="inline" /> Delete
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      "Main",
                      "Clinical",
                      "Ambulance",
                      "Lab",
                      "Home Healthcare",
                      "Content",
                      "Admin"
                    ].map((cat) => {
                      const catPages = pages.filter((p) => p.category === cat);
                      if (!catPages.length) return null;
                      return (
                        <React.Fragment key={cat}>
                          <tr className="bg-slate-100">
                            <td
                              colSpan={5}
                              className="px-4 py-1.5 text-xs font-semibold text-slate-500 uppercase">
                              {cat}
                            </td>
                          </tr>
                          {catPages.map((page) => {
                            const perm = rolePerms[page.id] || {};
                            return (
                              <tr
                                key={page.id}
                                className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-2">
                                  <span className="text-slate-700">
                                    {page.name}
                                  </span>
                                  <span className="text-xs text-slate-400 ml-2">
                                    {page.path}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex justify-center">
                                    <PermCheckbox
                                      checked={perm.canView}
                                      onChange={() =>
                                        togglePerm(page.id, "canView")
                                      }
                                      disabled={!isEditing}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex justify-center">
                                    <PermCheckbox
                                      checked={perm.canCreate}
                                      onChange={() =>
                                        togglePerm(page.id, "canCreate")
                                      }
                                      disabled={!isEditing}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex justify-center">
                                    <PermCheckbox
                                      checked={perm.canEdit}
                                      onChange={() =>
                                        togglePerm(page.id, "canEdit")
                                      }
                                      disabled={!isEditing}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex justify-center">
                                    <PermCheckbox
                                      checked={perm.canDelete}
                                      onChange={() =>
                                        togglePerm(page.id, "canDelete")
                                      }
                                      disabled={!isEditing}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function RoleManagementPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState("permissions");
  const [pageModal, setPageModal] = useState({ open: false, page: null });

  const {
    data: pagesData,
    isLoading,
    refetch: refetchPages
  } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => (await api.get("/role-management/pages")).data
  });

  const { data: permissionsData, refetch: refetchPermissions } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => (await api.get("/role-management/permissions")).data
  });

  const pages = pagesData?.pages || [];
  const permissions = permissionsData || { permissions: [], byRole: {} };

  const seedMutation = useMutation({
    mutationFn: () => api.post("/role-management/seed-pages"),
    onSuccess: (res) => {
      toast.success(res.data.message);
      refetchPages();
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed")
  });

  const initMutation = useMutation({
    mutationFn: () => api.post("/role-management/init-permissions"),
    onSuccess: (res) => {
      toast.success(res.data.message);
      refetchPermissions();
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/role-management/pages/${id}`),
    onSuccess: () => {
      toast.success("Deleted");
      refetchPages();
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed")
  });

  const handleDelete = async (page) => {
    const ok = await confirm({
      title: "Delete Page",
      message: `Delete "${page.name}"?`,
      danger: true
    });
    if (ok) deleteMutation.mutate(page.id);
  };

  const handleRefresh = () => {
    refetchPages();
    refetchPermissions();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Shield className="text-purple-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Role Management
            </h1>
            <p className="text-sm text-slate-500">
              Manage page access for each role
            </p>
          </div>
        </div>
        {/* <div className="flex items-center gap-2">
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1">
            <Database size={16} /> Seed Pages
          </button>
          <button
            onClick={() => initMutation.mutate()}
            disabled={initMutation.isPending}
            className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1">
            <RefreshCw size={16} /> Init Permissions
          </button>
        </div> */}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        <Tab
          active={activeTab === "permissions"}
          onClick={() => setActiveTab("permissions")}>
          <Shield size={16} className="inline mr-2" />
          Role Permissions
        </Tab>
        <Tab
          active={activeTab === "pages"}
          onClick={() => setActiveTab("pages")}>
          <Edit size={16} className="inline mr-2" />
          Admin Pages
        </Tab>
      </div>

      {/* Permissions Tab */}
      {activeTab === "permissions" && (
        <RolePermissionsSection
          pages={pages}
          permissions={permissions}
          onRefresh={handleRefresh}
        />
      )}

      {/* Pages Tab */}
      {activeTab === "pages" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium text-slate-800">Admin Pages</h3>
            <button
              onClick={() => setPageModal({ open: true, page: null })}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-1">
              <Plus size={16} /> Add Page
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Path
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">
                    Order
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : pages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500">
                      No pages. Click "Seed Pages" to initialize.
                    </td>
                  </tr>
                ) : (
                  pages.map((page) => (
                    <tr
                      key={page.id}
                      className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {page.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{page.path}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                          {page.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {page.sortOrder}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            page.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                          {page.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPageModal({ open: true, page })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(page)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {pageModal.open && (
        <PageModal
          page={pageModal.page}
          onClose={() => setPageModal({ open: false, page: null })}
          onSuccess={() => refetchPages()}
        />
      )}
    </div>
  );
}
