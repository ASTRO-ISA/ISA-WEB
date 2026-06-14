const FormatDate = ({ date }) => {
  if (!date) return null;

  const formatted = new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return <span>{formatted}</span>;
};

export default FormatDate;