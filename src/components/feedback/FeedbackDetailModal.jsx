import React, { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  User,
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  MessageSquare,
  Phone,
  Mail,
  Ambulance,
  FlaskConical,
  Package,
  Home,
  Hash
} from "lucide-react";
import api from "../../api/client";
import StarRating from "./StarRating";
import QuestionRatings from "./QuestionRatings";

export default function FeedbackDetailModal({ feedbackId, onClose }) {
  // Fetch detailed feedback
  const { data: feedbackData, isLoading, error } = useQuery({
    queryKey: ["feedback", feedbackId],
    queryFn: async () => {
      const response = await api.get(`/feedbacks/${feedbackId}`);
      // Handle different response structures
      const data = response.data;
      if (process.env.NODE_ENV === "development") {
        console.log("Feedback detail API response:", data);
        console.log("Feedback detail keys:", Object.keys(data || {}));
      }
      // API might return { success: true, feedback: {...} } or { feedback: {...} } or direct feedback object
      return data?.feedback || data?.data || data;
    },
    enabled: !!feedbackId
  });

  // Extract feedback object (handle nested structures)
  const feedback = feedbackData;
  
  // Debug log feedback structure
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && feedback) {
      console.log("Feedback object:", feedback);
      console.log("Feedback keys:", Object.keys(feedback || {}));
      console.log("Feedback serviceType:", feedback?.serviceType);
      console.log("Feedback serviceId:", feedback?.serviceId);
      console.log("Feedback rating:", feedback?.rating);
      console.log("Feedback comments:", feedback?.comments);
      console.log("Feedback patient:", feedback?.patient);
      console.log("Feedback user:", feedback?.user);
      console.log("Feedback approved:", feedback?.approved);
      console.log("Feedback createdAt:", feedback?.createdAt);
    }
  }, [feedback]);

  // Fetch active questions for mapping
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["feedback-questions-active"],
    queryFn: async () => {
      const response = await api.get("/feedback-questions/active");
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data?.questions && Array.isArray(data.questions)) return data.questions;
      if (data?.items && Array.isArray(data.items)) return data.items;
      return [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Create questions map with displayOrder for sorting
  const questionsMap = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(questionsData)
      ? questionsData
      : questionsData?.questions || questionsData?.items || [];
    list.forEach((q) => {
      const text =
        q.question || q.text || q.title || q.name || `Question #${q.id}`;
      map.set(String(q.id), { ...q, text });
    });
    return map;
  }, [questionsData]);

  // Convert questionRatings relation to object format
  const questionRatingsObj = useMemo(() => {
    if (!feedback?.questionRatings) return {};
    
    let ratings = {};
    if (Array.isArray(feedback.questionRatings)) {
      feedback.questionRatings.forEach((qr) => {
        const qId = qr.questionId || qr.question?.id || qr.id;
        if (qId && qr.rating) {
          ratings[String(qId)] = qr.rating;
        }
      });
    } else if (typeof feedback.questionRatings === "object" && !Array.isArray(feedback.questionRatings)) {
      ratings = feedback.questionRatings;
    }
    return ratings;
  }, [feedback?.questionRatings]);

  // Show ALL active questions with their ratings (if available)
  const allQuestionsWithRatings = useMemo(() => {
    const list = Array.isArray(questionsData)
      ? questionsData
      : questionsData?.questions || questionsData?.items || [];
    
    return list
      .map((q) => {
        const questionId = String(q.id);
        const questionText = q.question || q.text || q.title || q.name || `Question #${q.id}`;
        const rating = questionRatingsObj[questionId];
        
        return {
          questionId,
          questionText,
          rating: rating || null,
          displayOrder: q.displayOrder ?? q.display_order ?? 999
        };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [questionsData, questionRatingsObj]);

  // Extract service information (handle both camelCase and snake_case)
  const serviceType = feedback?.serviceType || feedback?.service_type || (feedback?.appointmentId ? "APPOINTMENT" : null);
  const serviceId = feedback?.serviceId || feedback?.service_id || feedback?.appointmentId || null;
  
  // Extract rating and comments (handle both camelCase and snake_case)
  const rating = feedback?.rating || 0;
  const comments = feedback?.comments || feedback?.comment || "";
  const approved = feedback?.approved;
  const createdAt = feedback?.createdAt || feedback?.created_at;

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return String(dateString);
    }
  };

  const getStatusBadge = (approved) => {
    if (approved === true) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-emerald-100 text-emerald-700 rounded-full">
          <CheckCircle size={14} />
          Approved
        </span>
      );
    }
    if (approved === false) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-red-100 text-red-700 rounded-full">
          <XCircle size={14} />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-amber-100 text-amber-700 rounded-full">
        Pending
      </span>
    );
  };

  const getServiceIcon = () => {
    if (serviceType === "AMBULANCE_BOOKING") return <Ambulance className="text-orange-500" size={20} />;
    if (serviceType === "APPOINTMENT" || serviceType === "DOCTOR_BOOKING") return <Stethoscope className="text-blue-500" size={20} />;
    if (serviceType === "LAB_TEST") return <FlaskConical className="text-indigo-500" size={20} />;
    if (serviceType === "HEALTH_PACKAGE") return <Package className="text-green-500" size={20} />;
    if (serviceType === "HOME_HEALTHCARE" || serviceType === "HOME_HEALTHCARE_PACKAGE") return <Home className="text-purple-500" size={20} />;
    return <Stethoscope className="text-slate-500" size={20} />;
  };

  const getServiceTypeLabel = () => {
    if (serviceType === "AMBULANCE_BOOKING") return "Ambulance Booking";
    if (serviceType === "APPOINTMENT" || serviceType === "DOCTOR_BOOKING") return "Doctor Appointment";
    if (serviceType === "LAB_TEST") return "Lab Test";
    if (serviceType === "HEALTH_PACKAGE") return "Health Package";
    if (serviceType === "HOME_HEALTHCARE") return "Home Healthcare";
    if (serviceType === "HOME_HEALTHCARE_PACKAGE") return "Home Healthcare Package";
    return serviceType || "Unknown Service";
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Loading feedback details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <XCircle className="text-red-500 mx-auto mb-4" size={48} />
              <p className="text-slate-800 font-medium mb-2">Failed to load feedback</p>
              <p className="text-sm text-slate-500 mb-4">
                {error?.response?.data?.error || error?.message || "Unknown error"}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
              <MessageSquare className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Feedback Details</h2>
              <p className="text-sm text-slate-500">ID: #{feedback.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1️⃣ Service Information */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Stethoscope size={20} className="text-violet-600" />
              Service Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                  {getServiceIcon()}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Service Type</p>
                  <p className="text-sm font-semibold text-slate-800">{getServiceTypeLabel()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                  <Hash size={18} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Service ID</p>
                  <p className="text-sm font-semibold text-slate-800">#{serviceId || "—"}</p>
                </div>
              </div>
              {serviceType === "APPOINTMENT" && feedback.appointment && (
                <>
                  {feedback.appointment.doctor && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                          <User size={18} className="text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Doctor</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {feedback.appointment.doctor.name || "—"}
                          </p>
                        </div>
                      </div>
                      {feedback.appointment.doctor.department && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                            <Stethoscope size={18} className="text-blue-500" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Department</p>
                            <p className="text-sm font-semibold text-slate-800">
                              {typeof feedback.appointment.doctor.department === "string"
                                ? feedback.appointment.doctor.department
                                : feedback.appointment.doctor.department.name || "—"}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {feedback.appointment.appointmentDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                        <Calendar size={18} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Appointment Date</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {formatDate(feedback.appointment.appointmentDate)}
                        </p>
                      </div>
                    </div>
                  )}
                  {feedback.appointment.timeSlot && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                        <Clock size={18} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Time Slot</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {feedback.appointment.timeSlot}
                        </p>
                      </div>
                    </div>
                  )}
                  {feedback.appointment.status && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                        {feedback.appointment.status === "COMPLETED" ? (
                          <CheckCircle size={18} className="text-emerald-500" />
                        ) : (
                          <Clock size={18} className="text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {feedback.appointment.status}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 2️⃣ Question-wise Feedback - HIGHEST PRIORITY */}
          <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-xl border-2 border-amber-200 p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Star className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Question-wise Feedback</h3>
            </div>
            {isLoadingQuestions ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-600">Loading questions...</p>
              </div>
            ) : allQuestionsWithRatings.length === 0 ? (
              <div className="text-center py-8 bg-white/50 rounded-lg border border-amber-200">
                <Star className="text-amber-300 mx-auto mb-2" size={32} />
                <p className="text-sm text-slate-600 font-medium">No questions available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {allQuestionsWithRatings.map(({ questionId, questionText, rating }) => (
                  <div
                    key={questionId}
                    className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 mb-2">{questionText}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {rating ? (
                          <>
                            <StarRating value={rating} size={24} />
                            <span className="text-base font-bold text-slate-700 min-w-[3rem] text-right">
                              {rating}/5
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400 italic min-w-[3rem] text-right">
                            Not rated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3️⃣ Overall Feedback Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-600" />
              Overall Feedback Summary
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">Overall Rating:</span>
                  <StarRating value={rating} size={20} />
                  <span className="text-sm font-bold text-slate-800">{rating}/5</span>
                </div>
                <div className="flex-1" />
                {getStatusBadge(approved)}
              </div>
              {comments && (
                <div className="bg-white rounded-lg border border-blue-200 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Comment</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{comments}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar size={14} />
                <span>Submitted: {formatDate(createdAt)}</span>
              </div>
            </div>
          </div>

          {/* 4️⃣ Patient Information */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-purple-600" />
              Patient Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-purple-200">
                  <User size={18} className="text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Patient Name</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {feedback?.patient?.name || feedback?.patient?.user?.name || feedback?.user?.name || "—"}
                  </p>
                </div>
              </div>
              {(feedback?.patient?.relation || feedback?.patient?.relation !== "Self") && feedback?.patient?.relation && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-purple-200">
                    <User size={18} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Relation</p>
                    <p className="text-sm font-semibold text-slate-800">{feedback.patient.relation}</p>
                  </div>
                </div>
              )}
              {(feedback?.patient?.phone || feedback?.patient?.user?.phone || feedback?.user?.phone) && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-purple-200">
                    <Phone size={18} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Phone</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {feedback?.patient?.phone || feedback?.patient?.user?.phone || feedback?.user?.phone || "—"}
                    </p>
                  </div>
                </div>
              )}
              {(feedback?.patient?.email || feedback?.patient?.user?.email || feedback?.user?.email) && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-purple-200">
                    <Mail size={18} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {feedback?.patient?.email || feedback?.patient?.user?.email || feedback?.user?.email || "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

