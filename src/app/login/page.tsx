"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell, { Field } from "@/components/AuthShell";
import { IconUser, IconLock, IconGoogle, IconFacebook, IconX } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: fd.get("username"),
        password: fd.get("password"),
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/feed");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al iniciar sesión");
    }
  }

  return (
    <AuthShell
      titulo="Iniciar sesión"
      alt={{ texto: "¿No tienes cuenta?", href: "/register", label: "Registrarte" }}
    >
      <form onSubmit={onSubmit}>
        <Field
          label="Usuario"
          name="username"
          autoComplete="username"
          placeholder="Usuario"
          icon={<IconUser />}
        />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          icon={<IconLock />}
        />

        <div className="mb-5 flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-white/70">
            <input type="checkbox" name="remember" className="accent-purple" />
            Recuérdame
          </label>
          <a href="#" className="font-medium text-purple hover:underline">
            ¿Olvidó su contraseña?
          </a>
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-purple py-2.5 font-medium text-navy transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Iniciar"}
        </button>
      </form>

      {/* Separador */}
      <div className="my-5 flex items-center gap-3 text-xs text-white/30">
        <span className="h-px flex-1 bg-white/10" />
        o continúa con
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {/* Botones sociales */}
      <div className="grid grid-cols-3 gap-3">
        <SocialButton label="Google" onClick={() => alert("Login con Google — pendiente de OAuth")}>
          <IconGoogle className="h-5 w-5" />
        </SocialButton>
        <SocialButton label="Facebook" onClick={() => alert("Login con Facebook — pendiente de OAuth")}>
          <IconFacebook className="h-5 w-5" />
        </SocialButton>
        <SocialButton label="X" onClick={() => alert("Login con X — pendiente de OAuth")}>
          <IconX className="h-5 w-5" />
        </SocialButton>
      </div>
    </AuthShell>
  );
}

function SocialButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Continuar con ${label}`}
      className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-navy py-2.5 text-white/80 transition hover:border-purple hover:text-white"
    >
      {children}
      <span className="text-sm">{label}</span>
    </button>
  );
}
