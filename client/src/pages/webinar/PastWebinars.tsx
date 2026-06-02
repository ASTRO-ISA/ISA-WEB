import { useState, useEffect } from "react";
import api from "@/lib/api";
import { MoreVertical } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

const PastWebinars = () => {
  const [pastWebinars, setPastWebinars] = useState([]);
  const [featuredId, setFeaturedId] = useState(null);

  const { isAdmin } = useAuth();
  const { toast } = useToast();

  // Helpers
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const handleShare = (webinar) => {
    const webinarUrl = `${window.location.origin}/webinars/${webinar.slug}`;
    if (navigator.share) {
      navigator.share({
        title: webinar.title,
        text: "Check out this webinar!",
        url: webinarUrl,
      });
    } else {
      navigator.clipboard.writeText(webinarUrl);
      toast({ description: "Link copied." });
    }
  };

  // API Calls
  const fetchPastWebinars = async () => {
    try {
      const res = await api.get("/webinars/past");
      setPastWebinars(res.data);
    } catch (error) {
      console.error("No past webinar at the moment.");
    }
  };

  const fetchFeatured = async () => {
    try {
      const res = await api.get("/webinars/featured");
      if (res.status !== 404) {
        setFeaturedId(res.data._id);
      }
    } catch (err) {
      console.error("No featured webinar at the moment.");
      setFeaturedId(null);
    }
  };

  useEffect(() => {
    fetchPastWebinars();
    fetchFeatured();
  }, []);

  // Featured Management
  const handleSetFeatured = async (webinar) => {
    if (featuredId) {
      toast({
        title: "Already exist a featured webinar.",
        description: "Remove previous featured to set a new one.",
        variant: "destructive",
      });
      return;
    }
    try {
      await api.patch(`/webinars/featured/${webinar._id}`);
      setFeaturedId(webinar._id);
      fetchFeatured();
      toast({ description: `Webinar \"${webinar.title}\" set as featured.`, variant: "success" });
    } catch (err) {
      console.error(`Failed to set webinar as featured:`, err.message);
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
      console.error(`Failed to remove featured webinar:`, err.message);
      toast({
        description: `Failed to remove webinar \"${webinar.title}\" from featured!`,
        variant: "destructive",
      });
    }
  };

  return (
    <section className="mb-20">
      <h2 className="text-2xl font-bold mb-8 text-center sm:text-start">Past Webinars</h2>

      {pastWebinars.length === 0 ? (
        <p className="text-gray-500 italic text-center sm:text-start">No past webinars at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pastWebinars.map((webinar) => (
            <div key={webinar._id} className="cosmic-card overflow-hidden group relative">
              <Link to={`/webinars/${webinar.slug}`} className="block">
                {/* Video or Thumbnail */}
                <div className="relative w-full aspect-video overflow-hidden rounded-lg">
                  <img
                    src={webinar.thumbnail}
                    alt={webinar.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                {/* Details */}
                <div className="p-4">
                  <p className="text-space-accent text-sm">
                    {formatDate(webinar.webinarDate)}
                  </p>
                  <h3 className="text-xl font-semibold mb-1 text-white line-clamp-2 min-h-[3rem]">
                    {webinar.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 min-h-[3rem]">
                    {webinar.description}
                  </p>

                  <div className="flex items-center justify-between">
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
                  <DropdownMenuContent align="end" className="w-40 bg-black border border-gray-800 text-white text-sm shadow-xl">
                    <DropdownMenuItem onClick={() => handleShare(webinar)} className="cursor-pointer">
                      Share
                    </DropdownMenuItem>

                    {isAdmin && featuredId !== webinar._id && (
                      <DropdownMenuItem onClick={() => handleSetFeatured(webinar)} className="cursor-pointer">
                        Set as Featured
                      </DropdownMenuItem>
                    )}

                    {isAdmin && featuredId === webinar._id && (
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                        onClick={() => handleRemoveFeatured(webinar)}
                      >
                        Remove Featured
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {pastWebinars.length > 3 && (
        <div className="text-center mt-10">
          <button className="inline-flex items-center justify-center px-6 py-3 border border-space-purple text-space-light hover:bg-space-purple/20 rounded-md text-lg font-medium transition-colors">
            View All
          </button>
        </div>
      )}
    </section>
  );
};

export default PastWebinars;