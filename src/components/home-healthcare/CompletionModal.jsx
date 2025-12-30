// CompletionModal.jsx — Modal for completing home healthcare service orders with comment
import React, { useState } from "react";
import { X, CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "react-toastify";

export default function CompletionModal({ order, onClose, onComplete }) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!comment.trim()) {
      toast.error("Please add a completion comment");
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete(order.id, comment.trim());
      toast.success("Order marked as completed");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to complete order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="text-green-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Complete Order
              </h3>
              <p className="text-sm text-slate-500">
                Order #{order?.id || order?.orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <MessageSquare size={16} className="inline mr-2" />
              Completion Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe the service performed, any observations, or notes about the visit..."
              rows={5}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              This comment will be saved with the completed order.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Mark as Completed
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
