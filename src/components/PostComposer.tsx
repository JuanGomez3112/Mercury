"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PostComposer() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!body.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setLoading(false);
    if (res.ok) {
      setBody("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al publicar");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="¿Qué estás pensando?"
        maxLength={2000}
        rows={3}
        className="w-full resize-none rounded-lg border border-white/10 bg-navy px-3.5 py-2.5 text-white outline-none transition placeholder:text-white/30 focus:border-purple"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-white/30">{body.length}/2000</span>
        <button
          onClick={submit}
          disabled={loading || !body.trim()}
          className="rounded-lg bg-purple px-5 py-2 text-sm font-medium text-navy transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Publicando…" : "Publicar"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
