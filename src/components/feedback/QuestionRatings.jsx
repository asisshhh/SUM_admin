import React, { useMemo } from "react";
import StarRating from "./StarRating";

/**
 * Displays question-wise ratings for feedback.
 * - Maps dynamic questionIds to question text using provided active questions.
 * - Handles missing/soft-deleted/inactive questions gracefully.
 */
export default function QuestionRatings({
  questionRatings,
  questions,
  isLoading
}) {
  const entries = useMemo(() => {
    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log("QuestionRatings received:", {
        questionRatings,
        questionsType: typeof questions,
        questionsIsMap: questions instanceof Map,
        questionsSize: questions instanceof Map ? questions.size : "N/A"
      });
    }

    if (!questionRatings) return [];
    
    // Handle different formats: object, string (JSON), or already parsed
    let ratingsObj = questionRatings;
    if (typeof questionRatings === "string") {
      try {
        ratingsObj = JSON.parse(questionRatings);
      } catch (e) {
        console.error("Failed to parse questionRatings:", e);
        return [];
      }
    }
    
    if (typeof ratingsObj !== "object" || Array.isArray(ratingsObj)) {
      return [];
    }
    
    return Object.entries(ratingsObj).filter(
      ([, value]) => typeof value === "number" && value > 0
    );
  }, [questionRatings]);

  if (isLoading) {
    return (
      <div className="text-xs text-slate-500 flex items-center gap-2">
        <span className="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        Loading question ratings...
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="text-sm text-slate-400 italic">
        No question-wise ratings
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map(([questionId, value]) => {
        const question =
          questions?.get?.(String(questionId)) ||
          questions?.[String(questionId)];
        const label =
          question?.text ||
          question?.question ||
          question?.title ||
          question?.name ||
          question ||
          `Question #${questionId}`;

        return (
          <div
            key={questionId}
            className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-700 line-clamp-2">{label}</div>
            <div className="flex items-center gap-2 shrink-0">
              <StarRating value={value} size={14} />
              <span className="text-xs text-slate-500 font-medium">
                {value}/5
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

