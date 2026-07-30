import Link from "next/link";
import Nav from "@/components/Nav";
import MercuryMark from "@/components/MercuryMark";

const pilares = [
  {
    titulo: "Red social",
    desc: "Perfiles, feed y comunidad para mentes abiertas. El núcleo de Mercury.",
  },
  {
    titulo: "Contenido de pago",
    desc: "Creadores 18+ monetizan su contenido. Suscripciones y compras directas.",
  },
  {
    titulo: "Tienda Mercury",
    desc: "Artículos y merch propios del ecosistema, con envío y catálogo.",
  },
  {
    titulo: "Merycoin",
    desc: "Criptomoneda del ecosistema para pagos, propinas y recompensas.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center">
          <MercuryMark className="h-28 w-14" />
          <h1 className="mt-8 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            La red social para{" "}
            <span className="text-purple">mentes abiertas</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-purple-soft">
            Comunidad, contenido, tienda y economía propia — todo en un solo lugar.
            Solo para adultos 18+.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-xl bg-purple px-7 py-3.5 font-medium text-navy transition hover:opacity-90"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/15 px-7 py-3.5 font-medium text-white transition hover:bg-white/5"
            >
              Iniciar sesión
            </Link>
          </div>
        </section>

        {/* Pilares */}
        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pilares.map((p) => (
              <div
                key={p.titulo}
                className="rounded-2xl border border-white/10 bg-navy-2/50 p-6 transition hover:border-purple/40"
              >
                <h2 className="text-lg font-semibold text-white">{p.titulo}</h2>
                <p className="mt-2 text-sm leading-relaxed text-purple-soft/80">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/40">
        Mercury · Comunidad 18+ · Esqueleto v0 — sin backend todavía
      </footer>
    </>
  );
}
