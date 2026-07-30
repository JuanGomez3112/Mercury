import Link from "next/link";
import type { ReactNode } from "react";
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
  placeholder,
  icon,
}: {
  label: string;
  type?: string;
  name: string;
  autoComplete?: string;
  placeholder?: string;
  icon?: ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm text-purple-soft">{label}</span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            {icon}
          </span>
        )}
        <input
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-white/10 bg-navy py-2.5 pr-3.5 text-white outline-none transition placeholder:text-white/30 focus:border-purple ${
            icon ? "pl-9" : "pl-3.5"
          }`}
        />
      </div>
    </label>
  );
}
