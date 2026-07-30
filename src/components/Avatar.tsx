import { IconUser } from "./icons";

export default function Avatar({
  src,
  alt = "",
  className = "h-10 w-10",
}: {
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={`${className} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-navy text-white/40`}
    >
      <IconUser className="h-1/2 w-1/2" />
    </span>
  );
}
