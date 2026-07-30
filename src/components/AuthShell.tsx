import Link from "next/link";
import MercuryMark from "./MercuryMark";

export default function AuthShell({
  titulo,
  children,
  alt,
}: {
  titulo: string;
  children: React.ReactNode;
  alt: { texto: string; href: string; label: string };
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <MercuryMark className="h-8 w-4" />
          <span className="text-xl font-semibold tracking-wide text-white">Mercury</span>
        </Link>
        <div className="rounded-2xl border border-white/10 bg-navy-2/60 p-7">
          <h1 className="mb-6 text-center text-xl font-semibold text-white">{titulo}</h1>
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-white/50">
          {alt.texto}{" "}
          <Link href={alt.href} className="font-medium text-purple hover:underline">
            {alt.label}
          </Link>
        </p>
      </div>
    </main>
  );
}

export function Field({
  label,
  type = "text",
  name,
  autoComplete,
}: {
  label: string;
  type?: string;
  name: string;
  autoComplete?: string;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm text-purple-soft">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-white/10 bg-navy px-3.5 py-2.5 text-white outline-none transition placeholder:text-white/30 focus:border-purple"
      />
    </label>
  );
}
