"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Zone = { id: string; name: string; countries: string[]; priceCents: number; priceCredits: number; isDefault: boolean };

const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";
const btn = "rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50";

export default function ZoneAdmin({ zones }: { zones: Zone[] }) {
  return (
    <div className="space-y-6">
      <NewZoneForm />
      <div className="space-y-3">
        {zones.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 text-center text-sm text-white/40">Sin zonas de envío aún.</p>
        ) : zones.map((z) => <ZoneRow key={z.id} zone={z} />)}
      </div>
    </div>
  );
}

function NewZoneForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [countries, setCountries] = useState("");
  const [priceCents, setPriceCents] = useState<number | "">("");
  const [priceCredits, setPriceCredits] = useState<number | "">("");
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/zones", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        countries: countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
        priceCents: priceCents === "" ? 0 : Number(priceCents),
        priceCredits: priceCredits === "" ? 0 : Number(priceCredits),
        isDefault,
      }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setName(""); setCountries(""); setPriceCents(""); setPriceCredits(""); setIsDefault(false);
      setMsg({ ok: true, text: "Zona creada" });
      router.refresh();
    } else setMsg({ ok: false, text: d.error ?? "Error" });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
      <h2 className="mb-3 text-sm font-semibold text-white/70">Nueva zona de envío</h2>
      <div className="space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (ej. Nacional)" className={input} />
        <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="Países, separados por coma (ej. MX,US)" className={input} />
        <div className="flex gap-2">
          <input type="number" min={0} value={priceCredits} onChange={(e) => setPriceCredits(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Envío ☾" className={input} />
          <input type="number" min={0} value={priceCents} onChange={(e) => setPriceCents(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Envío ¢" className={input} />
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-purple" />
          Zona por defecto (resto del mundo)
        </label>
        <button onClick={create} disabled={busy || !name.trim()} className={btn}>{busy ? "Creando…" : "Crear zona"}</button>
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}

function ZoneRow({ zone }: { zone: Zone }) {
  const router = useRouter();
  const [name, setName] = useState(zone.name);
  const [countries, setCountries] = useState(zone.countries.join(","));
  const [priceCents, setPriceCents] = useState(zone.priceCents);
  const [priceCredits, setPriceCredits] = useState(zone.priceCredits);
  const [isDefault, setIsDefault] = useState(zone.isDefault);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const small = "rounded-lg border border-white/10 bg-navy px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple";

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/admin/zones/${zone.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        countries: countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
        priceCents: Number(priceCents),
        priceCredits: Number(priceCredits),
        isDefault,
      }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); setMsg(d.error ?? "Error"); }
  }

  async function remove() {
    if (!confirm(`¿Eliminar zona "${zone.name}"?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/zones/${zone.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); setMsg(d.error ?? "Error"); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-navy-2/50 p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} className={`${small} w-32`} />
      <input value={countries} onChange={(e) => setCountries(e.target.value)} className={`${small} w-40`} placeholder="Países (coma)" />
      <input type="number" min={0} value={priceCredits} onChange={(e) => setPriceCredits(Number(e.target.value))} className={`${small} w-20`} placeholder="☾" />
      <input type="number" min={0} value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} className={`${small} w-20`} placeholder="¢" />
      <label className="flex items-center gap-1.5 text-xs text-white/60">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-3.5 w-3.5 accent-purple" />
        Default
      </label>
      <button onClick={save} disabled={busy} className="rounded-lg bg-purple px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Guardar</button>
      <button onClick={remove} disabled={busy} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 disabled:opacity-50">Eliminar</button>
      {msg && <span className="text-xs text-red-400">{msg}</span>}
    </div>
  );
}
