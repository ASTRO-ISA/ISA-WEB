import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";

// Types
interface HostedBy { name: string; }
interface EventFormData {
  title: string;
  description: string;
  eventDate: string;
  eventEndTime: string;
  location: string;
  seatCapacity: string;
  eventType: string;
  hostedBy: HostedBy[];
  presentedBy: string;
  type: string;
  status: string;
  isFree: boolean;
  fee: string;
  isTicketRequired: boolean;
}

export default function EditEvent() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [eventId, setEventId] = useState<string | null>(null)

  const [eventFormData, setEventFormData] = useState<EventFormData>({
    title: "",
    description: "",
    eventDate: "",
    eventEndTime: "",
    location: "",
    seatCapacity: "",
    eventType: "",
    hostedBy: [{ name: "" }],
    presentedBy: "",
    type: "",
    status: "",
    isFree: true,
    fee: "",
    isTicketRequired: true,
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert ISO UTC string to local datetime-local format (YYYY-MM-DDTHH:mm)
  const toLocalDatetimeString = (isoString: string | undefined): string => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    // Pad to 2 digits
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Fetch Event Details
  useEffect(() => {
    if (!slug) return;
    api.get(`/events/${slug}`)
      .then(res => {
        const event = res.data;
        setEventId(event._id);
        setEventFormData({
          title: event.title ?? "",
          description: event.description ?? "",
          eventDate: toLocalDatetimeString(event.eventDate),
          eventEndTime: toLocalDatetimeString(event.eventEndTime),
          location: event.location ?? "",
          seatCapacity: event.seatCapacity?.toString() ?? "",
          eventType: event.eventType ?? "",
          hostedBy: event.hostedBy?.length ? event.hostedBy : [{ name: "" }],
          presentedBy: event.presentedBy ?? "",
          type: event.type ?? "",
          status: event.status ?? "",
          isFree: event.isFree ?? true,
          fee: event.fee ? event.fee.toString() : "",
          isTicketRequired: event.isTicketRequired ?? true,
        });
      })
      .catch(err => {
        console.error(err);
        toast({ title: "Error fetching event details" });
      });
  }, [slug]);

  // Handle Input Changes
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    idx: number | null = null
  ) => {
    const { name, value, type } = e.target;

    if (name.startsWith("hostedBy") && idx !== null) {
      const updatedHosts = [...eventFormData.hostedBy];
      updatedHosts[idx] = { name: value };
      setEventFormData({ ...eventFormData, hostedBy: updatedHosts });
    } else if (name === "isFree") {
      const isFree = value === "true";
      setEventFormData({ 
        ...eventFormData, 
        isFree, 
        fee: isFree ? "" : eventFormData.fee 
      });
    } else if (name === "isTicketRequired") {
      setEventFormData({ 
        ...eventFormData, 
        isTicketRequired: value === "true" 
      });
    } else if (type === "number") {
      setEventFormData({ 
        ...eventFormData, 
        [name]: value === "" ? "" : value 
      });
    } else {
      setEventFormData({ ...eventFormData, [name]: value });
    }
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setThumbnailFile(e.target.files[0]);
  };

  const addHost = () => {
    setEventFormData({ ...eventFormData, hostedBy: [...eventFormData.hostedBy, { name: "" }] });
  };

  // Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
        if (!eventId) throw new Error('Event ID is missing')
      const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (key === "hostedBy") {
            formData.append(key, JSON.stringify(value))
          } else if (key === "isFree") {
            formData.append(key, value ? "true" : "false")
          } else if (key === "isTicketRequired") {
            formData.append(key, value ? "true" : "false")
          } else if (key === "fee") {
            // only send fee for paid events; skip entirely for free events
            if (!data.isFree && value !== "" && value !== null && value !== undefined) {
              formData.append(key, value.toString())
            }
          } else if (value !== null && value !== undefined && value !== "") {
            formData.append(key, value.toString())
          }
        });
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
      return api.put(`/events/${eventId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      toast({ title: "Event updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate("/events");
    },
    onError: () => toast({ title: "Error updating event" }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    updateMutation.mutate(eventFormData, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  return (
    <div className="min-h-screen bg-space-dark text-white pt-20 px-4">
      <Helmet>
        <title>Admin: Edit Event | ISA-India</title>
        <meta name="description" content="Admin page for editing an event." />
      </Helmet>
      <main className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold pt-10">Edit Event</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Banner */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Event Banner</label>
              <input type="file" accept="image/*" onChange={handleThumbnailChange} className="block w-full text-sm text-gray-300 file:bg-space-purple/30 file:border-0 file:px-4 file:py-2 file:rounded file:text-white hover:file:bg-space-purple/50 transition"/>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm text-gray-400 mb-1">Title *</label>
              <input name="title" value={eventFormData.title} onChange={handleChange} className="w-full p-2 rounded bg-zinc-800" placeholder="Title *" required/>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="text-sm text-gray-400">Description (min 100 characters) (Drag from bottom right corner to expand)</label>
              <textarea name="description" value={eventFormData.description} onChange={handleChange} className="w-full p-2 rounded bg-zinc-800" placeholder="Description" required/>
              <p className="text-xs text-gray-400 mt-0">{eventFormData.description.length}</p>
            </div>

            {/* Dates */}
            <label htmlFor="eventDate" className="block text-gray-400 text-xs">
              Start Date and Time*
              <input type="datetime-local" name="eventDate" value={eventFormData.eventDate} onChange={handleChange} className="block p-2 mt-1 rounded bg-zinc-800" required/>
            </label>

            <label htmlFor="eventEndTime" className="block text-gray-400 text-xs">
              End Time*
              <input type="datetime-local" name="eventEndTime" value={eventFormData.eventEndTime} onChange={handleChange} className="block p-2 mt-1 rounded bg-zinc-800"/>
            </label>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm text-gray-400 mb-1">Location *</label>
              <input name="location" value={eventFormData.location} onChange={handleChange} className="w-full p-2 rounded bg-zinc-800" placeholder="Location *" required/>
            </div>

            {/* Seat Capacity */}
            <div>
              <label htmlFor="seatCapacity" className="block text-sm text-gray-400 mb-1">Seat Capacity *</label>
              <input name="seatCapacity" type="number" value={eventFormData.seatCapacity} onChange={handleChange} className="w-full p-2 rounded bg-zinc-800" placeholder="Seat Capacity *" min={1} required/>
            </div>

            {/* Event Type */}
            <div>
              <label htmlFor="eventType" className="block text-sm text-gray-400 mb-1">Event Type (Virtual/In-Person) *</label>
              <input name="eventType" value={eventFormData.eventType} onChange={handleChange} className="w-full p-2 rounded bg-zinc-800" placeholder="Event Type *" required/>
            </div>

            {/* Presented By */}
            <div>
              <label htmlFor="presentedBy" className="block text-sm text-gray-400 mb-1">Presented By</label>
              <input name="presentedBy" value={eventFormData.presentedBy} onChange={handleChange} className="w-full p-2 rounded bg-zinc-800" placeholder="Presented By"/>
            </div>

            {/* Hosted By */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Hosted By</label>
              {eventFormData.hostedBy.map((host, idx) => (
                <input key={idx} name="hostedBy" value={host.name} onChange={(e) => handleChange(e, idx)} className="w-full p-2 rounded bg-zinc-800 mb-2" placeholder={`Host ${idx + 1}`}/>
              ))}
              <button type="button" onClick={addHost} className="text-sm text-space-accent underline">+ Add another host</button>
            </div>

            {/* Dropdowns */}
            <div>
              <label htmlFor="type" className="block text-sm text-gray-400 mb-1">Event Category *</label>
              <select name="type" value={eventFormData.type} onChange={handleChange} className="w-full p-2 rounded bg-zinc-800" required>
                <option value="">-- Select Category --</option>
                <option value="community">Community</option>
                <option value="astronomical">Astronomical</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm text-gray-400 mb-1">Event Status *</label>
              <select name="status" value={eventFormData.status} onChange={handleChange} className="w-full p-2 rounded bg-zinc-800" required>
                <option value="">-- Event Status --</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label htmlFor="isFree" className="block text-sm text-gray-400 mb-1">Free / Paid</label>
              <select name="isFree" value={eventFormData.isFree ? "true" : "false"} onChange={handleChange} className="w-full p-2 rounded bg-zinc-800">
                <option value="true">Free</option>
                <option value="false">Paid</option>
              </select>
            </div>

            {!eventFormData.isFree && (
              <div>
                <label htmlFor="fee" className="block text-sm text-gray-400 mb-1">Fee Amount (₹) *</label>
                <input name="fee" type="number" value={eventFormData.fee} onChange={handleChange} min={1} placeholder="Fee Amount (₹)" className="w-full p-2 rounded bg-zinc-800" required/>
              </div>
            )}

            {/* Ticket Required Toggle */}
            <div>
              <label htmlFor="isTicketRequired" className="block text-sm text-gray-400 mb-1">Require Entry Ticket</label>
              <select name="isTicketRequired" value={eventFormData.isTicketRequired ? "true" : "false"} onChange={handleChange} className="w-full p-2 rounded bg-zinc-800">
                <option value="true">Yes – Generate ticket with QR code</option>
                <option value="false">No – No ticket needed</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">If disabled, registrants won't receive a QR code.</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-2">
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
              <Button type="button" onClick={() => navigate("/admin/events")} variant="outline">Cancel</Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
