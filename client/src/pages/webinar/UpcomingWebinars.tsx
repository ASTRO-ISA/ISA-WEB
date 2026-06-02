import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Calendar, Clock, Users, MoreVertical } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Spinner from "@/components/ui/Spinner";
import PaymentModal from "@/components/popups/PymentModal";
import FormatDate from "@/components/ui/FormatDate";
import FormatTime from "@/components/ui/FormatTime";
import { Link } from "react-router-dom";

const UpcomingWebinars = () => {
  const { userInfo, isLoggedIn, isAdmin } = useAuth();
  const { toast } = useToast();

  const [loadingRegWebId, setLoadingRegWebId] = useState(null);
  const [upcomingWebinars, setUpcomingWebinars] = useState([]);
  const [featuredId, setFeaturedId] = useState(null);

  // Modal state
  const [selectedWebinar, setSelectedWebinar] = useState(null);

  const isRegistered = (webinar) =>
    webinar.attendees?.some(
      (a) =>
        (a.user?._id || a.user)?.toString() === userInfo?.user._id?.toString()
    );

  const fetchUpcomingWebinars = async () => {
    try {
      const res = await api.get("/webinars/upcoming");
      setUpcomingWebinars(res.data);
    } catch (error) {
      console.error("Error fetching webinars:", error.message);
    }
  };

  const fetchFeatured = async () => {
    try {
      const res = await api.get("/webinars/featured");
      if (res.status === 404) return;
      setFeaturedId(res.data._id);
    } catch {
      console.error("No featured webinar at the moment.");
      setFeaturedId(null);
    }
  };

  useEffect(() => {
    fetchUpcomingWebinars();
    fetchFeatured();
  }, []);

  const handleRegister = async (userId, webinar) => {
    if (!isLoggedIn) {
      return toast({
        title: "Hold on!",
        description: "Please login first to register for the webinar.",
        variant: "destructive",
      });
    }

    setLoadingRegWebId(webinar._id);
    try {
      await api.patch(`/webinars/register/${webinar._id}/${userId}`);
      fetchUpcomingWebinars();
    } catch {
      console.error("Error registering user for webinar.");
    } finally {
      setLoadingRegWebId(null);
    }
  };

  const handleUnregister = async (userId, webinarId) => {
    if (!isLoggedIn) {
      return toast({
        title: "Hold on!",
        description: "Please login first to unregister for the webinar.",
        variant: "destructive",
      });
    }

    setLoadingRegWebId(webinarId);
    try {
      await api.patch(`/webinars/unregister/${webinarId}/${userId}`);
      fetchUpcomingWebinars();
      toast({
        description: "Unregistered successfully.",
      });
    } catch {
      toast({
        title: "Can't unregister.",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingRegWebId(null);
    }
  };

  const handleSetFeatured = async (webinar) => {
    if (featuredId) {
      return toast({
        title: "Already exist a featured webinar.",
        description: "Remove previous featured first.",
        variant: "destructive",
      });
    }

    try {
      await api.patch(`/webinars/featured/${webinar._id}`);
      setFeaturedId(webinar._id);
      fetchFeatured();
      toast({ description: `Webinar \"${webinar.title}\" set as featured.`, variant: "success" });
    } catch (err) {
      console.error(`Failed to set featured: ${err.message}`);
      toast({
        description: `Failed to set webinar \"${webinar.title}\" as featured!`,
        variant: "destructive",
      });
    }
  };

  const handleRemoveFeatured = async (webinar) => {
    try {
      await api.patch(`/webinars/featured/remove/${webinar._id}`);
      setFeaturedId(null);
      fetchFeatured();
      toast({ title: `\"${webinar.title}\" removed from featured.` });
    } catch (err) {
      console.error(`Failed to remove featured: ${err.message}`);
      toast({
        description: `Failed to remove webinar \"${webinar.title}\" from featured!`,
        variant: "destructive",
      });
    }
  };

  return (
    <section className="mb-20 relative">
      <h2 className="text-2xl font-bold mb-8 text-center sm:text-start">Upcoming Live</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {upcomingWebinars.length === 0 ? (
          <p className="text-gray-500 italic text-center sm:text-start">No upcoming webinars right now!</p>
        ) : (
          upcomingWebinars.map((webinar) => (
            <div
              key={webinar._id}
              className="cosmic-card overflow-hidden group flex flex-col relative"
            >
              <Link to={`/webinars/${webinar.slug}`} className="flex-1 flex flex-col relative group cursor-pointer">
                <div className="relative w-full aspect-video overflow-hidden rounded-lg">
                  <img
                    src={webinar.thumbnail}
                    alt={webinar.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {webinar.status === "upcoming" && new Date() >= new Date(webinar.webinarDate) && (
                    <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 z-10">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      Live
                    </span>
                  )}
                </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-3">{webinar.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{webinar.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-400">
                      <Calendar className="h-4 w-4 mr-2 text-space-accent" />
                      <span><FormatDate date={webinar.webinarDate}/></span>
                    </div>
                    <div className="flex items-center text-sm text-gray-400">
                      <Clock className="h-4 w-4 mr-2 text-space-accent" />
                      <span><FormatTime date={webinar.webinarDate} /></span>
                    </div>
                    {webinar.isRegistrationRequired && (
                      <div className="flex items-center text-sm text-gray-400">
                        <Users className="h-4 w-4 mr-2 text-space-accent" />
                        <span>{webinar.attendees.length} registered</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div>
                    {webinar.guests?.filter((g) => g.trim() !== "").length > 0 && (
                      <p className="text-sm text-gray-400">
                        Guest: {webinar.guests.filter((g) => g.trim() !== "").join(", ").toUpperCase()}
                      </p>
                    )}
                    <h4 className="text-sm text-gray-400">
                      Presenter: {(webinar.presenter || "Unknown").toUpperCase()}
                    </h4>
                  </div>
                </div>
              </div>
              </Link>
              
              <div className="absolute top-3 right-3 z-20">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="text-white bg-black/40 hover:bg-black/60 rounded-full p-1 h-8 w-8">
                      <MoreVertical size={18} />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent side="left" align="end" className="w-40 bg-black border border-gray-800 text-white text-sm shadow-xl">
                    <DropdownMenuItem
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() =>
                        navigator.share
                          ? navigator.share({
                              title: webinar.title,
                              text: "Check out this webinar!",
                              url: `${window.location.origin}/webinars/${webinar.slug}`,
                            })
                          : alert("Sharing not supported on this browser.")
                      }
                    >
                      Share
                    </DropdownMenuItem>

                    {isAdmin && featuredId !== webinar._id && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetFeatured(webinar);
                        }}
                      >
                        Set as Featured
                      </DropdownMenuItem>
                    )}

                    {isAdmin && featuredId === webinar._id && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFeatured(webinar);
                        }}
                        className="text-red-600 focus:text-red-600"
                      >
                        Remove Featured
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Register Button */}
              {webinar.isRegistrationRequired ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    isRegistered(webinar)
                      ? !webinar.isFree && isRegistered(webinar)
                        ? null
                        : handleUnregister(userInfo?.user._id, webinar._id)
                      : webinar.isFree
                      ? handleRegister(userInfo?.user._id, webinar)
                      : setSelectedWebinar({ ...webinar, item_type: "webinar" })
                  }}
                  disabled={!webinar.isFree && isRegistered(webinar)}
                  className={`w-full md:w-auto px-6 py-3 rounded-md transition text-white font-semibold flex justify-center z-10 relative
                    ${
                      isLoggedIn && isRegistered(webinar)
                        ? webinar.isFree
                          ? "bg-space-purple/30 hover:bg-space-purple/50"
                          : "bg-gray-500 cursor-not-allowed"
                        : "bg-space-accent hover:bg-space-accent/80"
                    }`}
                >
                  {loadingRegWebId === webinar._id ? (
                    <Spinner />
                  ) : isLoggedIn && isRegistered(webinar) ? (
                    webinar.isFree ? (
                      "Unregister"
                    ) : (
                      "Already Registered (Paid)"
                    )
                  ) : webinar.isFree ? (
                    "Register for this Webinar"
                  ) : (
                    `Register - ₹${webinar.fee}`
                  )}
                </button>
              ) : (
                <Link
                  to={`/webinars/${webinar.slug}`}
                  className="w-full md:w-auto px-6 py-3 rounded-md transition text-white font-semibold flex justify-center bg-space-purple/30 hover:bg-space-purple/50 text-center z-10 relative"
                >
                  {webinar.status === "upcoming" && new Date() >= new Date(webinar.webinarDate)
                    ? "Watch Live"
                    : webinar.status === "upcoming"
                    ? "Upcoming"
                    : "Watch"}
                </Link>
              )}
            </div>
          ))
        )}
      </div>

      {/* Payment Modal */}
      {selectedWebinar && (
        <PaymentModal
          event={selectedWebinar}
          userId={userInfo?.user._id}
          onClose={() => setSelectedWebinar(null)}
        />
      )}
    </section>
  );
};

export default UpcomingWebinars;