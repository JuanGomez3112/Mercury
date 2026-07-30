// Estado de "escribiendo…" en memoria (efímero, un proceso). from -> { to, at }
const store = new Map<string, { to: string; at: number }>();
const WINDOW = 5000; // ms

export function setTyping(from: string, to: string) {
  store.set(from, { to, at: Date.now() });
}

/** ¿`from` está escribiéndole a `to` en los últimos 5s? */
export function isTyping(from: string, to: string): boolean {
  const e = store.get(from);
  return !!e && e.to === to && Date.now() - e.at < WINDOW;
}
