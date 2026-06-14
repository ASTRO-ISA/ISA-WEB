import { useState } from "react";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const CreateEvent = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    isMultiDayEvent: false,
    eventDates: [{ date: "", startTime: "", endTime: "" }],
    eventDate: "",
    eventEndTime: "",
    location: "",
    attendeeCount: 0,
    seatCapacity: "",
    eventType: "",
    hostedBy: [{ name: "" }],
    presentedBy: "",
    type: "",
    // status: "",
    isFree: true,
    fee: "",
    upiId: "",
    isTicketRequired: true,
  });

  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e, idx = null) => {
    const { name, value, type } = e.target;

    if (name.startsWith("hostedBy") && idx !== null) {
      const updatedHosts = [...formData.hostedBy];
      updatedHosts[idx].name = value;
      setFormData({ ...formData, hostedBy: updatedHosts });
    } else if (name === "isFree") {
      const isFree = value === "true";
      setFormData({ ...formData, isFree, fee: isFree ? "" : formData.fee });
    } else if (name === "isTicketRequired") {
      const isTicketRequired = value === "true";
      setFormData({ ...formData, isTicketRequired });
    } else if (name === "isMultiDayEvent") {
      const isMultiDayEvent = value === "true";
      setFormData({ ...formData, isMultiDayEvent });
    } else if (name.startsWith("eventDates")) {
      const parts = name.split("-");
      const idx = parseInt(parts[1], 10);
      const field = parts[2];
      const updatedDates = [...formData.eventDates];
      updatedDates[idx][field] = value;
      setFormData({ ...formData, eventDates: updatedDates });
    } else if (type === "number") {
      setFormData({ ...formData, [name]: Number(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleThumbnailChange = (e) => {
    setThumbnailFile(e.target.files[0]);
  };

  const addHost = () => {
    setFormData({
      ...formData,
      hostedBy: [...formData.hostedBy, { name: "" }],
    });
  };

  const addEventDate = () => {
    setFormData({
      ...formData,
      eventDates: [...formData.eventDates, { date: "", startTime: "", endTime: "" }],
    });
  };

  const removeEventDate = (idx) => {
    const updatedDates = formData.eventDates.filter((_, i) => i !== idx);
    setFormData({
      ...formData,
      eventDates: updatedDates,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selected = new Date(formData.isMultiDayEvent ? formData.eventDates[0].date : formData.eventDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // zero out time

    if (selected < now) {
      toast({
        description:
          "You can’t set an event in the past. Please select correct date.",
      });
      return;
    }
    if (formData.description.length < 100) {
      toast({
        description: "Mininum 100 characters required for description.",
      });
      return;
    }
    setIsSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "hostedBy" || key === "eventDates") {
          data.append(key, JSON.stringify(value));
        } else if (key === "eventDate" || key === "eventEndTime") {
          if (value && !formData.isMultiDayEvent) {
            data.append(key, new Date(value as string).toISOString());
          }
        } else if (typeof value === "number") {
          data.append(key, value.toString());
        } else if (typeof value === "boolean") {
          data.append(key, value ? "true" : "false"); // store boolean as string
        } else if (value !== null && value !== undefined) {
          data.append(key, value.toString());
        }
      });

      // Provide fallback values for required fields when multi-day event is checked
      if (formData.isMultiDayEvent && formData.eventDates.length > 0) {
        const firstDay = formData.eventDates[0];
        const lastDay = formData.eventDates[formData.eventDates.length - 1];
        
        // Combine date and time to create a proper local Date object
        const firstDateTimeStr = `${firstDay.date}T${firstDay.startTime || "00:00"}`;
        data.append("eventDate", new Date(firstDateTimeStr).toISOString());
        
        // End time is stored as string in this logic
        data.append("eventEndTime", lastDay.endTime);
      }
      if (thumbnailFile) {
        data.append("thumbnail", thumbnailFile);
      }

      const res = await api.post("/events/create", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMsg("Event created successfully!");
      setFormData({
        title: "",
        description: "",
        isMultiDayEvent: false,
        eventDates: [{ date: "", startTime: "", endTime: "" }],
        eventDate: "",
        eventEndTime: "",
        location: "",
        attendeeCount: 0,
        seatCapacity: "",
        eventType: "",
        hostedBy: [{ name: "" }],
        presentedBy: "",
        type: "",
        // status: "",
        isFree: true,
        fee: "",
        upiId: "",
        isTicketRequired: true,
      });
      setThumbnailFile(null);
      navigate("/events");
      toast({
        title: "Event created successfully!",
        description: "It will be live once its been reviewed."
      });
    } catch (error) {
      setErrorMsg(error.response?.data?.message || "Something went wrong");
      toast({
        description: "Something went wrong creating event!",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-space-dark text-white pt-20 px-4">
      <main className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold pt-10">Create Event</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Banner */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Banner
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="block w-full text-sm text-gray-300 file:bg-space-purple/30 file:border-0 file:px-4 file:py-2 file:rounded file:text-white hover:file:bg-space-purple/50 transition"
              />
            </div>

            {/* Title */}
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full p-2 rounded bg-zinc-800"
              placeholder="Title *"
              required
            />

            {/* Description */}
            <div>
              <label htmlFor="description" className="text-sm text-gray-400">
                Description (min 100 characters)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full p-2 rounded bg-zinc-800"
                placeholder="Description"
                required
              />
              <p className="text-xs text-gray-400 mt-0">
                {formData.description.length}
              </p>
            </div>

            {/* Multi-Day Toggle */}
            <div className="mb-4">
              <label htmlFor="isMultiDayEvent" className="block text-sm text-gray-400">
                Is this a multi-day event?
              </label>
              <select
                id="isMultiDayEvent"
                name="isMultiDayEvent"
                value={formData.isMultiDayEvent ? "true" : "false"}
                onChange={handleChange}
                className="w-full p-2 mt-1 rounded bg-zinc-800"
              >
                <option value="false">No (Single Day)</option>
                <option value="true">Yes (Multi-Day)</option>
              </select>
            </div>

            {/* Dates */}
            {!formData.isMultiDayEvent ? (
              <>
                <label htmlFor="eventDate" className="block text-gray-400 text-xs">
                  Start Date and Time* (use given calender option for precision)
                  <input
                    type="datetime-local"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    className="block p-2 mt-1 w-full rounded bg-zinc-800"
                    style={{ colorScheme: "dark" }}
                    required
                    min={new Date().toISOString().split("T")[0]}
                  />
                </label>

                <label
                  htmlFor="eventEndTime"
                  className="block text-gray-400 text-xs"
                >
                  End Time*
                  <input
                    type="datetime-local"
                    name="eventEndTime"
                    value={formData.eventEndTime}
                    onChange={handleChange}
                    className="block p-2 mt-1 w-full rounded bg-zinc-800"
                    style={{ colorScheme: "dark" }}
                  />
                </label>
              </>
            ) : (
              <div className="space-y-4 border border-zinc-700 p-4 rounded bg-zinc-800/50">
                <p className="text-sm font-semibold text-gray-300">Multi-Day Schedule</p>
                {formData.eventDates.map((day, idx) => (
                  <div key={idx} className="space-y-2 border-b border-zinc-700 pb-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-space-accent font-medium">Day {idx + 1}</p>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => removeEventDate(idx)}
                          className="text-xs text-red-500 hover:text-red-400"
                        >
                          Remove Day
                        </button>
                      )}
                    </div>
                    <label className="block text-gray-400 text-xs">
                      Date*
                      <input
                        type="date"
                        name={`eventDates-${idx}-date`}
                        value={day.date}
                        onChange={handleChange}
                        className="block p-2 w-full mt-1 rounded bg-zinc-800"
                        style={{ colorScheme: "dark" }}
                        required
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </label>
                    <div className="flex gap-4">
                      <label className="block text-gray-400 text-xs w-1/2">
                        Start Time (IST)*
                        <input
                          type="time"
                          name={`eventDates-${idx}-startTime`}
                          value={day.startTime}
                          onChange={handleChange}
                          className="block p-2 w-full mt-1 rounded bg-zinc-800"
                          style={{ colorScheme: "dark" }}
                          required
                        />
                      </label>
                      <label className="block text-gray-400 text-xs w-1/2">
                        End Time (IST)*
                        <input
                          type="time"
                          name={`eventDates-${idx}-endTime`}
                          value={day.endTime}
                          onChange={handleChange}
                          className="block p-2 w-full mt-1 rounded bg-zinc-800"
                          style={{ colorScheme: "dark" }}
                          required
                        />
                      </label>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEventDate}
                  className="text-sm text-space-accent underline"
                >
                  + Add another day
                </button>
              </div>
            )}

            {/* Other Inputs */}
            <input
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full p-2 rounded bg-zinc-800"
              placeholder="Location *"
              required
            />

            <div>
              <label htmlFor="seatCapacity" className="block text-sm text-gray-400">
                Seat Capacity (Max Attendees Allowed) *
              </label>
              <input
                id="seatCapacity"
                name="seatCapacity"
                value={formData.seatCapacity}
                onChange={handleChange}
                className="w-full p-2 rounded bg-zinc-800"
                min="1"
                required
              />
            </div>

            <input
              name="eventType"
              value={formData.eventType}
              onChange={handleChange}
              className="w-full p-2 rounded bg-zinc-800"
              placeholder="Event Type (Virtual/In-Person) *"
              required
            />

            <input
              name="presentedBy"
              value={formData.presentedBy}
              onChange={handleChange}
              className="w-full p-2 rounded bg-zinc-800"
              placeholder="Presented By"
            />

            {/* Hosted By */}
            <div>
              <label
                htmlFor="host"
                className="block mb-1 text-sm text-gray-400"
              >
                Hosted By:
              </label>
              {formData.hostedBy.map((host, idx) => (
                <input
                  key={idx}
                  name={`hostedBy-${idx}`}
                  id="host"
                  value={host.name}
                  onChange={(e) => handleChange(e, idx)}
                  className="w-full mb-2 p-2 rounded bg-zinc-800"
                  placeholder={`Host ${idx + 1} name`}
                />
              ))}
              <button
                type="button"
                onClick={addHost}
                className="text-sm text-space-accent underline"
              >
                + Add another host
              </button>
            </div>

            {/* Dropdowns */}
            <div>
              <label
                htmlFor="event-type"
                className="block text-sm text-gray-400"
              >
                Event Category:
              </label>
              <select
                id="event-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-2 rounded bg-zinc-800"
                required
              >
                <option value="">-- Select Event Category --</option>
                <option value="community">Community</option>
                <option value="astronomical">Astronomical</option>
              </select>
            </div>

            {/* <div>
              <label htmlFor="status" className="block text-sm text-gray-400">
                Event Status:
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full p-2 rounded bg-zinc-800"
                required
              >
                <option value="">-- Event Status --</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div> */}

            <div>
              <label htmlFor="isFree" className="block text-sm text-gray-400">
                Event Type:
              </label>
              <select
                id="isFree"
                name="isFree"
                value={formData.isFree ? "true" : "false"}
                onChange={handleChange}
                className="w-full p-2 rounded bg-zinc-800"
                required
              >
                <option value="true">Free</option>
                <option value="false">Paid</option>
              </select>
            </div>

            {!formData.isFree && (
              <>
                <div>
                  <label htmlFor="fee" className="block text-sm text-gray-400">
                    Fee Amount (₹):
                  </label>
                  <input
                    id="fee"
                    name="fee"
                    type="number"
                    value={formData.fee}
                    onChange={handleChange}
                    className="w-full p-2 rounded bg-zinc-800"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="upiId" className="block text-sm text-gray-400 mt-4">
                    UPI ID (To receive payments):
                  </label>
                  <input
                    id="upiId"
                    name="upiId"
                    type="text"
                    value={formData.upiId}
                    onChange={handleChange}
                    className="w-full p-2 rounded bg-zinc-800"
                    placeholder="yourname@bank"
                    required
                  />
                </div>
              </>
            )}

            {/* Ticket Required Toggle */}
            <div>
              <label htmlFor="isTicketRequired" className="block text-sm text-gray-400">
                Require Entry Ticket
              </label>
              <select
                id="isTicketRequired"
                name="isTicketRequired"
                value={formData.isTicketRequired ? "true" : "false"}
                onChange={handleChange}
                className="w-full p-2 rounded bg-zinc-800"
              >
                <option value="true">Yes – Generate ticket with QR code</option>
                <option value="false">No – No ticket needed</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                If disabled, registrants won't receive a QR code.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-space-accent p-2 rounded text-white font-bold"
            >
              {isSubmitting ? "Submitting..." : "Create Event"}
            </button>

            {successMsg && <p className="text-green-500 mt-2">{successMsg}</p>}
            {errorMsg && <p className="text-red-500 mt-2">{errorMsg}</p>}
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateEvent;
