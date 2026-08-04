import Link from "next/link";

/** Renderiza el cuerpo enlazando @menciones y #hashtags. */
export default function PostBody({ text }: { text: string }) {
  const parts = text.split(/(@[a-zA-Z0-9_]{2,30}|#[\p{L}0-9_]{1,50})/gu);
  return (
    <p className="mt-4 whitespace-pre-wrap break-words text-white/90">
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_]{2,30}$/.test(part)) {
          return (
            <Link key={i} href={`/u/${part.slice(1)}`} className="text-purple hover:underline">
              {part}
            </Link>
          );
        }
        if (/^#[\p{L}0-9_]{1,50}$/u.test(part)) {
          return (
            <Link key={i} href={`/buscar?q=${encodeURIComponent(part)}&type=tags`} className="text-purple hover:underline">
              {part}
            </Link>
          );
        }
        return part;
      })}
    </p>
  );
}
