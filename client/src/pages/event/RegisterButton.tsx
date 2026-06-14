import Spinner from "@/components/ui/Spinner";

const RegisterButton = ({
  event,
  userInfo,
  loadingEventId,
  handleRegister,
  handleUnregister,
  handlePaidRegister,
  toast,
}) => {
  const normalizeUserId = (id) => (id ? String(id) : null)
  
  const userRegistration = event.registeredUsers?.find((e) => {
    const registeredUserId = normalizeUserId(e?.user?._id || e?.user)
    return registeredUserId === normalizeUserId(userInfo?.user?._id)
  })

  const alreadyRegistered = !!userRegistration;
  const regStatus = userRegistration?.status;

  // Check if registration is closed
  if (!event.isRegistrationOpen) {
    return (
      <button
        disabled
        className="w-full md:w-auto px-6 py-3 rounded-md transition text-white font-semibold flex justify-center bg-gray-700 cursor-not-allowed"
      >
        Registration Closed
      </button>
    );
  }

  // Handle click logic
  const handleClick = () => {
    if (alreadyRegistered) {
      // Allow unregister if free event
      if (event.isFree) {
        handleUnregister(userInfo?.user?._id, event._id);
      } else if (regStatus === 'payment_not_found') {
        handlePaidRegister(userInfo?.user?._id, event);
      }
    } else {
      if (
        event.seatCapacity &&
        (event.attendeeCount ?? 0) >= event.seatCapacity
      ) {
        toast({
          title: "Sold Out",
          description: "This event has reached maximum capacity.",
          variant: "destructive",
        });
      } else if (event.isFree) {
        handleRegister(userInfo?.user?._id, event._id);
      } else {
        handlePaidRegister(userInfo?.user?._id, event);
      }
    }
  };

  // Decide button style
  const buttonClass = alreadyRegistered
    ? event.isFree
      ? "bg-space-purple/30 hover:bg-space-purple/50"
      : regStatus === 'pending'
      ? "bg-yellow-600 cursor-not-allowed"
      : regStatus === 'payment_not_found'
      ? "bg-red-600 hover:bg-red-700"
      : "bg-green-600 cursor-not-allowed" // approved
    : event.seatCapacity && (event.attendeeCount ?? 0) >= event.seatCapacity
    ? "bg-gray-600 cursor-not-allowed"
    : "bg-space-accent hover:bg-space-accent/80";

  // Decide if button should be disabled
  const buttonDisabled =
    (!event.isFree && alreadyRegistered && (regStatus === 'pending' || regStatus === 'approved')) ||
    (event.seatCapacity &&
      (event.attendeeCount ?? 0) >= event.seatCapacity &&
      !alreadyRegistered);

  // Button label logic
  const getButtonLabel = () => {
    if (loadingEventId === event._id) return <Spinner />;
    if (alreadyRegistered) {
      if (event.isFree) return "Unregister";
      if (regStatus === 'pending') return "Being Verified";
      if (regStatus === 'payment_not_found') return "Payment Not Found - Try Again";
      return "Registered";
    }
    if (
      event.seatCapacity &&
      (event.attendeeCount ?? 0) >= event.seatCapacity
    )
      return "Sold Out";
    return event.isFree
      ? "Register for this Event"
      : `Register - ₹${event.fee}`;
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

export default RegisterButton;