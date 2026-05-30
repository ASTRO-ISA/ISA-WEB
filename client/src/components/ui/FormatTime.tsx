const FormatTime = ({ date }) => {
  if (!date) return null;

  const formatted = new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  return <span>{formatted}</span>;
};

export default FormatTime;