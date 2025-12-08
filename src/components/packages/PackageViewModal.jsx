import React from "react";
import { Package, X, Star, Sparkles, Clock, Beaker, FileText, IndianRupee, FlaskConical, Calendar } from "lucide-react";

function PackageViewModal({ pkg, onClose }) {
  if (!pkg) return null;

  const savings = pkg.price && pkg.discountPrice
    ? (pkg.price - pkg.discountPrice).toFixed(0)
    : null;

  const tests = pkg.tests || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-4">
            {pkg.imageUrl ? (
              <img src={pkg.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-white/30" />
            ) : (
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="text-white" size={28} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{pkg.name}</h2>
              {pkg.shortDesc && (
                <p className="text-white/80 text-sm mt-0.5">{pkg.shortDesc}</p>
              )}
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
              pkg.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {pkg.active ? "Active" : "Inactive"}
            </span>
            {pkg.popular && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium flex items-center gap-1">
                <Star size={14} /> Popular
              </span>
            )}
            {pkg.featured && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1">
                <Sparkles size={14} /> Featured
              </span>
            )}
          </div>

          {/* Pricing Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <IndianRupee size={16} /> Pricing
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Price</p>
                <p className="text-2xl font-bold text-slate-800">₹{pkg.price?.toLocaleString()}</p>
              </div>
              {pkg.discountPrice && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Discount Price</p>
                  <p className="text-2xl font-bold text-green-600">₹{pkg.discountPrice?.toLocaleString()}</p>
                </div>
              )}
              {pkg.mrp && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">MRP</p>
                  <p className="text-xl text-slate-400 line-through">₹{pkg.mrp?.toLocaleString()}</p>
                </div>
              )}
              {pkg.validityDays && (
                <div>
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <Calendar size={12} /> Validity
                  </p>
                  <p className="text-xl font-semibold text-slate-700">{pkg.validityDays} days</p>
                </div>
              )}
            </div>
            {savings && (
              <p className="mt-3 text-sm text-green-700 font-medium">
                💸 Customer saves ₹{savings} ({((savings / pkg.price) * 100).toFixed(0)}% off)
              </p>
            )}
          </div>

          {/* Included Tests */}
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-emerald-50 border-b p-4">
              <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                <FlaskConical size={16} />
                Included Lab Tests ({tests.length})
              </h3>
            </div>
            {tests.length > 0 ? (
              <div className="max-h-60 overflow-y-auto divide-y">
                {tests.map((t, idx) => {
                  const testData = t.test || t;
                  return (
                    <div key={t.testId || t.id || idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-medium text-slate-800">{testData.name || `Test #${t.testId || t.id}`}</p>
                        {testData.code && (
                          <p className="text-xs text-slate-500 font-mono">{testData.code}</p>
                        )}
                      </div>
                      {testData.price && (
                        <span className="text-sm text-slate-600">₹{testData.price?.toLocaleString()}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">
                No tests included in this package
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {pkg.sampleType && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Beaker size={12} /> Sample Type
                </p>
                <p className="font-medium">{pkg.sampleType}</p>
              </div>
            )}
            {pkg.reportTime && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Clock size={12} /> Report Time
                </p>
                <p className="font-medium">{pkg.reportTime}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {pkg.description && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <FileText size={12} /> Description
              </p>
              <p className="text-slate-700 whitespace-pre-wrap">{pkg.description}</p>
            </div>
          )}

          {/* Preparation */}
          {pkg.preparation && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-xs text-amber-700 mb-2 font-medium">⚠️ Preparation Required</p>
              <p className="text-amber-800">{pkg.preparation}</p>
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

export default React.memo(PackageViewModal);

