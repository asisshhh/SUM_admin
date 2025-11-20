import React, { useState } from "react";
import StarRating from "./StarRating";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export default function PatientFeedbackForm({
  appointmentId,
  userId,
  onSuccess
}) {
  const qc = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post("/feedback", {
          userId,
          appointmentId,
          rating,
          comments
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries(["doctor-detail"]);
      onSuccess && onSuccess();
    }
  });

  return (
    <div className="card p-4 space-y-3 max-w-md">
      <h2 className="text-lg font-semibold">Rate Your Experience</h2>

      <StarRating value={rating} onChange={setRating} size={28} />

      <textarea
        className="input min-h-[90px]"
        placeholder="Write your feedback..."
        value={comments}
        onChange={(e) => setComments(e.target.value)}
      />

      <button
        className="btn bg-blue-600 text-white w-full"
        onClick={() => submit.mutate()}>
        Submit Feedback
      </button>
    </div>
  );
}
