import React from "react";
import { FlaskConical, X, Home, Star, Clock, Beaker, FileText, IndianRupee } from "lucide-react";

function LabTestViewModal({ test, onClose }) {
  if (!test) return null;

  const savings = test.price && test.discountPrice
    ? (test.price - test.discountPrice).toFixed(0)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <FlaskConical className="text-white" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">{test.name}</h2>
              <span className="text-white/80 text-sm font-mono">{test.code}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              test.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {test.active ? "Active" : "Inactive"}
            </span>
            {test.homeCollection && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                <Home size={14} /> Home Collection
              </span>
            )}
            {test.popular && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium flex items-center gap-1">
                <Star size={14} /> Popular
              </span>
            )}
          </div>

          {/* Pricing Card */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
            <h3 className="text-sm font-semibold text-emerald-800 mb-4 flex items-center gap-2">
              <IndianRupee size={16} /> Pricing
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Price</p>
                <p className="text-2xl font-bold text-slate-800">₹{test.price?.toLocaleString()}</p>
              </div>
              {test.discountPrice && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Discount Price</p>
                  <p className="text-2xl font-bold text-emerald-600">₹{test.discountPrice?.toLocaleString()}</p>
                </div>
              )}
              {test.mrp && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">MRP</p>
                  <p className="text-xl text-slate-400 line-through">₹{test.mrp?.toLocaleString()}</p>
                </div>
              )}
            </div>
            {savings && (
              <p className="mt-3 text-sm text-green-700 font-medium">
                💸 Save ₹{savings} ({((savings / test.price) * 100).toFixed(0)}% off)
              </p>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {test.category && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Category</p>
                <p className="font-medium">{test.category.name}</p>
              </div>
            )}
            {test.turnaroundTime && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Clock size={12} /> Turnaround Time
                </p>
                <p className="font-medium">{test.turnaroundTime}</p>
              </div>
            )}
            {test.sampleType && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Beaker size={12} /> Sample Type
                </p>
                <p className="font-medium">{test.sampleType}</p>
              </div>
            )}
            {test.sampleVolume && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Sample Volume</p>
                <p className="font-medium">{test.sampleVolume}</p>
              </div>
            )}
            {test.normalRange && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Normal Range</p>
                <p className="font-medium">{test.normalRange} {test.unit}</p>
              </div>
            )}
            {test.method && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Method</p>
                <p className="font-medium">{test.method}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {test.description && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <FileText size={12} /> Description
              </p>
              <p className="text-slate-700">{test.description}</p>
            </div>
          )}

          {/* Preparation */}
          {test.preparation && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-xs text-amber-700 mb-2 font-medium">⚠️ Preparation Required</p>
              <p className="text-amber-800">{test.preparation}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-2xl flex-shrink-0">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LabTestViewModal);

