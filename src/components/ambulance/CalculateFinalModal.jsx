import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import {
  Calculator,
  XCircle,
  DollarSign,
  Save,
  CheckCircle,
  X
} from "lucide-react";
import { toast } from "react-toastify";

export default function CalculateFinalModal({ booking, onClose, onSuccess }) {
  const qc = useQueryClient();
  const [finalKm, setFinalKm] = useState(
    booking?.totalDistance?.toString() || ""
  );
  const [selectedPricingIds, setSelectedPricingIds] = useState(
    booking?.selectedFeaturePricingIds || []
  );
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");

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
  const initialAmount = currentBooking?.initialAmount || 0;

  // Auto-select applicable pricing based on distance
  useEffect(() => {
    if (!availableFeatures.length) {
      return;
    }

    // If final KM is cleared or invalid, remove PER_KM pricing and uncheck inlineui features
    if (!finalKm || isNaN(Number(finalKm)) || Number(finalKm) <= 0) {
      setSelectedPricingIds((prev) => {
        const updated = [...prev];
        const allPricing = availableFeatures.flatMap((f) => f.pricing || []);

        // Remove PER_KM pricing
        const perKmPricingIds = allPricing
          .filter((p) => p.unit === "PER_KM")
          .map((p) => p.id);

        // Remove pricing from inlineui features
        availableFeatures.forEach((feature) => {
          if (feature.inlineui === true) {
            const featurePricingIds = feature.pricing?.map((p) => p.id) || [];
            featurePricingIds.forEach((id) => {
              const index = updated.indexOf(id);
              if (index > -1) updated.splice(index, 1);
            });
          }
        });

        return updated.filter((id) => !perKmPricingIds.includes(id));
      });
      return;
    }

    const distance = Number(finalKm);
    if (distance <= 0) {
      return;
    }

    // Auto-select pricing that matches the distance range
    const autoSelectedIds = [];

    // Handle inlineui features (auto-select/unselect based on KM > 30)
    availableFeatures.forEach((feature) => {
      if (feature.inlineui === true) {
        // For inlineui features, auto-select/unselect based on KM > 30
        if (!feature.pricing || feature.pricing.length === 0) return;

        if (distance > 30) {
          // Select PER_KM pricing if available, otherwise select first pricing
          const perKmPricing = feature.pricing.find(
            (p) => p.unit === "PER_KM" && p.active !== false
          );
          if (perKmPricing) {
            autoSelectedIds.push(perKmPricing.id);
          } else if (feature.pricing.length > 0) {
            // Select first pricing option
            autoSelectedIds.push(feature.pricing[0].id);
          }
        }
        // If distance <= 30, don't add any pricing (will be cleared below)
      }
    });

    // First, find and auto-select PER_KM pricing if distance > 30 km (for non-inlineui features)
    if (distance > 30) {
      availableFeatures.forEach((feature) => {
        if (feature.inlineui === true) return; // Skip inlineui features (handled above)

        if (!feature.pricing || feature.pricing.length === 0) return;
        const perKmPricing = feature.pricing.find(
          (p) => p.unit === "PER_KM" && p.active !== false
        );
        if (perKmPricing && !autoSelectedIds.includes(perKmPricing.id)) {
          autoSelectedIds.push(perKmPricing.id);
        }
      });
    }

    // Update selected pricing, keeping only one per feature
    setSelectedPricingIds((prev) => {
      const currentSelectedIds = prev;
      const updated = [...prev];

      // First, determine which pricing should be auto-selected for non-inlineui features
      availableFeatures.forEach((feature) => {
        if (feature.inlineui === true) return; // Skip inlineui features (handled separately)

        if (!feature.pricing || feature.pricing.length === 0) return;

        // Only auto-select if this feature already has pricing selected
        const currentlySelected = feature.pricing.some((p) =>
          currentSelectedIds.includes(p.id)
        );
        if (!currentlySelected) return; // Don't auto-select if nothing was selected

        // Skip if this feature already has pricing selected in autoSelectedIds
        const hasSelected = feature.pricing.some((p) =>
          autoSelectedIds.includes(p.id)
        );
        if (hasSelected) return;

        // Find FIXED pricing that matches the distance range
        const matchingPricing = feature.pricing.find((p) => {
          // Skip PER_KM pricing (handled separately above)
          if (p.unit === "PER_KM") return false;

          const from = p.distanceFrom;
          const to = p.distanceTo;

          if (from !== null && to !== null) {
            return distance >= from && distance <= to;
          } else if (from !== null && to === null) {
            return distance >= from;
          } else if (from === null && to !== null) {
            return distance <= to;
          }
          return false;
        });

        // Select the first matching pricing for each feature (only one per feature)
        if (matchingPricing) {
          autoSelectedIds.push(matchingPricing.id);
        }
      });

      // Process all features to update selected pricing
      availableFeatures.forEach((feature) => {
        const featurePricingIds = feature.pricing?.map((p) => p.id) || [];

        if (feature.inlineui === true) {
          // For inlineui features, always update based on auto-selected pricing
          // Remove all pricing from this feature
          featurePricingIds.forEach((id) => {
            const index = updated.indexOf(id);
            if (index > -1) updated.splice(index, 1);
          });
          // Add the auto-selected one (if any)
          const autoSelected = feature.pricing?.find((p) =>
            autoSelectedIds.includes(p.id)
          );
          if (autoSelected && !updated.includes(autoSelected.id)) {
            updated.push(autoSelected.id);
          }
        } else {
          // For non-inlineui features, only update if they have auto-selected pricing
          const hasAutoSelected = feature.pricing?.some((p) =>
            autoSelectedIds.includes(p.id)
          );

          if (hasAutoSelected) {
            // Remove all pricing from this feature
            featurePricingIds.forEach((id) => {
              const index = updated.indexOf(id);
              if (index > -1) updated.splice(index, 1);
            });
            // Add the auto-selected one
            const autoSelected = feature.pricing.find((p) =>
              autoSelectedIds.includes(p.id)
            );
            if (autoSelected && !updated.includes(autoSelected.id)) {
              updated.push(autoSelected.id);
            }
          }
        }
      });

      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalKm, availableFeatures]);

  // Calculate extra KM charges (for distances > 30 km)
  const extraKmCharges = useMemo(() => {
    if (!finalKm || Number(finalKm) <= 30) return 0;

    const distance = Number(finalKm);
    const extraKms = distance - 30; // KMs after 30

    // Find PER_KM pricing from all available features
    const allPricing = availableFeatures.flatMap((f) => f.pricing || []);
    const perKmPricing = allPricing.find(
      (p) => p.unit === "PER_KM" && p.active !== false
    );

    if (!perKmPricing) return 0;

    // Calculate: extraKms * perKmPrice
    return extraKms * (perKmPricing.amount || 0);
  }, [finalKm, availableFeatures]);

  // Calculate extra amount based on selected pricing + extra KM charges
  const extraAmount = useMemo(() => {
    if (!selectedPricingIds.length && extraKmCharges === 0) return 0;

    const allPricing = availableFeatures.flatMap((f) => f.pricing || []);
    const selectedPricing = allPricing.filter((p) =>
      selectedPricingIds.includes(p.id)
    );

    // Calculate total from selected FIXED pricing (exclude PER_KM as it's handled separately)
    const totalFromFixedPricing = selectedPricing
      .filter((p) => p.unit !== "PER_KM")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Add extra KM charges
    const totalExtra = totalFromFixedPricing + extraKmCharges;

    // Subtract initial amount to get extra amount
    return Math.max(0, totalExtra - initialAmount);
  }, [selectedPricingIds, availableFeatures, initialAmount, extraKmCharges]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return initialAmount + extraAmount;
  }, [initialAmount, extraAmount]);

  // Toggle pricing selection - only one pricing per feature allowed
  const togglePricing = (pricingId, featureId) => {
    setSelectedPricingIds((prev) => {
      // Find the feature that contains this pricing
      const feature = availableFeatures.find((f) =>
        f.pricing?.some((p) => p.id === pricingId)
      );

      if (!feature) return prev;

      // Get all pricing IDs for this feature
      const featurePricingIds = feature.pricing?.map((p) => p.id) || [];

      // Remove all pricing IDs from this feature
      const withoutFeaturePricing = prev.filter(
        (id) => !featurePricingIds.includes(id)
      );

      // If clicking the same pricing, deselect it; otherwise select the new one
      if (prev.includes(pricingId)) {
        return withoutFeaturePricing;
      } else {
        return [...withoutFeaturePricing, pricingId];
      }
    });
  };

  // Clear all pricing for a specific feature
  const clearFeaturePricing = (featureId) => {
    setSelectedPricingIds((prev) => {
      const feature = availableFeatures.find((f) => f.id === featureId);
      if (!feature || !feature.pricing) return prev;

      const featurePricingIds = feature.pricing.map((p) => p.id);
      return prev.filter((id) => !featurePricingIds.includes(id));
    });
  };

  // Calculate final charges mutation
  const calculateMutation = useMutation({
    mutationFn: async (data) => {
      return await api.post(
        `/ambulance-orders/${booking.id}/calculate-final`,
        data
      );
    },
    onSuccess: () => {
      toast.success("Final charges calculated successfully");
      qc.invalidateQueries(["ambulance-order", booking.id]);
      qc.invalidateQueries(["ambulance-orders"]);
      if (onSuccess) onSuccess();
      if (!showPaymentForm) {
        onClose();
      }
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error || "Failed to calculate final charges"
      );
    }
  });

  // Update payment mutation (for extra amount)
  const updatePaymentMutation = useMutation({
    mutationFn: async (data) => {
      return await api.post(
        `/ambulance-orders/${booking.id}/update-final-payment`,
        data
      );
    },
    onSuccess: () => {
      toast.success("Payment updated successfully");
      qc.invalidateQueries(["ambulance-order", booking.id]);
      qc.invalidateQueries(["ambulance-orders"]);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to update payment");
    }
  });

  const handleCalculate = () => {
    if (!finalKm) {
      toast.error("Please enter final KM");
      return;
    }

    if (selectedPricingIds.length === 0) {
      toast.error("Please select at least one pricing option");
      return;
    }

    calculateMutation.mutate({
      totalDistance: Number(finalKm),
      selectedFeaturePricingIds: selectedPricingIds
    });
  };

  const handleUpdatePayment = (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    updatePaymentMutation.mutate({
      amount: Number(paymentAmount),
      paymentMethod,
      notes: paymentNotes || `Payment for extra amount - Booking #${booking.id}`
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
            <Calculator className="text-blue-600" size={24} />
            Calculate Final Charges
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Amount Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-600 mb-1">Initial Amount</div>
              <div className="text-2xl font-bold text-blue-800">
                ₹{initialAmount.toFixed(2)}
              </div>
              <div className="text-xs text-blue-600 mt-1">(Already Paid)</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-600 mb-1">Extra Amount</div>
              <div className="text-2xl font-bold text-green-800">
                ₹{extraAmount.toFixed(2)}
              </div>
              <div className="text-xs text-green-600 mt-1">(To Be Paid)</div>
              {extraKmCharges > 0 && (
                <div className="text-xs text-green-700 mt-2 pt-2 border-t border-green-200">
                  Extra KM: ₹{extraKmCharges.toFixed(2)}
                </div>
              )}
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-sm text-purple-600 mb-1">Total Amount</div>
              <div className="text-2xl font-bold text-purple-800">
                ₹{totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Final KM Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Final KM *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={finalKm}
              onChange={(e) => setFinalKm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter final distance in KM"
            />
            {finalKm && Number(finalKm) > 0 && (
              <div className="text-xs text-blue-600 mt-1 space-y-1">
                <p>Pricing options will be auto-selected based on distance</p>
                {Number(finalKm) > 30 && (
                  <p className="text-green-600 font-medium">
                    Extra KM charges: ({Number(finalKm).toFixed(1)} - 30) × Per
                    KM Price = {extraKmCharges.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Features & Pricing Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Features & Pricing (Auto-selected based on distance)
            </label>
            {availableFeatures.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-4">
                No features available for this ambulance type
              </div>
            ) : (
              <div className="space-y-4">
                {availableFeatures.map((feature) => (
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
                      {feature.inlineui !== true &&
                        feature.pricing &&
                        feature.pricing.some((p) =>
                          selectedPricingIds.includes(p.id)
                        ) && (
                          <button
                            onClick={() => clearFeaturePricing(feature.id)}
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
                          const isSelected = selectedPricingIds.includes(
                            pricing.id
                          );
                          const matchesDistance =
                            finalKm &&
                            ((pricing.distanceFrom !== null &&
                              pricing.distanceTo !== null &&
                              Number(finalKm) >= pricing.distanceFrom &&
                              Number(finalKm) <= pricing.distanceTo) ||
                              (pricing.distanceFrom !== null &&
                                pricing.distanceTo === null &&
                                Number(finalKm) >= pricing.distanceFrom) ||
                              (pricing.distanceFrom === null &&
                                pricing.distanceTo !== null &&
                                Number(finalKm) <= pricing.distanceTo));

                          return (
                            <label
                              key={pricing.id}
                              className={`flex items-center justify-between p-3 rounded-lg border-2 transition ${
                                feature.inlineui === true
                                  ? "cursor-default opacity-75"
                                  : "cursor-pointer"
                              } ${
                                isSelected
                                  ? matchesDistance
                                    ? "border-green-500 bg-green-50"
                                    : "border-blue-500 bg-blue-50"
                                  : matchesDistance
                                  ? "border-green-200 bg-green-25 hover:border-green-300"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}>
                              <div className="flex items-center gap-3 flex-1">
                                <input
                                  type="radio"
                                  name={`feature-${feature.id}`}
                                  checked={isSelected}
                                  disabled={feature.inlineui === true}
                                  onChange={() =>
                                    feature.inlineui !== true &&
                                    togglePricing(pricing.id, feature.id)
                                  }
                                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium text-slate-800 text-sm">
                                      {pricing.name}
                                    </div>
                                    {matchesDistance && (
                                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
                                        Auto
                                      </span>
                                    )}
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
                ))}
              </div>
            )}
          </div>

          {/* Payment Form (shown after calculation) */}
          {showPaymentForm && extraAmount > 0 && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Update Payment (Extra Amount)
              </h3>
              <form onSubmit={handleUpdatePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={extraAmount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Max: ₹${extraAmount.toFixed(2)}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="NETBANKING">Net Banking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Payment notes..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatePaymentMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50">
                    {updatePaymentMutation.isPending
                      ? "Updating..."
                      : "Update Payment"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              Cancel
            </button>
            {!showPaymentForm ? (
              <>
                <button
                  onClick={handleCalculate}
                  disabled={calculateMutation.isPending || !finalKm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                  <Calculator size={18} />
                  {calculateMutation.isPending ? "Calculating..." : "Calculate"}
                </button>
                {extraAmount > 0 && (
                  <button
                    onClick={() => setShowPaymentForm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                    <DollarSign size={18} />
                    Update Payment
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
