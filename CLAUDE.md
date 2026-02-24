# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VIMIMO is a virtual staging AI platform: empty room photos → AI-furnished cinematic videos. Three sub-projects in one monorepo:

- **`web/`** — Next.js 16 app (frontend + API + Inngest background jobs). Deployed on Vercel.
- **`remotion/`** — Remotion 4.0 video composition engine with Express render server. Deployed on VPS (Docker).
- **`n8n/`** — Telegram bot workflow (v2.1 interactive room selection). Deployed on Hetzner VPS.

## Commands

### Web (Next.js)
```bash
cd web
npm run dev          # Local dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (flat config, eslint.config.mjs)
```

### Remotion
```bash
cd remotion
npm run start        # Remotion Studio (preview compositions in browser)
npm run server       # Express render server on port 8000 (tsx server/index.ts)
npm run build        # Render VirtualStaging composition to out/video.mp4
npm run render       # Render with custom props from props.json
```

### n8n Workflow
```bash
cd n8n
node build-v21.js    # Assemble nodes/*.js → workflow-v2.json (readable IDs)
node build-deploy.js # Convert readable IDs → UUIDs for deployment
./deploy-v21.sh      # Full deploy: build + deactivate + API PUT + activate
```

## Architecture

### Pipeline Flow (staging_piece mode)

```
Upload → Cleaning (Flux remove furniture) → Analysis (GPT-4o Vision)
→ Generate 5 Options/room (Flux Kontext Pro) → User Selection
→ Video Generation (Kling v2.1 Pro) → Remotion Render → Done
```

Each step transitions `Project.phase` (defined in `web/src/lib/types.ts`). Project state is a JSONB column in the Supabase `projects` table.

### Event-Driven Backend (Inngest)

When `USE_INNGEST=true`, async work is handled by Inngest functions in `web/src/lib/inngest/functions/`:
- **cleaning-poll** — Polls Flux furniture-removal predictions (5s intervals)
- **auto-staging** — Full pipeline from triage confirmation through staging + videos + montage
- **videos** — Polls Kling video predictions per room
- **render-poll** / **montage** — Polls Remotion render status

All functions use `step.sleep()` for delays (not setTimeout). Events are emitted from API routes and the Replicate webhook handler.

Inngest serve route: `web/src/app/api/inngest/route.ts`

### Service Layer Pattern

All external API calls follow: **cost guard → circuit breaker → retry → track cost**

```
src/lib/services/openai.ts     — GPT-4o Vision (analysis, descriptions)
src/lib/services/replicate.ts  — Flux Kontext Pro (images) + Kling v2.1 Pro (videos)
src/lib/services/remotion.ts   — Remotion render server communication
src/lib/services/storage.ts    — Vercel Blob / Supabase Storage uploads
```

Retry profiles in `src/lib/retry.ts`. Circuit breaker in `src/lib/circuit-breaker.ts` (DB-backed state with 30s cache, 5 failures → open for 5min).

### Auth

NextAuth v5 (beta.30) with JWT strategy. Custom Supabase adapter (`src/lib/supabase-adapter.ts`) uses lazy `require()` to avoid build-time DB init. Providers: Google OAuth + Resend magic links.

Route protection: `requireAuth()` (any user), `requireProjectOwner()` (owns project), `requireAdmin()` (is_admin column).

### Credits & Payments

1 credit = 1 room. Stripe SDK v20.3.1 (API "2026-01-28.clover"). Credit packs (one-time) + monthly subscriptions. Webhooks at `src/app/api/webhook/stripe/route.ts`.

**Stripe SDK breaking changes** — `Subscription.current_period_end` → `SubscriptionItem.current_period_end`, `Invoice.subscription` → `Invoice.parent.subscription_details.subscription`.

### Database

Supabase PostgreSQL. Schema: `web/supabase-schema.sql`. Tables: users, accounts, verification_tokens, projects (JSONB data), credit_transactions, subscriptions, prediction_map, circuit_breaker_state. RLS enabled with service-role access.

### Remotion Compositions

- **PropertyShowcase** — Multi-room: Intro(90fr) → N×RoomSegment(210fr) with 20fr crossfade → Outro(90fr)
- **StudioMontage** — Property info overlay + music
- **VirtualStaging** — v1 speed-ramp single room (10s, 30fps)

Schemas in `remotion/src/schemas.ts`. Express server in `remotion/server/index.ts` (bundle on startup, async renderMedia).

### Replicate Webhooks

When `USE_INNGEST=true`, Replicate predictions include a webhook URL. The `prediction_map` table maps `prediction_id → project_id + type + roomIndex`. Webhook handler at `src/app/api/webhook/replicate/route.ts` uses Svix signature verification.

## Key Conventions

- **Path alias**: `@/*` maps to `web/src/*` in the Next.js app
- **Zod validation**: All API inputs validated with schemas from `src/lib/validations.ts` (Zod v4)
- **Project state**: Single JSONB column — read/modify/save pattern via `src/lib/store.ts` (getProject → mutate → saveProject)
- **Tailwind v4**: Uses `@tailwindcss/postcss` plugin (no tailwind.config — config in CSS)
- **React 19** with Next.js 16 App Router (no middleware — auth checks in each route)

## n8n Gotchas

These are critical bugs discovered in production:
1. **No spaces in trigger node names** — webhook URL breaks with %20
2. **Use telegramTrigger typeVersion 1, NOT 1.1** — v1.1 auto-generates secret_token that breaks on API PUT updates
3. **Code nodes: only native `https`/`http` + `require('url')`** — `fetch` is undefined, `axios` crashes in n8n sandbox
4. **IF node v2 boolean coercion is buggy** — `false` evaluates truthy; handle errors in Code nodes instead
5. **Telegram sendVideo needs multipart upload** — Telegram can't download from VPS IPs directly
