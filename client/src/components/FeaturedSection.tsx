import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@mui/material/Skeleton";
import api from "@/lib/api";

const FeaturedSection = () => {
  // state to track fallbacks for arrays
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [currentLaunchIndex, setCurrentLaunchIndex] = useState(0);

  // queries
  const { data: upcomingEvent, isLoading: eventLoading } = useQuery({
    queryKey: ["upcomingEvent"],
    queryFn: async () => (await api.get("/events")).data?.[0] || null,
  });

  const { data: featuredWebinar, isLoading: webinarLoading } = useQuery({
    queryKey: ["featuredWebinar"],
    queryFn: async () => (await api.get("/webinars/featured")).data || null,
  });

  const { data: featuredBlog, isLoading: blogLoading } = useQuery({
    queryKey: ["featuredBlog"],
    queryFn: async () => (await api.get("/blogs/featured")).data || null,
  });

  const { data: newsArticles, isLoading: newsLoading } = useQuery({
    queryKey: ["featuredNews"],
    queryFn: async () => (await api.get("/news/articles")).data || [],
  });

  const { data: launches = [], isLoading: launchLoading } = useQuery({
    queryKey: ["launches"],
    queryFn: async () => (await api.get("/launches")).data || [],
  });

  const isLoading =
    blogLoading || newsLoading || eventLoading || webinarLoading || launchLoading;

  // derive current array items based on fallback state
  const currentNews = newsArticles?.[currentNewsIndex];
  const currentLaunch = launches?.[currentLaunchIndex];

  // build the priority queue
  const availableItems = [];

  if (upcomingEvent) availableItems.push({ type: "event", data: upcomingEvent });
  if (featuredWebinar) availableItems.push({ type: "webinar", data: featuredWebinar });
  if (featuredBlog) availableItems.push({ type: "blog", data: featuredBlog });
  if (currentNews) availableItems.push({ type: "news", data: currentNews });
  if (currentLaunch) availableItems.push({ type: "launch", data: currentLaunch });

  // slice strictly to 3 items based on availability
  const displayCards = availableItems.slice(0, 3);

  const cardClass =
    "cosmic-card flex flex-col flex-shrink-0 w-72 sm:w-80 lg:flex-1 lg:min-w-0 lg:max-w-none snap-start";

  const SkeletonCard = () => (
    <div className={cardClass}>
      <div className="h-[180px]">
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </div>
      <div className="p-5 flex flex-col justify-between flex-1 h-[260px]">
        <div className="space-y-2">
          <Skeleton variant="text" width="40%" height={18} />
          <Skeleton variant="text" width="90%" height={22} />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="95%" />
        </div>
        <Skeleton variant="text" width="50%" height={14} />
      </div>
    </div>
  );

  // helper to render the specific card UI based on type
  const renderCard = (item) => {
    const { type, data } = item;

    switch (type) {
      case "event":
      case "webinar":
        const isEvent = type === "event";
        return (
          <div key={type} className={cardClass}>
            <Link
              to={isEvent ? `/events/${data.slug}` : `/webinars/${data.slug}`}
              className="flex flex-col h-full"
            >
              <div className="h-[180px] shrink-0">
                <img
                  src={data.thumbnail}
                  alt={data.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-5 flex flex-col justify-between flex-1 h-[260px]">
                <div>
                  <p className="uppercase text-xs font-bold tracking-widest text-space-accent mb-2">
                    {isEvent ? "Upcoming Event" : "Featured Webinar"}
                  </p>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">{data.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-3 overflow-y-auto max-h-24 pr-2">
                    {data.description}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {isEvent ? `Venue: ${data.location}` : `Presenter: ${data.presenter || "TBA"}`}
                </p>
              </div>
            </Link>
          </div>
        );

      case "blog":
        return (
          <div key={type} className={cardClass}>
            <Link to={`/blogs/${data.slug}`} className="flex flex-col h-full">
              <div className="h-[180px] shrink-0">
                <img
                  src={data.thumbnail}
                  alt={data.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-5 flex flex-col justify-between flex-1 h-[260px]">
                <div>
                  <p className="uppercase text-xs font-bold tracking-widest text-space-accent mb-2">
                    Featured Blog
                  </p>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">{data.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">
                    Date: {new Date(data.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-400 line-clamp-3 overflow-y-auto max-h-24 pr-2">
                    {data.description}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Author: {data.author?.name?.toUpperCase() || "UNKNOWN"}
                </p>
              </div>
            </Link>
          </div>
        );

      case "news":
        return (
          <div key={type} className={cardClass}>
            <Link to={data.url} target="_blank" rel="noopener noreferrer" className="flex flex-col h-full">
              <div className="h-[180px] shrink-0">
                <img
                  src={data.image_url}
                  alt={data.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setCurrentNewsIndex((prev) => prev + 1)}
                />
              </div>
              <div className="p-5 flex flex-col justify-between flex-1 h-[260px]">
                <div>
                  <p className="uppercase text-xs font-bold tracking-widest text-space-accent mb-2">
                    Space News
                  </p>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">{data.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-4 overflow-y-auto max-h-24 pr-2">
                    {data.summary}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-3">Source: {data.news_site}</p>
              </div>
            </Link>
          </div>
        );

      case "launch":
        return (
          <div key={type} className={cardClass}>
            {/* If launches have a dedicated page later, wrap this in a Link */}
            <div className="flex flex-col h-full">
              <div className="h-[180px] shrink-0">
                <img
                  src={data.image?.image_url}
                  alt={data.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setCurrentLaunchIndex((prev) => prev + 1)}
                />
              </div>
              <div className="p-5 flex flex-col justify-between flex-1 h-[260px]">
                <div>
                  <p className="uppercase text-xs font-bold tracking-widest text-space-accent mb-2">
                    Upcoming Launch
                  </p>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">{data.name}</h3>
                  <p className="text-sm text-gray-400 line-clamp-4 overflow-y-auto max-h-24 pr-2">
                    {data.mission?.description || "Mission details pending."}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Agency: {data.launch_service_provider?.name || "Unknown"}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="mb-12 pt-16 px-4 sm:px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Top Picks</h2>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto hidden md:block">
          Handpicked highlights: the best blogs, latest news, and upcoming events you shouldn’t miss.
        </p>
      </div>

      <div className="overflow-x-auto lg:overflow-visible scrollbar-hide">
        <div className="flex gap-6 flex-nowrap lg:flex-wrap scroll-smooth snap-x snap-mandatory items-stretch justify-start lg:justify-center">
          
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            displayCards.map((item) => renderCard(item))
          )}

        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;