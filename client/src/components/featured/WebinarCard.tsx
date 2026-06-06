import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const WebinarCard = ({ webinar }) => {
  const navigate = useNavigate();
  const { userInfo } = useAuth();

  if (!webinar) return null;

  // Derive webinar states based on your diff
  const isCurrentlyLive = webinar?.isLiveStream && webinar?.isLiveNow;
  const isUpcoming = !webinar?.isLiveNow;
  const isRegistered = webinar?.attendees?.some(
    (a) => (a.user?._id || a.user)?.toString() === userInfo?.user?._id?.toString()
  );

  // Handle navigation dynamically based on live status
  const handleNavigation = () => {
    if (isCurrentlyLive) {
      navigate(`/webinar/live/${webinar._id}`);
    } else {
      // Fallback to slug or ID for details page
      navigate(`/webinars/${webinar.slug || webinar._id}`);
    }
  };

  return (
    <div className="cosmic-card overflow-hidden shadow-lg h-full">
      <div
        onClick={handleNavigation}
        className="flex flex-col h-full cursor-pointer group"
      >
        {/* Image & Badges Section */}
        <div className="relative aspect-[16/9] sm:aspect-video shrink-0 overflow-hidden">
          <img
            src={webinar.thumbnail}
            alt={webinar.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* Free/Paid Badge */}
          <div
            className={`absolute top-3 left-3 bg-black/60 backdrop-blur-md border ${
              webinar.isFree
                ? "border-green-500/30 text-green-400"
                : "border-purple-500/30 text-purple-400"
            } text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full flex items-center shadow-lg uppercase tracking-wider`}
          >
            {webinar.isFree ? "FREE" : `PAID ₹${webinar.fee || 0}`}
          </div>

          {/* LIVE Badge */}
          {isCurrentlyLive && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-red-500/30 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full flex items-center shadow-lg uppercase tracking-wider">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              LIVE
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 sm:p-6 flex flex-col justify-between flex-1">
          <div>
            <p className="uppercase text-xs font-bold tracking-widest text-space-accent mb-2">
              Featured Webinar
            </p>
            <h3 className="text-lg sm:text-xl font-bold mb-2 line-clamp-2 group-hover:text-space-accent transition-colors">
              {webinar.title}
            </h3>
            {/* Switched from .slice() to CSS line-clamp for better description handling */}
            <p className="text-sm text-gray-400 line-clamp-3 overflow-y-auto max-h-24 pr-2 mb-3">
              {webinar.description}
            </p>
          </div>

          {/* Footer & Actions */}
          <div className="mt-auto">
            <p className="text-xs text-gray-500 mb-3">
              Date: {new Date(webinar.webinarDate).toLocaleDateString()} |{" "}
              Presenter: {webinar.presenter || "TBA"}
            </p>

            {/* Action Buttons */}
            <div className="space-y-2">
              {isCurrentlyLive ? (
                <div className="w-full py-2 bg-space-accent hover:bg-space-accent/90 transition-all duration-300 rounded-md text-white font-semibold text-sm flex justify-center shadow-md">
                  Watch Live
                </div>
              ) : isRegistered ? (
                <div className="w-full py-2 bg-green-500/10 border border-green-500/30 rounded-md text-green-400 font-semibold text-sm flex justify-center shadow-md">
                  Registered ✓
                </div>
              ) : isUpcoming ? (
                <div className="w-full py-2 bg-space-accent hover:bg-space-accent/90 transition-all duration-300 rounded-md text-white font-semibold text-sm flex justify-center shadow-md">
                  Register Now
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebinarCard;