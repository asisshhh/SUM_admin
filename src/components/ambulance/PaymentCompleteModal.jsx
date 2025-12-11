import React from "react";
import { DollarSign, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/client";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update payment status
      await api.post("/payments/mark-paid", {
        orderType: "AMBULANCE",
        orderId: booking.id,
        amount: booking.totalAmount || booking.initialAmount || 0,
        method: form.paymentMethod,
        status: form.paymentStatus
      });

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
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-1">Total Amount</div>
            <div className="text-2xl font-bold text-slate-800">
              ₹{booking?.totalAmount || booking?.initialAmount || 0}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={form.paymentMethod}
              onChange={(e) =>
                setForm({ ...form, paymentMethod: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="NETBANKING">Net Banking</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Status
            </label>
            <select
              value={form.paymentStatus}
              onChange={(e) =>
                setForm({ ...form, paymentStatus: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="SUCCESS">Success (Paid)</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
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
