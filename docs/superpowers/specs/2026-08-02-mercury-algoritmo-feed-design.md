# Mercury — Algoritmo de Feed (personalización por comportamiento)

- **Fecha:** 2026-08-02
- **Estado:** DISEÑO / documentado. **No implementado.** Consume las preferencias de [[2026-08-02-mercury-registro-preferencias-reset-design]] (sexualidad/nacionalidad para cold-start). Construir **después** de ese spec.
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`).
- **Stack:** Next.js 16 · React 19 · TS · Prisma 6 · PostgreSQL.

## Objetivo

Reemplazar el orden **cronológico** del feed por un **ranking por relevancia**, distinto en cada pestaña. Sin ML, sin tracking nuevo: scoring **heurístico** sobre señales que ya están en la DB (Like, Follow, Comment, Purchase, Bookmark, tips vía WalletTransaction, hashtags del body) + cold-start por preferencias declaradas.

## Comportamiento por pestaña (candidatos + ranking)

Cada pestaña mantiene su **filtro** de candidatos; dentro, se ordena por `score` desc.

| Pestaña | Candidatos | Ranking |
|---|---|---|
| **Explora** | Autores que **NO** sigues, **no** adulto | Por tus datos/comportamiento → descubrir gente afín |
| **Feed** | Autores que **SÍ** sigues, **no** adulto | Por tus datos/comportamiento entre a quienes sigues |
| **Tabú** | Contenido **adulto** (`isAdult`), **mezcla** seguidos + no-seguidos | Ranking + explora dentro de adulto (no solo seguidos) |

(Hoy `getFeedByTab` filtra así en cronológico; se cambia el `orderBy` por scoring.)

## Señales (todas ya en DB)

Por cada post candidato, respecto al viewer:

1. **Afinidad de autor** (`authorAffinity`): cuánto has interactuado con ese autor — like/comentario/compra/propina a sus posts, o lo sigues. Se agrega en un score por autor (interacciones históricas del viewer con ese autor, con decaimiento). Extensión: co-engagement (autores que gustan a quienes tú sigues) — v1 opcional.
2. **Afinidad de hashtags** (`tagAffinity`): tags del post (parseados del body, ya hay `getTrends`/`lib/search`) ∩ tu **perfil de tags** (tags de los posts que has likeado/guardado). Solapamiento normalizado.
3. **Popularidad** (`popularity`): `log(1 + likeCount + comentarios)` — prior de calidad.
4. **Recencia** (`recency`): decaimiento temporal (ej. `exp(-Δhoras/τ)`) para no mostrar sólo viejo.
5. **Cold-start** (`coldStartMatch`): match del autor con tus preferencias declaradas — misma `nationality`, `sexuality` compatible, `mode` afín. **Peso alto cuando tienes poca conducta** (usuario nuevo); baja a medida que acumulas señales.

## Scoring

```
score = wA·authorAffinity + wT·tagAffinity + wP·popularity + wR·recency + wC·coldStartMatch
```

- Pesos `w*` constantes ajustables en `src/lib/ranking.ts`. `wC` se **auto-atenúa** según cantidad de señales conductuales del viewer (`coldStartWeight(viewerSignalCount)`).
- **Exploración anti-burbuja:** reservar un % del feed (ej. 15-20%) a posts frescos/populares fuera del ranking puro, para no encerrar. Intercalar.
- **Anti-repetición:** no repetir el mismo autor seguido (diversidad); penalización suave por autor ya mostrado en la página.

## Cómputo (v1: query-time)

- `getFeedByTab(viewerId, tab)`:
  1. Cargar **candidatos** recientes del filtro de la pestaña (ej. últimos N=300 posts que cumplen el filtro).
  2. Precargar en lote las señales del viewer: sus likes/follows/purchases/bookmarks (sets de autorIds y postIds), su perfil de tags, y las preferencias (sexuality/nationality/mode).
  3. Calcular `score` por candidato en memoria (sin N+1). Ordenar desc, aplicar exploración+diversidad, paginar.
- **Rendimiento:** N acotado + agregados en lote = barato a escala dev. A escala real: precomputar afinidades por autor (tabla/materialized view) o job. Fuera de v1.
- Reusa el shaping `toFeedPost` existente; sólo cambia la selección+orden de candidatos.

## Integración

- `lib/queries.ts`: `getFeedByTab` cambia de `orderBy createdAt` a: cargar candidatos por filtro → `rankPosts(viewerId, candidates, tab)` (nuevo `lib/ranking.ts`) → devolver ordenados.
- Paginación: cursor por posición en el ranking (o "cargar más" que re-rankea con offset). v1: primera página rankeada (los tabs ya cargan por fetch en `FeedTabs`).
- No cambia la UI (`FeedTabs`/`PostCard`); sólo el orden.

## Bloques

| # | Bloque | Depende |
|---|--------|---------|
| 1 | `lib/ranking.ts`: perfil de señales del viewer (lote) + `scorePost` + pesos | prefs (spec registro) |
| 2 | `getFeedByTab` usa candidatos por filtro + `rankPosts` (Explora/Feed) | 1 |
| 3 | Tabú: candidatos mezcla seguidos+no-seguidos adultos + ranking | 1,2 |
| 4 | Exploración anti-burbuja + diversidad de autor | 2,3 |
| 5 | (futuro/escala) precómputo de afinidades | 2 |

## Fuera de alcance

- ML / embeddings, tracking de tiempo-en-post o impresiones (no hay instrumentación), co-engagement avanzado (grafo), precómputo/materialización (v1 es query-time), A/B de pesos.

## Notas

- Sin preferencias declaradas (usuarios existentes pre-registro-nuevo), el cold-start no aporta; el ranking cae en conducta+popularidad+recencia (degradación elegante).
- Los pesos iniciales son un punto de partida; se afinan observando el feed.
