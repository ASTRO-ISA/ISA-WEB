import { Calendar, Users, Video } from "lucide-react";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/ui/Spinner";
import PaymentModal from "@/components/popups/PymentModal";
import FormatDate from "@/components/ui/FormatDate";
import FormatTime from "@/components/ui/FormatTime";
import WebinarRegisterButton from "./WebinarRegisterButton";

const WebinarDetail = () => {
  const { slug } = useParams();
  const { userInfo, isLoggedIn } = useAuth();
  const [webinar, setWebinar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedWebinar, setSelectedWebinar] = useState<any>(null);
  const [playingVideo, setPlayingVideo] = useState(false);

  const fetchWebinar = async () => {
    try {
      const res = await api.get(`/webinars/${slug}`);
      setWebinar(res.data);
    } catch (err) {
      console.error("Error fetching webinar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebinar();
  }, [slug]);

  const handleRegister = async (userId: string, webinarId: string) => {
    if (!isLoggedIn) {
      return toast({
        title: "Hold on!",
        description: "Please login first to register for the webinar.",
        variant: "destructive",
      });
    }

    setLoadingEventId(webinarId);
    try {
      await api.patch(`/webinars/register/${webinarId}/${userId}`);
      fetchWebinar();
      toast({ description: "Registered successfully!" });
    } catch (err) {
      console.error("Error registering for webinar:", err);
      toast({
        description: "Failed to register. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingEventId(null);
    }
  };

  const handleUnregister = async (userId: string, webinarId: string) => {
    if (!isLoggedIn) {
      return toast({
        title: "Hold on!",
        description: "Please login first to unregister for the webinar.",
        variant: "destructive",
      });
    }

    setLoadingEventId(webinarId);
    try {
      await api.patch(`/webinars/unregister/${webinarId}/${userId}`);
      fetchWebinar();
      toast({ description: "Unregistered successfully." });
    } catch (err) {
      console.error("Error unregistering:", err);
      toast({
        description: "Can't unregister. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingEventId(null);
    }
  };

  const handlePaidRegister = async (_userId: string, webinarData: any) => {
    setSelectedWebinar(webinarData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-100">Loading...</p>
      </div>
    );
  }

  if (!webinar) {
    return (
      <p className="min-h-screen flex flex-col items-center justify-center">
        Webinar not found.
      </p>
    );
  }

  const isLive =
    webinar.status === "upcoming" &&
    new Date() >= new Date(webinar.webinarDate);

  const isUpcoming =
    webinar.status === "upcoming" && new Date() < new Date(webinar.webinarDate);

  return (
    <div className="min-h-screen bg-space-dark text-white pt-20 px-4">
      <main className="container mx-auto px-4 pt-8 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="relative w-full max-h-[500px] object-cover rounded-xl mb-6 aspect-[16/9] overflow-hidden group">
            {playingVideo ? (
              <iframe
                src={`https://www.youtube.com/embed/${webinar.videoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1`}
                title={webinar.title}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full absolute inset-0"
              />
            ) : (
              <div 
                className="w-full h-full cursor-pointer relative"
                onClick={() => setPlayingVideo(true)}
              >
                <img
                  src={webinar.thumbnail}
                  alt={webinar.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4l12 6-12 6z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            )}
            {isLive && !playingVideo && (
              <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 z-10">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                Live
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold mb-4 flex items-center gap-4">
            {webinar.title}
            {isLive && (
              <span className="bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                Live
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            {webinar.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
              <div className="flex items-center text-gray-400">
                <Calendar className="h-5 w-5 mr-2 text-space-accent" />
                <FormatDate date={webinar.webinarDate} />
                <span className="mx-2">•</span>
                <FormatTime date={webinar.webinarDate} />
              </div>
              <div className="flex items-center text-gray-400">
                <Video className="h-5 w-5 mr-2 text-space-accent" />
                Virtual / Online
              </div>
              {webinar.isRegistrationRequired && (
                <div className="flex items-center text-gray-400">
                  <Users className="h-5 w-5 mr-2 text-space-accent" />
                  {webinar.attendees?.length || 0} attending
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white">Presented by:</h3>
                <p className="text-gray-300">{webinar.presenter}</p>
              </div>
              {webinar.guests?.filter((g: string) => g.trim() !== "").length > 0 && (
                <div>
                  <h3 className="font-semibold text-white">Special Guests:</h3>
                  <ul className="text-space-accent list-disc list-inside">
                    {webinar.guests.filter((g: string) => g.trim() !== "").map((guest: any, index: number) => (
                      <p key={index}>{guest}</p>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <WebinarRegisterButton
            webinar={webinar}
            userInfo={userInfo}
            loadingEventId={loadingEventId}
            handleRegister={handleRegister}
            handleUnregister={handleUnregister}
            handlePaidRegister={handlePaidRegister}
            setPlayingVideo={setPlayingVideo}
            isLive={isLive}
            isUpcoming={isUpcoming}
            toast={toast}
          />
          
        </div>
      </main>

      {selectedWebinar && (
        <PaymentModal
          event={selectedWebinar}
          userId={userInfo?.user?._id}
          onClose={() => setSelectedWebinar(null)}
        />
      )}
    </div>
  );
};

export default WebinarDetail;
