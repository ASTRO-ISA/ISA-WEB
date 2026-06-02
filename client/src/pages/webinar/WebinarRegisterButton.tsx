import Spinner from "@/components/ui/Spinner";

const WebinarRegisterButton = ({
  webinar,
  userInfo,
  loadingEventId,
  handleRegister,
  handleUnregister,
  handlePaidRegister,
  setPlayingVideo,
  isLive,
  isUpcoming,
  toast,
}: any) => {
  const normalizeUserId = (id) => (id ? String(id) : null);
  const alreadyRegistered = webinar.attendees?.some((e) => {
    const registeredUserId = normalizeUserId(e?.user?._id || e?.user);
    return registeredUserId === normalizeUserId(userInfo?.user?._id);
  });

  // If registration is NOT required
  if (!webinar.isRegistrationRequired) {
    let buttonLabel = "";
    let buttonClass = "";
    let onClick = () => {};

    if (isUpcoming) {
      buttonLabel = "Upcoming";
      buttonClass = "bg-gray-600 cursor-not-allowed text-gray-300";
    } else if (isLive) {
      buttonLabel = "Watch Live";
      buttonClass = "bg-red-600 hover:bg-red-700 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]";
      onClick = () => setPlayingVideo(true);
    } else {
      buttonLabel = "Watch";
      buttonClass = "bg-space-accent hover:bg-space-accent/80";
      onClick = () => setPlayingVideo(true);
    }

    return (
      <button
        onClick={onClick}
        disabled={isUpcoming}
        className={`w-full md:w-auto px-8 py-3 rounded-md transition-all text-white font-bold flex justify-center uppercase tracking-wide ${buttonClass}`}
      >
        {buttonLabel}
      </button>
    );
  }

  // Handle registration logic (if registration IS required)
  const handleClick = () => {
    if (alreadyRegistered) {
      if (webinar.isFree) {
        handleUnregister(userInfo?.user?._id, webinar._id);
      }
    } else {
      if (webinar.isFree) {
        handleRegister(userInfo?.user?._id, webinar._id);
      } else {
        handlePaidRegister(userInfo?.user?._id, webinar);
      }
    }
  };

  const buttonClass = alreadyRegistered
    ? webinar.isFree
      ? "bg-space-purple/30 hover:bg-space-purple/50"
      : "bg-gray-500 cursor-not-allowed"
    : "bg-space-accent hover:bg-space-accent/80";

  const buttonDisabled = !webinar.isFree && alreadyRegistered;

  const getButtonLabel = () => {
    if (loadingEventId === webinar._id) return <Spinner />;
    if (alreadyRegistered)
      return webinar.isFree ? "Unregister" : "Registered";
    return webinar.isFree
      ? "Register for this Webinar"
      : `Register - ₹${webinar.fee}`;
  };

  return (
    <button
      onClick={handleClick}
      disabled={buttonDisabled}
      className={`w-full md:w-auto px-6 py-3 rounded-md transition text-white font-semibold flex justify-center ${buttonClass}`}
    >
      {getButtonLabel()}
    </button>
  );
};

export default WebinarRegisterButton;
