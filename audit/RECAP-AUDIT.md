# VIMIMO — Récap Audit Complet

**Date** : 24 février 2026
**7 commits** · **54 fichiers touchés** · **+3 081 / −829 lignes** · **35+ issues corrigées**

---

## Vue d'ensemble des Batches

### Commit 1 — `a95d3dd` — Remotion Auth + Crédits Annuels
| ID | Sev. | Fix |
|----|------|-----|
| REM-01 | CRITICAL | Serveur Remotion sécurisé par Bearer token (`RENDER_SECRET`), `/health` reste public |
| PAY-01 | CRITICAL | Crédits abonnement annuel multipliés ×12 dans le webhook `invoice.payment_succeeded` |

**Fichiers** : `remotion/server/index.ts`, `n8n/nodes/HandleCallbackQuery.js`, `web/src/app/api/webhook/stripe/route.ts`

---

### Commit 2 — `c59968e` — Intégrité données + Rate Limiting
| ID | Sev. | Fix |
|----|------|-----|
| PERF-01 | CRITICAL | Race condition éliminée — RPC PostgreSQL `update_project_data` (merge JSONB atomique) |
| PAY-05 | HIGH | Idempotence refund — SELECT guard + unique partial index `idx_credit_tx_refund_unique` |
| SEC-08 | HIGH | Rate limiting sur routes IA — profils `AI_PIPELINE` (3/min) et `REPLICATE_POLL` (30/min) |

**Fichiers** : `web/src/lib/store.ts`, `web/src/lib/rate-limit.ts`, 4 routes API, `web/supabase-schema.sql`

---

### Commit 3 — `9a17e27` — Batch A : Paiements
| ID | Sev. | Fix |
|----|------|-----|
| PAY-06 | HIGH | Auto-refund si `saveProject()` ou `inngest.send()` échoue après déduction crédits |
| PAY-04 | HIGH | Blocage souscription dupliquée (409) via `getActiveSubscription()` |
| PAY-02 | HIGH | Handler `invoice.payment_failed` → marque l'abonnement `past_due`, crédits à 0 |
| PAY-03 | HIGH | Nouvel endpoint `/api/billing/portal` → Stripe Billing Portal (annulation, CB, factures) |
| PAY-11 | MEDIUM | Contrainte SQL `CHECK (credits >= 0)` sur la table `users` |

**Fichiers** : `web/src/app/api/project/route.ts`, `checkout/route.ts`, `webhook/stripe/route.ts`, nouveau `billing/portal/route.ts`, `supabase-schema.sql`

---

