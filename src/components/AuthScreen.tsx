"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MercuryMark from "./MercuryMark";
import AuthField from "./AuthField";
import {
  IconUser,
  IconLock,
  IconAt,
  IconMail,
  IconCalendar,
  IconGoogle,
  IconFacebook,
  IconX,
} from "./icons";

export default function AuthScreen({ initialTab }: { initialTab: "login" | "register" }) {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchTab(t: "login" | "register") {
    setTab(t);
    setError("");
  }

  async function post(url: string, payload: unknown) {
    setLoading(true);
    setError("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/feed");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Ocurrió un error");
    }
  }

  function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    post("/api/auth/login", { username: f.get("username"), password: f.get("password") });
  }

  function onRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    post("/api/auth/register", {
      nombre: f.get("nombre"),
      apellido: f.get("apellido"),
      username: f.get("username"),
      email: f.get("email"),
      birthdate: f.get("birthdate"),
      password: f.get("password"),
      password2: f.get("password2"),
    });
  }

  return (
    <section className="flex min-h-screen w-full">
      {/* Panel del logo */}
      <aside className="hidden items-center justify-center bg-navy lg:flex lg:w-[63.54%]">
        <MercuryMark className="h-[60vh] w-auto" />
      </aside>

      {/* Panel de acceso */}
      <main className="mercury-authbg flex w-full flex-col items-center overflow-y-auto px-8 py-10 lg:w-[36.46%] lg:min-w-[600px]">
        <MercuryMark navy className="my-6 h-24 w-auto lg:my-10" />

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-6">
          <button
            type="button"
            onClick={() => switchTab("login")}
            className={tab === "login" ? "m-pill m-pill-outline" : "m-pill"}
          >
            Inicia Sesión
          </button>
          <button
            type="button"
            onClick={() => switchTab("register")}
            className={tab === "register" ? "m-pill m-pill-outline" : "m-pill"}
          >
            Registrate
          </button>
        </div>

        {/* Formularios */}
        <div className="mt-8 w-full max-w-md">
          {tab === "login" ? (
            <form onSubmit={onLogin} className="flex flex-col items-center gap-6">
              <div className="flex w-full max-w-[300px] flex-col gap-6">
                <AuthField label="Usuario" name="username" placeholder="Usuario" autoComplete="username" icon={<IconUser />} />
                <AuthField label="Contraseña" name="password" type="password" placeholder="Contraseña" autoComplete="current-password" icon={<IconLock />} />
              </div>
              <div className="flex w-full max-w-[300px] items-center justify-between text-sm text-navy">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="remember" className="accent-navy" />
                  Recuérdame
                </label>
                <span className="cursor-pointer font-semibold">¿Olvidó su Contraseña?</span>
              </div>
              <button disabled={loading} className="m-pill">
                {loading ? "Entrando…" : "Iniciar"}
              </button>
            </form>
          ) : (
            <form onSubmit={onRegister} className="flex flex-col items-center gap-6">
              <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
                <AuthField label="Nombre" name="nombre" placeholder="Escribe tu nombre" autoComplete="given-name" icon={<IconUser />} />
                <AuthField label="Apellido" name="apellido" placeholder="Escribe tu apellido" autoComplete="family-name" icon={<IconUser />} />
                <AuthField label="Usuario" name="username" placeholder="Usuario" autoComplete="username" icon={<IconAt />} />
                <AuthField label="E-mail" name="email" type="email" placeholder="correo@mercury.com" autoComplete="email" icon={<IconMail />} />
                <AuthField label="Fecha de nacimiento" name="birthdate" type="date" icon={<IconCalendar />} />
                <AuthField label="Contraseña" name="password" type="password" placeholder="Contraseña" autoComplete="new-password" icon={<IconLock />} />
                <div className="sm:col-span-2">
                  <AuthField label="Confirma Contraseña" name="password2" type="password" placeholder="Contraseña" autoComplete="new-password" icon={<IconLock />} />
                </div>
              </div>
              <label className="flex max-w-md items-start gap-2 text-xs text-navy">
                <input type="checkbox" required className="mt-0.5 accent-navy" />
                Confirmo que soy mayor de 18 años y acepto los términos.
              </label>
              <button disabled={loading} className="m-pill">
                {loading ? "Creando…" : "Continuar"}
              </button>
            </form>
          )}

          {error && <p className="mt-4 text-center text-sm font-semibold text-red-700">{error}</p>}
        </div>

        {/* Social */}
        <div className="mt-auto flex flex-col items-center gap-3 pt-8">
          <p className="font-semibold text-navy">Iniciar con</p>
          <div className="flex gap-6">
            <span className="m-ico-circle" title="Google (próximamente)"><IconGoogle /></span>
            <span className="m-ico-circle" title="Facebook (próximamente)"><IconFacebook /></span>
            <span className="m-ico-circle" title="X (próximamente)"><IconX /></span>
          </div>
        </div>
      </main>
    </section>
  );
}
