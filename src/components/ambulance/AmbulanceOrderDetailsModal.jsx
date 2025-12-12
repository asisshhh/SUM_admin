import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import {
  Ambulance,
  XCircle,
  MapPin,
  Edit2,
  Save,
  X,
  DollarSign
} from "lucide-react";
import { toast } from "react-toastify";

const AmbulanceOrderDetailsModal = React.memo(
  function AmbulanceOrderDetailsModal({ booking, onClose, onUpdated }) {
    const qc = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedTypeId, setSelectedTypeId] = useState(
      booking?.ambulanceTypeId
    );
    const [selectedPricingIds, setSelectedPricingIds] = useState(
      booking?.selectedFeaturePricingIds || []
    );

    // Fetch full booking details with available features
    const { data: bookingData, isLoading } = useQuery({
      queryKey: ["ambulance-order", booking?.id],
      queryFn: async () => {
        const response = await api.get(`/ambulance-orders/${booking.id}`);
        return response.data;
      },
      enabled: !!booking?.id
    });

    const currentBooking = bookingData || booking;
    const availableFeatures = currentBooking?.availableFeatures || [];

    // Update local state when booking data changes
    useEffect(() => {
      if (currentBooking) {
        // Always keep the original ambulance type - cannot be changed
        setSelectedTypeId(currentBooking.ambulanceTypeId);
        // Normalize IDs to numbers to ensure proper comparison
        const pricingIds = (currentBooking.selectedFeaturePricingIds || []).map(
          (id) => Number(id)
        );
        setSelectedPricingIds(pricingIds);
      }
    }, [currentBooking]);

    // Always use available features from the booking (ambulance type cannot be changed)
    const displayFeatures = useMemo(() => {
      return availableFeatures;
    }, [availableFeatures]);

    // Calculate new initial amount
    const newInitialAmount = useMemo(() => {
      if (!selectedPricingIds.length) return 0;

      const allPricing = displayFeatures.flatMap((f) => f.pricing || []);
      const normalizedSelectedIds = selectedPricingIds.map((id) => Number(id));
      return allPricing
        .filter((p) => normalizedSelectedIds.includes(Number(p.id)))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    }, [selectedPricingIds, displayFeatures]);

    // Toggle pricing selection - only one pricing per feature allowed
    const togglePricing = (pricingId, featureId) => {
      setSelectedPricingIds((prev) => {
        // Normalize pricing ID
        const normalizedPricingId = Number(pricingId);
        const normalizedPrev = prev.map((id) => Number(id));

        // Find the feature that contains this pricing
        const feature = displayFeatures.find((f) =>
          f.pricing?.some((p) => Number(p.id) === normalizedPricingId)
        );

        if (!feature) return prev;

        // Get all pricing IDs for this feature (normalized)
        const featurePricingIds =
          feature.pricing?.map((p) => Number(p.id)) || [];

        // Remove all pricing IDs from this feature
        const withoutFeaturePricing = normalizedPrev.filter(
          (id) => !featurePricingIds.includes(id)
        );

        // If clicking the same pricing, deselect it; otherwise select the new one
        if (normalizedPrev.includes(normalizedPricingId)) {
          return withoutFeaturePricing;
        } else {
          return [...withoutFeaturePricing, normalizedPricingId];
        }
      });
    };

    // Clear all pricing for a specific feature
    const clearFeaturePricing = (featureId) => {
      setSelectedPricingIds((prev) => {
        const feature = displayFeatures.find((f) => f.id === featureId);
        if (!feature || !feature.pricing) return prev;

        const featurePricingIds = feature.pricing.map((p) => Number(p.id));
        const normalizedPrev = prev.map((id) => Number(id));
        return normalizedPrev.filter((id) => !featurePricingIds.includes(id));
      });
    };

    // Update booking mutation
    const updateMutation = useMutation({
      mutationFn: async (data) => {
        return await api.put(
          `/ambulance-orders/${booking.id}/update-booking`,
          data
        );
      },
      onSuccess: () => {
        toast.success("Booking updated successfully");
        qc.invalidateQueries(["ambulance-order", booking.id]);
        qc.invalidateQueries(["ambulance-orders"]);
        setIsEditing(false);
        if (onUpdated) onUpdated();
      },
      onError: (err) => {
        toast.error(err.response?.data?.error || "Failed to update booking");
      }
    });

    const handleSave = () => {
      if (selectedPricingIds.length === 0) {
        toast.error("Please select at least one pricing option");
        return;
      }

      // Only update pricing, not ambulance type (type cannot be changed)
      updateMutation.mutate({
        selectedFeaturePricingIds: selectedPricingIds
      });
    };

    const handleCancel = () => {
      setIsEditing(false);
      // Reset to original values
      setSelectedTypeId(currentBooking?.ambulanceTypeId);
      setSelectedPricingIds(currentBooking?.selectedFeaturePricingIds || []);
    };

    const formatDate = (date) => {
      if (!date) return "-";
      return new Date(date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      });
    };

    if (isLoading) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6">Loading...</div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Ambulance className="text-blue-600" size={24} />
              Order Details #{booking.id}
            </h2>
            <div className="flex items-center gap-2">
              {!isEditing &&
              currentBooking.status !== "COMPLETED" &&
              currentBooking.status !== "CANCELLED" ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Edit">
                  <Edit2 size={20} />
                </button>
              ) : isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isLoading}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                    title="Save">
                    <Save size={20} />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Cancel">
                    <X size={20} />
                  </button>
                </>
              ) : null}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <XCircle size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Order Information */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 mb-3">
                Order Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Patient:</span>
                  <span className="ml-2 font-medium">
                    {currentBooking.patientName ||
                      currentBooking.user?.name ||
                      "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Contact:</span>
                  <span className="ml-2 font-medium">
                    {currentBooking.contactNumber ||
                      currentBooking.user?.phone ||
                      "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>
                  <span className="ml-2 font-medium">
                    {currentBooking.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Approval:</span>
                  <span className="ml-2 font-medium">
                    {currentBooking.approved === null
                      ? "Pending"
                      : currentBooking.approved
                      ? "Approved"
                      : "Declined"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Initial Amount:</span>
                  <span className="ml-2 font-medium">
                    ₹
                    {isEditing
                      ? newInitialAmount
                      : currentBooking.initialAmount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Extra Amount:</span>
                  <span className="ml-2 font-medium">
                    ₹{currentBooking.extraAmount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="ml-2 font-bold text-green-600">
                    ₹
                    {currentBooking.totalAmount ||
                      currentBooking.initialAmount ||
                      0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Distance:</span>
                  <span className="ml-2 font-medium">
                    {currentBooking.totalDistance
                      ? `${currentBooking.totalDistance} km`
                      : "-"}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="text-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin className="text-green-600 mt-0.5" size={16} />
                    <div>
                      <div className="text-slate-500">Pickup:</div>
                      <div className="font-medium">
                        {currentBooking.pickupAddress}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="text-red-600 mt-0.5" size={16} />
                    <div>
                      <div className="text-slate-500">Destination:</div>
                      <div className="font-medium">
                        {currentBooking.destination}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            {currentBooking.payments && currentBooking.payments.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-800 mb-3">
                  Payment Information
                </h3>
                <div className="space-y-3">
                  {currentBooking.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-white border border-slate-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Amount:</span>
                          <span className="ml-2 font-bold text-green-600">
                            ₹{payment.amount?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Method:</span>
                          <span className="ml-2 font-medium">
                            {payment.method || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Status:</span>
                          <span
                            className={`ml-2 font-medium ${
                              payment.status === "SUCCESS"
                                ? "text-green-600"
                                : payment.status === "PENDING"
                                ? "text-yellow-600"
                                : payment.status === "FAILED"
                                ? "text-red-600"
                                : "text-slate-600"
                            }`}>
                            {payment.status || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Paid At:</span>
                          <span className="ml-2 font-medium">
                            {payment.paidAt
                              ? formatDate(payment.paidAt)
                              : payment.createdAt
                              ? formatDate(payment.createdAt)
                              : "-"}
                          </span>
                        </div>
                        {payment.notes && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Notes:</span>
                            <span className="ml-2 font-medium text-slate-700">
                              {payment.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">
                      Total Paid:
                    </span>
                    <span className="font-bold text-green-600">
                      ₹
                      {currentBooking.payments
                        .reduce((sum, p) => sum + (p.amount || 0), 0)
                        .toFixed(2)}
                    </span>
                  </div>
                  {currentBooking.totalAmount && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-slate-600 font-medium">
                        Total Required:
                      </span>
                      <span className="font-bold text-slate-800">
                        ₹{currentBooking.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {currentBooking.totalAmount &&
                    currentBooking.payments.reduce(
                      (sum, p) => sum + (p.amount || 0),
                      0
                    ) < currentBooking.totalAmount && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-slate-600 font-medium">
                          Remaining:
                        </span>
                        <span className="font-bold text-orange-600">
                          ₹
                          {(
                            currentBooking.totalAmount -
                            currentBooking.payments.reduce(
                              (sum, p) => sum + (p.amount || 0),
                              0
                            )
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Ambulance Type & Features Section */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">
                  Ambulance Type & Features
                </h3>
                {isEditing && (
                  <div className="text-xs text-blue-600 font-medium">
                    New Initial Amount: ₹{newInitialAmount.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Ambulance Type Selection - Read Only */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ambulance Type
                </label>
                <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                  {currentBooking.ambulanceType?.name || "N/A"} (
                  {currentBooking.ambulanceType?.code || "N/A"})
                  <span className="ml-2 text-xs text-slate-500 italic">
                    (Cannot be changed)
                  </span>
                </div>
              </div>

              {/* Features & Pricing */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Features & Pricing
                </label>
                {displayFeatures.length === 0 ? (
                  <div className="text-sm text-slate-500 text-center py-4">
                    No features available for this ambulance type
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayFeatures.map((feature) => {
                      // Check if any pricing is selected for this feature
                      const featurePricingIds =
                        feature.pricing?.map((p) => Number(p.id)) || [];
                      const hasSelectedPricing = featurePricingIds.some((id) =>
                        selectedPricingIds
                          .map((pid) => Number(pid))
                          .includes(id)
                      );

                      return (
                        <div
                          key={feature.id}
                          className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {feature.icon && (
                                <span className="text-xl">{feature.icon}</span>
                              )}
                              <h4 className="font-semibold text-slate-800">
                                {feature.name}
                              </h4>
                              {feature.description && (
                                <span className="text-xs text-slate-500">
                                  - {feature.description}
                                </span>
                              )}
                            </div>
                            {isEditing &&
                              feature.inlineui !== true &&
                              feature.pricing &&
                              hasSelectedPricing && (
                                <button
                                  onClick={() =>
                                    clearFeaturePricing(feature.id)
                                  }
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Clear all pricing for this feature">
                                  <X size={14} />
                                  Clear
                                </button>
                              )}
                          </div>
                          {feature.pricing && feature.pricing.length > 0 ? (
                            <div className="space-y-2 ml-6">
                              {feature.pricing.map((pricing) => {
                                // Normalize IDs to numbers for comparison
                                const pricingId = Number(pricing.id);
                                const isSelected = selectedPricingIds
                                  .map((id) => Number(id))
                                  .includes(pricingId);
                                return (
                                  <label
                                    key={pricing.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition ${
                                      feature.inlineui === true
                                        ? "cursor-default opacity-75"
                                        : "cursor-pointer"
                                    } ${
                                      isSelected
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                    } ${!isEditing ? "cursor-default" : ""}`}>
                                    <div className="flex items-center gap-3 flex-1">
                                      {isEditing && (
                                        <input
                                          type="radio"
                                          name={`feature-${feature.id}`}
                                          checked={isSelected}
                                          disabled={feature.inlineui === true}
                                          onChange={() =>
                                            feature.inlineui !== true &&
                                            togglePricing(
                                              pricing.id,
                                              feature.id
                                            )
                                          }
                                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                      )}
                                      <div className="flex-1">
                                        <div className="font-medium text-slate-800 text-sm">
                                          {pricing.name}
                                        </div>
                                        {pricing.description && (
                                          <div className="text-xs text-slate-500 mt-0.5">
                                            {pricing.description}
                                          </div>
                                        )}
                                        {(pricing.distanceFrom !== null ||
                                          pricing.distanceTo !== null) && (
                                          <div className="text-xs text-slate-400 mt-1">
                                            Distance:{" "}
                                            {pricing.distanceFrom !== null
                                              ? `${pricing.distanceFrom}`
                                              : "0"}
                                            {" - "}
                                            {pricing.distanceTo !== null
                                              ? `${pricing.distanceTo}`
                                              : "unlimited"}{" "}
                                            km
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="font-semibold text-slate-800 ml-4">
                                      ₹{pricing.amount}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-400 ml-6">
                              No pricing options available
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Pricing Summary */}
              {selectedPricingIds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    Selected Pricing ({selectedPricingIds.length})
                  </div>
                  <div className="space-y-1">
                    {displayFeatures
                      .flatMap((f) =>
                        (f.pricing || [])
                          .filter((p) =>
                            selectedPricingIds
                              .map((id) => Number(id))
                              .includes(Number(p.id))
                          )
                          .map((p) => ({ ...p, featureName: f.name }))
                      )
                      .map((pricing) => (
                        <div
                          key={pricing.id}
                          className="flex items-center justify-between py-1.5 px-3 bg-green-50 rounded border border-green-100">
                          <span className="text-xs text-green-700">
                            {pricing.featureName} - {pricing.name}
                          </span>
                          <span className="text-xs font-semibold text-green-700">
                            ₹{pricing.amount}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default AmbulanceOrderDetailsModal;
