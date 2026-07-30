export default function MercuryMark({
  className = "",
  navy = false,
}: {
  className?: string;
  navy?: boolean;
}) {
  return (
    <span
      className={`mercury-mark ${navy ? "mercury-mark-navy" : ""} ${className}`}
      role="img"
      aria-label="Mercury"
    />
  );
}
