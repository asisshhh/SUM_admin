import React from "react";
import { DollarSign, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/client";
import { SearchableDropdown } from "../shared";

const PaymentCompleteModal = React.memo(function PaymentCompleteModal({
  booking,
  onClose,
  onSuccess
}) {
  const [form, setForm] = React.useState({
    paymentMethod: "CASH",
    paymentStatus: "SUCCESS"
  });
  const [loading, setLoading] = React.useState(false);

  // Calculate amounts
  const initialAmount = booking?.initialAmount || 0;
  const totalAmount = booking?.totalAmount || booking?.initialAmount || 0;
  const extraAmount = Math.max(0, totalAmount - initialAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Only save extra amount if there's an extra amount to pay
      if (extraAmount > 0) {
        // Update payment status - only save extra amount
        await api.post("/payments/mark-paid", {
          orderType: "AMBULANCE",
          orderId: booking.id,
          amount: extraAmount, // Only save extra amount, not total
          method: form.paymentMethod,
          status: form.paymentStatus,
          notes: `Extra amount payment for booking #${booking.id}`
        });
      }

      // Update status to completed
      await api.put(`/ambulance-orders/${booking.id}/status`, {
        status: "COMPLETED"
      });

      toast.success("Payment updated and booking marked as completed");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Failed to update payment and status"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="text-green-600" size={24} />
            Update Payment & Complete
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-600 mb-1">Initial Amount</div>
              <div className="text-xl font-bold text-blue-800">
                ₹{initialAmount.toFixed(2)}
              </div>
              <div className="text-xs text-blue-600 mt-1">(Already Paid)</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-600 mb-1">Extra Amount</div>
              <div className="text-xl font-bold text-green-800">
                ₹{extraAmount.toFixed(2)}
              </div>
              <div className="text-xs text-green-600 mt-1">(To Be Paid)</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-sm text-purple-600 mb-1">Total Amount</div>
              <div className="text-xl font-bold text-purple-800">
                ₹{totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <SearchableDropdown
              label="Payment Method"
              value={form.paymentMethod}
              options={[
                { value: "CASH", label: "Cash" },
                { value: "CARD", label: "Card" },
                { value: "UPI", label: "UPI" },
                { value: "NETBANKING", label: "Net Banking" }
              ]}
              onChange={(value) => setForm({ ...form, paymentMethod: value })}
              placeholder="Select Payment Method"
              className=""
            />
          </div>

          <div>
            <SearchableDropdown
              label="Payment Status"
              value={form.paymentStatus}
              options={[
                { value: "SUCCESS", label: "Success (Paid)" },
                { value: "PENDING", label: "Pending" },
                { value: "FAILED", label: "Failed" }
              ]}
              onChange={(value) => setForm({ ...form, paymentStatus: value })}
              placeholder="Select Payment Status"
              className=""
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              This will mark the booking status as <strong>COMPLETED</strong>{" "}
              and update the payment status.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50">
              {loading ? "Updating..." : "Update & Complete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default PaymentCompleteModal;
