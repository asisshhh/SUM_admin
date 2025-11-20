import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import api from "../api/client";
import StarRating from "../components/feedback/StarRating";

export default function DoctorDetail() {
  const { id } = useParams();

  const { data: doctor, isLoading } = useQuery({
    queryKey: ["doctor-detail", id],
    queryFn: async () => (await api.get(`/doctors/${id}`)).data
  });

  const [range, setRange] = useState({ from: "", to: "" });

  const { data: statsByRange } = useQuery({
    queryKey: ["doctor-stats-range", id, range],
    enabled: range.from && range.to,
    queryFn: async () =>
      (
        await api.get(`/doctors/${id}/stats`, {
          params: { from: range.from, to: range.to }
        })
      ).data
  });

  if (isLoading || !doctor) return <div>Loading...</div>;

  const qual = doctor.qualifications?.map((q) => q.qualification.degree);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">{doctor.user.name}</h1>
        <div className="text-slate-600">{doctor.specialization}</div>

        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium">Department</div>
            <div>{doctor.department?.name}</div>
          </div>

          <div>
            <div className="font-medium">Experience</div>
            <div>{doctor.experience} years</div>
          </div>

          <div>
            <div className="font-medium">Consultation Fee</div>
            <div>₹{doctor.consultationFee}</div>
          </div>

          <div>
            <div className="font-medium">Rating</div>
            <StarRating value={doctor.stats.avgRating} size={22} />
            <div className="text-xs text-slate-500">
              {doctor.stats.totalReviews} reviews
            </div>
          </div>

          <div>
            <div className="font-medium">Total Patients</div>
            <div>{doctor.stats.totalPatients}</div>
          </div>

          {qual?.length > 0 && (
            <div>
              <div className="font-medium">Qualifications</div>
              <ul className="list-disc list-inside">
                {qual.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Date Range Patients */}
      <div className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Patients (Date Range)</h2>

        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-sm">From</label>
            <input
              type="date"
              className="input"
              value={range.from}
              onChange={(e) =>
                setRange((r) => ({ ...r, from: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="text-sm">To</label>
            <input
              type="date"
              className="input"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
        </div>

        {statsByRange?.count !== undefined && (
          <div className="text-lg font-medium">
            Count: {statsByRange.count} patients
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold">Weekly Availability</h2>
        <ul className="space-y-2 mt-3">
          {doctor.schedules?.map((s) => (
            <li key={s.id} className="border p-3 rounded">
              <div className="font-medium">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.dayOfWeek]}
              </div>
              <div className="text-sm text-slate-600">
                {s.template.startTime} - {s.template.endTime}
                (Slot: {s.template.slotDuration} min)
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Exceptions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold">Schedule Exceptions</h2>
        {doctor.exceptions?.length === 0 && (
          <div className="text-slate-500">No exceptions</div>
        )}

        <ul className="space-y-2 mt-3">
          {doctor.exceptions?.map((e) => (
            <li key={e.id} className="border p-3 rounded">
              <div className="font-medium">
                {new Date(e.exceptionDate).toLocaleDateString()}
              </div>
              <div className="text-sm">
                Type: {e.exceptionType}
                {e.startTime && ` • ${e.startTime} - ${e.endTime}`}
              </div>
              <div className="text-xs text-slate-600">{e.reason}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Feedback */}
      <div className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Patient Reviews</h2>

        {doctor.feedbacks.length === 0 && (
          <div className="text-slate-500">No reviews yet.</div>
        )}

        {doctor.feedbacks.map((f) => (
          <div key={f.id} className="border rounded p-3">
            <StarRating value={f.rating} size={18} />
            <div className="text-sm text-slate-600">{f.user.name}</div>
            <div className="mt-1">{f.comments}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
