import React from "react";
import {
  Home,
  X,
  Star,
  Sparkles,
  Clock,
  DollarSign,
  Check
} from "lucide-react";

function ServiceViewModal({ service, onClose }) {
  if (!service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-pink-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Home className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">{service.name}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {service.popular && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium flex items-center gap-1">
                <Star size={14} /> Popular
              </span>
            )}
            {service.featured && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1">
                <Sparkles size={14} /> Featured
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                service.active
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}>
              {service.active ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Description */}
          {service.shortDesc && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                Short Description
              </h3>
              <p className="text-slate-600">{service.shortDesc}</p>
            </div>
          )}

          {service.description && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                Description
              </h3>
              <p className="text-slate-600 whitespace-pre-wrap">
                {service.description}
              </p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <Clock size={16} />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <p className="text-lg font-semibold text-slate-800">
                {service.duration} minutes
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <DollarSign size={16} />
                <span className="text-sm font-medium">Price</span>
              </div>
              <div>
                {service.discountPrice ? (
                  <div>
                    <p className="text-lg font-semibold text-emerald-600">
                      ₹{service.discountPrice.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500 line-through">
                      ₹{service.price.toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-slate-800">
                    ₹{service.price.toLocaleString()}
                  </p>
                )}
                {service.mrp && (
                  <p className="text-xs text-slate-500 mt-1">
                    MRP: ₹{service.mrp.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Category */}
          {service.category && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                Category
              </h3>
              <p className="text-slate-600">{service.category.name}</p>
            </div>
          )}

          {/* Requirements */}
          {service.requirements && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                Requirements
              </h3>
              <p className="text-slate-600 whitespace-pre-wrap">
                {service.requirements}
              </p>
            </div>
          )}

          {/* Images */}
          {(service.imageUrl || service.bannerUrl) && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Images
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {service.imageUrl && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Image</p>
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                {service.bannerUrl && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Banner</p>
                    <img
                      src={service.bannerUrl}
                      alt={service.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {service.bookingCount || 0}
              </p>
              <p className="text-xs text-slate-500">Bookings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {service.packageCount || 0}
              </p>
              <p className="text-xs text-slate-500">In Packages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {service.displayOrder || 0}
              </p>
              <p className="text-xs text-slate-500">Display Order</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServiceViewModal;