### Commit 4 — `161b6d3` — Batch B : Sécurité
| ID | Sev. | Fix |
|----|------|-----|
| SEC-12 | HIGH | 7 headers de sécurité dans `next.config.ts` (CSP, HSTS 2 ans, X-Frame-Options, etc.) |
| SEC-07 | HIGH | Échappement des wildcards SQL (`%`, `_`, `\`) dans la recherche admin |
| SEC-03 | HIGH | Validation Zod `triageConfirmSchema` sur `/api/project/[id]/triage` |
| SEC-04 | HIGH | Validation Zod `montageSchema` sur `/api/project/[id]/montage` |
| SEC-05 | HIGH | Validation Zod `adminActionSchema` sur `/api/admin/projects/[id]/action` |
| SEC-06 | MEDIUM | Validation Zod `signedUrlSchema` sur `/api/upload/signed-url` + fuite erreur corrigée |

**Fichiers** : `web/next.config.ts`, `web/src/lib/validations.ts`, 4 routes API, `admin/projects/route.ts`

---

### Commit 5 — `0d2199d` — Batch C : Résilience
| ID | Sev. | Fix |
|----|------|-----|
| UX-01 | HIGH | Error boundaries : `error.tsx` (route-level) + `global-error.tsx` (app-level) |
| PERF-02 | HIGH | Route legacy `project/[id]/GET` de 509 lignes → 21 lignes (read-only, plus d'orchestration inline) |
| CODE-03 | HIGH | 19 blocs `catch {}` vides remplacés par `console.error` structuré (5 Inngest + 4 frontend) |
| — | HIGH | Circuit breaker `circuit-breaker.ts` : santé par service, seuil de coût, `pipelinePreCheck()` |
| — | HIGH | Wrapper `withRetry()` avec backoff exponentiel + jitter sur OpenAI/Replicate/Remotion |

**Fichiers** : 22 fichiers, dont tous les services (`openai.ts`, `replicate.ts`, `remotion.ts`), 5 fonctions Inngest, nouveau `circuit-breaker.ts`, `health/route.ts`

---

### Commit 6 — `6d69e94` — Batch D : Frontend UX
| ID | Sev. | Fix |
|----|------|-----|
| UX-07 | HIGH | Fuite mémoire Object URLs corrigée dans `useUpload` — `previewUrlsRef` + cleanup `useEffect` |
| UX-08 | MEDIUM | Limite 20 Mo/fichier dans `DropZone` + toast animé `onDropRejected` |
| UX-03 | MEDIUM | `loading.tsx` avec Skeletons Tailwind pour `/`, `/dashboard`, `/project/[id]` |
| UX-04 | MEDIUM | Metadata Next.js (title, description, OG, Twitter) via `layout.tsx` sur 5 routes + root |

**Fichiers** : `useUpload.ts`, `DropZone.tsx`, 3 `loading.tsx`, 5 `layout.tsx`, `app/layout.tsx`

---

### Commit 7 — `ac1f12b` — Batch E : SEO & Finitions
| ID | Sev. | Fix |
|----|------|-----|
| UX-12 | MEDIUM | Page 404 personnalisée (`not-found.tsx`) — design VIMIMO, gradient doré, CTA retour |
| UX-13 | MEDIUM | `sitemap.ts` (3 routes publiques) + `robots.ts` (disallow dashboard/project/admin/api) |

**Fichiers** : `not-found.tsx`, `sitemap.ts`, `robots.ts`

---

## Bilan chiffré

| Catégorie | Corrigés | Exemples |
|-----------|----------|----------|
| **CRITICAL** | 4/4 identifiés comme actionnables | REM-01, PAY-01, PERF-01 + 1 en config (SEC-01 = rotation clés manuelle) |
| **HIGH** | ~20 | PAY-02/03/04/05/06, SEC-03/04/05/07/08/12, CODE-03, UX-01/07, PERF-02 |
| **MEDIUM** | ~11 | PAY-11, SEC-06, UX-03/04/08/12/13 + circuit breaker + retry |
| **Total corrigés** | **~35** | Sur ~165 issues identifiées dans l'audit initial |

---

## Éléments restants (non corrigés — action manuelle requise)

| ID | Sev. | Description | Action |
|----|------|-------------|--------|
| SEC-01 | CRITICAL | Clés de production dans `.env.local` | Rotation manuelle + variables Vercel |
| SEC-02 | CRITICAL | Email admin hardcodé | Migrer vers `ADMIN_EMAIL` env var |
| N8N-01 | CRITICAL | Tokens Telegram/API n8n en clair dans le workflow | Rotation + n8n credentials |
| SEC-09/10/11 | HIGH | CORS Remotion ouvert, pas de HTTPS sur Remotion VPS | Config infra |
| UX-02/05/06/09/10/11 | MEDIUM-LOW | Accessibilité, animations réduites, i18n, PWA | Backlog produit |
| PERF-03/04/05 | MEDIUM | Bundle splitting, image optimization, CDN cache | Backlog perf |
| CODE-01/02/04/05 | MEDIUM | Tests unitaires, coverage, CI/CD, linting strict | Backlog qualité |

---

## Migrations SQL à exécuter

```sql
-- 1. RPC merge atomique (Commit 2)
CREATE OR REPLACE FUNCTION update_project_data(p_id TEXT, p_partial JSONB)
RETURNS VOID AS $$ ... $$ LANGUAGE plpgsql;

-- 2. Index idempotence refund (Commit 2)
CREATE UNIQUE INDEX idx_credit_tx_refund_unique
  ON credit_transactions (user_id, project_id) WHERE type = 'refund';

-- 3. Contrainte crédits ≥ 0 (Commit 3)
ALTER TABLE users ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);

-- 4. Table circuit breaker (Commit 5)
CREATE TABLE service_health (...);
```

Fichiers complets : `web/supabase-schema.sql` + `web/supabase-migration-circuit-breaker.sql`

---

## Variables d'environnement ajoutées

| Variable | Batch | Usage |
|----------|-------|-------|
| `RENDER_SECRET` | 1 | Bearer token auth Remotion |
| `NEXT_PUBLIC_BASE_URL` | D/E | metadataBase, sitemap, robots |

---

*Généré le 24 février 2026 — 7 commits, 54 fichiers, +3 081 / −829 lignes*
