// frontend/src/pages/DoctorCalendarPage.jsx
import React, { useState, useRef, useMemo, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import SlotBookingModal from "../components/schedule/SlotBookingModal";
import { SearchableDropdown } from "../components/shared";
import {
  Calendar,
  Stethoscope,
  Users,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Plus,
  RefreshCw
} from "lucide-react";
import { toast } from "react-toastify";

export default function DoctorCalendarPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [viewRange, setViewRange] = useState({ start: null, end: null });
  const calendarRef = useRef();

  // Auto-set doctorId if user is a doctor
  useEffect(() => {
    if (user?.role === "DOCTOR" && user?.doctorProfile?.id && !doctorId) {
      setDoctorId(user.doctorProfile.id.toString());
    }
  }, [user, doctorId]);

  const { data: doctors, isLoading: doctorsLoading } = useQuery({
    queryKey: ["doctors-list"],
    queryFn: async () => {
      try {
        // Max pageSize is 100, fetch first 100 doctors
        const res = await api.get("/doctors", {
          params: { page: 1, pageSize: 100 }
        });
        return res.data?.items || [];
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
        toast.error("Failed to load doctors list");
        return [];
      }
    }
  });

  const selectedDoctor = useMemo(
    () => doctors?.find((d) => d.id === Number(doctorId)),
    [doctors, doctorId]
  );

  // Fetch calendar statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["doctor-calendar-stats", doctorId, viewRange],
    queryFn: async () => {
      if (!doctorId || !viewRange.start || !viewRange.end) return null;
      const res = await api.get(`/schedule/${doctorId}/calendar`, {
        params: {
          start: viewRange.start,
          end: viewRange.end
        }
      });
      const calendarEvents = res.data || [];
      const appointments = calendarEvents.filter(
        (e) => e.extendedProps?.type === "appointment"
      );
      const today = new Date().toISOString().split("T")[0];
      const todayAppointments = appointments.filter((e) =>
        e.startStr.startsWith(today)
      );

      return {
        total: appointments.length,
        today: todayAppointments.length,
        confirmed: appointments.filter(
          (e) => e.extendedProps?.status === "CONFIRMED"
        ).length,
        completed: appointments.filter(
          (e) => e.extendedProps?.status === "COMPLETED"
        ).length,
        pending: appointments.filter(
          (e) => e.extendedProps?.status === "PENDING"
        ).length
      };
    },
    enabled: !!doctorId && !!viewRange.start && !!viewRange.end
  });

  // Fetch events whenever doctorId or view range changes
  const fetchEvents = async (startStr, endStr) => {
    if (!doctorId) return [];
    try {
      const res = await api.get(`/schedule/${doctorId}/calendar`, {
        params: { start: startStr, end: endStr }
      });
      // Ensure events have proper title for display
      const events = (res.data || []).map((event) => {
        if (event.extendedProps?.type === "appointment") {
          return {
            ...event,
            title: event.extendedProps?.patientName || "Appointment"
          };
        }
        return event;
      });
      return events;
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
      toast.error("Failed to load calendar events");
      return [];
    }
  };

  async function handleDatesSet(arg) {
    if (!doctorId) {
      setEvents([]);
      return;
    }
    setViewRange({
      start: arg.startStr.slice(0, 10),
      end: arg.endStr.slice(0, 10)
    });
    const evts = await fetchEvents(
      arg.startStr.slice(0, 10),
      arg.endStr.slice(0, 10)
    );
    setEvents(evts);
  }

  const handleEventClick = (clickInfo) => {
    const ext = clickInfo.event.extendedProps;
    // Server is already in IST, use dates directly without any conversion
    // Use startStr directly from FullCalendar (already in local timezone format)
    const startStr = clickInfo.event.startStr || "";
    // Get date string (YYYY-MM-DD) - use the ISO string directly
    const dateStr = startStr.split("T")[0] || startStr.split(" ")[0];
    // Get time string (HH:MM) - extract from startStr
    const timeStr = startStr.includes("T")
      ? startStr.split("T")[1]?.slice(0, 5) || ""
      : "";

    if (ext?.type === "schedule") {
      // Open slot booking modal for that date and start time
      setSelectedSlot({
        doctorId,
        date: dateStr,
        time: timeStr
      });
    } else if (ext?.type === "appointment") {
      // Show appointment details
      setSelectedAppointment({
        id: ext.appointmentId,
        patientName: ext.patientName || "N/A",
        patientPhone: ext.patientPhone || "N/A",
        date: dateStr,
        time: timeStr,
        status: ext.status || "PENDING",
        notes: ext.notes || ""
      });
    } else if (ext?.type === "exception") {
      toast.info("Exception day / hours - Doctor unavailable");
    }
  };

  const handleSlotClick = (slotInfo) => {
    if (!doctorId) {
      toast.warning("Please select a doctor first");
      return;
    }
    // Server is already in IST, use dates directly without any conversion
    // Use startStr directly from FullCalendar (already in local timezone format)
    const startStr = slotInfo.startStr || "";
    // Get date string (YYYY-MM-DD) - use the ISO string directly
    const date = startStr.split("T")[0] || startStr.split(" ")[0];
    // Get time string (HH:MM) - extract from startStr
    const time = startStr.includes("T")
      ? startStr.split("T")[1]?.slice(0, 5) || ""
      : "";
    setSelectedSlot({
      doctorId,
      date,
      time
    });
  };

  const handleRefresh = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.refetchEvents();
    }
  };

  // Event styling based on type
  const eventClassNames = (arg) => {
    const ext = arg.event.extendedProps;
    if (ext?.type === "appointment") {
      const status = ext.status?.toUpperCase() || "PENDING";
      if (status === "COMPLETED") return "fc-event-completed";
      if (status === "CONFIRMED") return "fc-event-confirmed";
      if (status === "CANCELLED") return "fc-event-cancelled";
      return "fc-event-pending";
    }
    if (ext?.type === "schedule") return "fc-event-schedule";
    if (ext?.type === "exception") return "fc-event-exception";
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Doctor Calendar
                </h1>
                <p className="text-sm text-slate-500">
                  {user?.role === "DOCTOR"
                    ? "Viewing your calendar"
                    : selectedDoctor
                    ? `Viewing schedule for ${selectedDoctor.user?.name}`
                    : "Select a doctor to view their calendar"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Doctor Selection */}
            {user?.role !== "DOCTOR" && (
              <div className="flex-1 min-w-[250px]">
                <SearchableDropdown
                  label={
                    <span>
                      <Stethoscope size={12} className="inline mr-1" />
                      Select Doctor
                    </span>
                  }
                  value={doctorId || ""}
                  options={[
                    { value: "", label: "Choose a doctor..." },
                    ...(doctors || []).map((d) => ({
                      value: String(d.id),
                      label: `${d.user?.name} — ${
                        d.specialization || "General"
                      }`
                    }))
                  ]}
                  onChange={(value) => {
                    setDoctorId(value);
                    setEvents([]);
                  }}
                  placeholder="Choose a doctor..."
                  className=""
                />
              </div>
            )}
            {user?.role === "DOCTOR" && doctorId && (
              <div className="flex-1 min-w-[250px]">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <Stethoscope size={12} className="inline mr-1" />
                  Doctor
                </label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
                  {selectedDoctor?.user?.name || "Loading..."} —{" "}
                  {selectedDoctor?.specialization || "General"}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={!doctorId}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {doctorId && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Total Appointments
                  </p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {stats.total || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Calendar className="text-blue-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Today
                  </p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {stats.today || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Clock className="text-green-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Confirmed
                  </p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {stats.confirmed || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="text-blue-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Completed
                  </p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {stats.completed || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Stethoscope className="text-green-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {stats.pending || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="text-yellow-600" size={20} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden">
          {!doctorId ? (
            <div className="p-12 text-center">
              <Calendar className="mx-auto text-slate-300 mb-4" size={64} />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                {user?.role === "DOCTOR"
                  ? "Loading Calendar"
                  : "No Doctor Selected"}
              </h3>
              <p className="text-slate-500">
                {user?.role === "DOCTOR"
                  ? "Loading your calendar..."
                  : "Please select a doctor from the dropdown above to view their calendar"}
              </p>
            </div>
          ) : (
            <div className="p-4">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay"
                }}
                events={events}
                datesSet={(arg) => handleDatesSet(arg)}
                eventClick={handleEventClick}
                selectable={true}
                selectMirror={true}
                select={(slotInfo) => handleSlotClick(slotInfo)}
                height="auto"
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                eventClassNames={eventClassNames}
                displayEventTime={true}
                dayHeaderFormat={{ weekday: "short", day: "numeric" }}
                slotLabelFormat={{
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true
                }}
              />
            </div>
          )}
        </div>

        {/* Slot Booking Modal */}
        {selectedSlot && (
          <SlotBookingModal
            defaultData={selectedSlot}
            onClose={() => {
              setSelectedSlot(null);
              handleRefresh();
            }}
          />
        )}

        {/* Appointment Details Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">
                  Appointment Details
                </h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  <XCircle size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Patient Name:</span>
                  <span className="font-medium text-slate-800">
                    {selectedAppointment.patientName}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Phone:</span>
                  <span className="font-medium text-slate-800">
                    {selectedAppointment.patientPhone}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Date:</span>
                  <span className="font-medium text-slate-800">
                    {selectedAppointment.date}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Time:</span>
                  <span className="font-medium text-slate-800">
                    {selectedAppointment.time}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Status:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedAppointment.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : selectedAppointment.status === "CONFIRMED"
                        ? "bg-blue-100 text-blue-700"
                        : selectedAppointment.status === "CANCELLED"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                    {selectedAppointment.status}
                  </span>
                </div>
                {selectedAppointment.notes && (
                  <div className="py-2">
                    <span className="text-sm text-slate-500">Notes:</span>
                    <p className="mt-1 text-sm text-slate-700">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS for event colors */}
      <style>{`
        .fc-event-schedule {
          background-color: #e0e7ff !important;
          border-color: #a5b4fc !important;
          color: #4f46e5 !important;
        }
        .fc-event-confirmed {
          background-color: #dbeafe !important;
          border-color: #60a5fa !important;
          color: #1e40af !important;
        }
        .fc-event-completed {
          background-color: #d1fae5 !important;
          border-color: #34d399 !important;
          color: #065f46 !important;
        }
        .fc-event-pending {
          background-color: #fef3c7 !important;
          border-color: #fbbf24 !important;
          color: #92400e !important;
        }
        .fc-event-cancelled {
          background-color: #fee2e2 !important;
          border-color: #f87171 !important;
          color: #991b1b !important;
        }
        .fc-event-exception {
          background-color: #f3f4f6 !important;
          border-color: #9ca3af !important;
          color: #374151 !important;
          opacity: 0.7;
        }
        .fc-event-title {
          font-weight: 500;
          padding: 2px 4px;
        }
        .fc-daygrid-day.fc-day-today {
          background-color: #fef3c7 !important;
        }
        .fc-timegrid-slot {
          height: 2.5em;
        }
      `}</style>
    </div>
  );
}
