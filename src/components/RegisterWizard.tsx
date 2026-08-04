"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SEXUALITIES, NATIONALITIES } from "@/lib/profile-options";

const field = "w-full rounded-full border border-navy/20 bg-white/70 px-4 py-2.5 text-sm text-navy outline-none placeholder:text-navy/40 focus:border-navy";
const labelCls = "mb-1 block text-sm font-medium text-navy/80";

export default function RegisterWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [f, setF] = useState({
    nombre: "", apellido: "", username: "", email: "", password: "", password2: "",
    sexuality: "", nationality: "", phone: "", recoveryEmail: "", birthdate: "", tyc: false,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  function next() {
    setError("");
    if (!f.nombre.trim() || !f.username.trim() || !f.email.trim() || !f.password) return setError("Completa los campos requeridos");
    if (f.username.trim().length < 3) return setError("Usuario: mínimo 3 caracteres");
    if (f.password.length < 8) return setError("Contraseña: mínimo 8 caracteres");
    if (f.password !== f.password2) return setError("Las contraseñas no coinciden");
    setStep(2);
  }

  async function submit() {
    setError("");
    if (!f.sexuality || !f.nationality || !f.birthdate) return setError("Completa sexualidad, nacionalidad y fecha de nacimiento");
    if (!f.tyc) return setError("Debes aceptar los términos");
    setBusy(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: f.nombre, apellido: f.apellido, username: f.username, email: f.email,
        password: f.password, password2: f.password2, birthdate: f.birthdate,
        sexuality: f.sexuality, nationality: f.nationality, phone: f.phone,
        recoveryEmail: f.recoveryEmail, tycAccepted: f.tyc,
      }),
    });
    setBusy(false);
    if (res.ok) { router.push("/feed"); router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Error al registrar"); setStep(1); }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex justify-center gap-3">
        <Link href="/login" className="rounded-full bg-navy px-6 py-2 text-sm font-bold text-white/90 hover:text-white">Inicia Sesión</Link>
        <span className="rounded-full border-2 border-navy px-6 py-2 text-sm font-bold text-navy">Registrate</span>
      </div>

      {step === 1 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label><span className={labelCls}>Nombre</span><input className={field} placeholder="Escribe tus nombres" value={f.nombre} onChange={set("nombre")} /></label>
          <label><span className={labelCls}>Apellido</span><input className={field} placeholder="Escribe tus apellidos" value={f.apellido} onChange={set("apellido")} /></label>
          <label><span className={labelCls}>Usuario</span><input className={field} placeholder="Escribe tu usuario" value={f.username} onChange={set("username")} /></label>
          <label><span className={labelCls}>E-mail</span><input className={field} type="email" placeholder="Escribe tu email" value={f.email} onChange={set("email")} /></label>
          <label><span className={labelCls}>Contraseña</span><input className={field} type="password" placeholder="••••••" value={f.password} onChange={set("password")} /></label>
          <label><span className={labelCls}>Confirma Contraseña</span><input className={field} type="password" placeholder="••••••" value={f.password2} onChange={set("password2")} /></label>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label><span className={labelCls}>Sexualidad</span>
            <select className={field} value={f.sexuality} onChange={set("sexuality")}>
              <option value="">Elige tu sexualidad</option>
              {SEXUALITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label><span className={labelCls}>Nacionalidad</span>
            <select className={field} value={f.nationality} onChange={set("nationality")}>
              <option value="">Elige tu nacionalidad</option>
              {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label><span className={labelCls}>Número de Teléfono</span><input className={field} placeholder="+1 ***" value={f.phone} onChange={set("phone")} /></label>
          <label><span className={labelCls}>E-mail de Recuperación</span><input className={field} type="email" placeholder="Escribe tu email" value={f.recoveryEmail} onChange={set("recoveryEmail")} /></label>
          <label className="sm:col-span-2"><span className={labelCls}>Fecha de Nacimiento</span><input className={field} type="date" value={f.birthdate} onChange={set("birthdate")} /></label>
          <label className="sm:col-span-2 flex items-start gap-2 text-xs text-navy/70">
            <input type="checkbox" checked={f.tyc} onChange={set("tyc")} className="mt-0.5 accent-navy" />
            <span>Al aceptar, aceptas las Políticas de datos, cookies y los Términos de confidencialidad. Podemos enviarte notificaciones por SMS que puedes desactivar cuando quieras.</span>
          </label>
        </div>
      )}

      {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex justify-center gap-3">
        {step === 2 && <button onClick={() => setStep(1)} className="rounded-full px-6 py-2.5 text-sm font-bold text-navy/60 hover:text-navy">Atrás</button>}
        {step === 1 ? (
          <button onClick={next} className="rounded-full bg-navy px-8 py-2.5 text-sm font-bold text-white">Siguiente</button>
        ) : (
          <button onClick={submit} disabled={busy} className="rounded-full bg-navy px-8 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Creando…" : "Registrarte"}</button>
        )}
      </div>
    </div>
  );
}
