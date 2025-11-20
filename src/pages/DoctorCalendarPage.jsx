// frontend/src/pages/DoctorCalendarPage.jsx
import React, { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import SlotBookingModal from "../components/schedule/SlotBookingModal";

export default function DoctorCalendarPage() {
  const [doctorId, setDoctorId] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const calendarRef = useRef();

  const { data: doctors } = useQuery({
    queryKey: ["doctors-list"],
    queryFn: async () =>
      (await api.get("/doctors", { params: { pageSize: 500 } })).data.items
  });

  // fetch events whenever doctorId or view range changes
  const fetchEvents = async (startStr, endStr) => {
    if (!doctorId) return;
    const res = await api.get(`/schedule/${doctorId}/calendar`, {
      params: { start: startStr, end: endStr }
    });
    return res.data;
  };

  async function handleDatesSet(arg) {
    if (!doctorId) return;
    const evts = await fetchEvents(
      arg.startStr.slice(0, 10),
      arg.endStr.slice(0, 10)
    );
    setEvents(evts);
  }

  const handleEventClick = (clickInfo) => {
    // If appointment => show details. If schedule => optionally create booking by selecting time slot
    const ext = clickInfo.event.extendedProps;
    if (ext?.type === "schedule") {
      // open slot preview booking for that date and start time
      setSelectedSlot({
        doctorId,
        date: clickInfo.event.startStr.slice(0, 10),
        time: clickInfo.event.startStr.slice(11, 16)
      });
    } else if (ext?.type === "appointment") {
      alert(`Appointment: ${ext.appointmentId} (status ${ext.status})`);
    } else if (ext?.type === "exception") {
      alert("Exception day / hours.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Doctor Calendar</h1>

        <div className="flex gap-3 items-end">
          <div>
            <label className="text-sm">Doctor</label>
            <select
              className="select"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">Choose</option>
              {doctors?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.name} — {d.specialization}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
        height="auto"
      />

      {selectedSlot && (
        <SlotBookingModal
          defaultData={selectedSlot}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
}
