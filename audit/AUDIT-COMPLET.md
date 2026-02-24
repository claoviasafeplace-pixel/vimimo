# VIMIMO — Audit Complet

**Date**: 24 Fevrier 2026
**Stack**: Next.js 16 + React 19 + NextAuth v5 + Inngest + Stripe + Supabase + Remotion 4.0 + n8n v2.1
**Total**: ~165 issues | 16 CRITICAL | 61 HIGH | 67 MEDIUM | ~42 LOW

---

## Top 10 — Actions immediates

| # | Sev. | ID | Issue | Risque |
|---|------|----|-------|--------|
| 1 | CRITICAL | N8N-01 | Tokens Telegram/n8n API key en clair dans le code source | Compromission totale du bot et de l'instance n8n |
| 2 | CRITICAL | SEC-01 | `.env.local` contient des cles Stripe `sk_live_` en production | Fraude carte bancaire possible |
| 3 | CRITICAL | PAY-01 | Abonnes annuels recoivent 1/12e des credits attendus | Perte de clients / remboursements massifs |
| 4 | CRITICAL | REM-01 | Serveur Remotion sans authentification (port 8000 ouvert) | N'importe qui peut lancer des renders couteux |
| 5 | CRITICAL | PERF-01 | Race condition sur `updateProject` (read-then-write sans lock) | Perte de donnees projet en production |
| 6 | HIGH | PAY-05 | `refundCredits()` sans garde d'idempotence — double remboursement | Perte financiere directe |
| 7 | HIGH | PAY-06 | Credits deduits mais pas rembourses si creation projet echoue | Perte de credits utilisateur |
| 8 | HIGH | PAY-03 | Pas de Stripe Billing Portal — utilisateurs ne peuvent pas annuler | Non-conformite RGPD / droit conso EU |
| 9 | HIGH | SEC-08 | 12+ routes API sans rate limiting (dont appels OpenAI/Replicate) | Couts API incontroles |
| 10 | HIGH | CODE-03 | 25+ blocs `catch {}` vides dans le pipeline — erreurs avalees | Projets bloques indefiniment |

---

# SECTION 1 — SECURITE & AUTHENTIFICATION

---

## CRITICAL

### SEC-01: Cles de production en clair dans `.env.local`

**Fichier**: `web/.env.local`

Les cles de production Stripe (`sk_live_`), Supabase service role, OpenAI, Replicate, et NextAuth secret sont stockees en clair sur le disque. Bien que `.env*` soit dans `.gitignore` et non suivi par git, ce sont des cles de production live.

**Risque**: Acces complet aux systemes de paiement, base de donnees, et APIs IA.

**Fix**:
1. Rotation immediate de toutes les cles
2. Utiliser les variables d'environnement Vercel (pas de fichier local avec des cles live)
3. En local, utiliser les cles Stripe test (`sk_test_*`)

### SEC-02: Email admin en dur dans le code source

**Fichier**: `web/src/lib/circuit-breaker.ts:14`

```typescript
const ADMIN_EMAIL = "claoviasafeplace@gmail.com";
```

**Fix**: Deplacer vers `process.env.ADMIN_EMAIL`.

---

## HIGH

### SEC-03: Validation manquante sur endpoint triage

**Fichier**: `web/src/app/api/project/[id]/triage/route.ts:26-27`

```typescript
const body = await request.json();
const { confirmedPhotos } = body as { confirmedPhotos: ConfirmedPhoto[] };
```

Le schema `triageConfirmSchema` existe dans `validations.ts` mais n'est jamais utilise.

**Fix**: `triageConfirmSchema.safeParse(body)` avant traitement.

### SEC-04: Validation manquante sur endpoint montage

**Fichier**: `web/src/app/api/project/[id]/montage/route.ts:45-48`

Le schema `montageSchema` existe mais n'est jamais importe. Le champ `customMusicUrl` n'est pas valide, permettant du SSRF.

**Fix**: `montageSchema.safeParse(body)` avant traitement.

### SEC-05: Validation manquante sur endpoint admin action

**Fichier**: `web/src/app/api/admin/projects/[id]/action/route.ts:19-21`

`body.action as string` sans validation Zod.

**Fix**: `z.object({ action: z.enum(["retry", "force_done", "refund"]) })`

### SEC-06: Validation manquante sur signed URL

**Fichier**: `web/src/app/api/upload/signed-url/route.ts:11`

`fileName` et `contentType` extraits sans validation. `fileName` pourrait contenir des caracteres de path traversal.

**Fix**: Validation Zod avec regex: `/^[a-zA-Z0-9._-]+$/`

### SEC-07: SQL wildcard injection via `ilike`

**Fichier**: `web/src/app/api/admin/projects/route.ts:26`

```typescript
.ilike("email", `%${search}%`)
```

**Fix**: `search.replace(/[%_]/g, "\\$&")` avant interpolation.

### SEC-08: 12+ routes API sans rate limiting

**Fichiers**: `project/[id]/route.ts`, `generate/`, `select/`, `montage/`, `render/`, `description/`, `triage/`, `dashboard/`, `replicate/[id]/`, `upload/signed-url/`, `health/`

Le rate limiter n'est applique que sur 3 routes. `RATE_LIMITS.DESCRIPTION` est defini mais jamais utilise.

**Fix**: Ajouter le rate limiting a toutes les routes, surtout celles qui appellent OpenAI/Replicate.

### SEC-09: Rate limiter in-memory non distribue

**Fichier**: `web/src/lib/rate-limit.ts:12`

En serverless (Vercel), chaque instance a son propre `Map`.

**Fix**: Migrer vers Upstash Redis (`@upstash/ratelimit`).

### SEC-10: Health check expose les details internes sans auth

**Fichier**: `web/src/app/api/health/route.ts:4-23`

Endpoint public qui expose l'etat des circuit breakers, compteurs de pannes, et URLs internes.

**Fix**: `requireAdmin()` ou retourner uniquement un boolean en public.

### SEC-11: SSRF via URLs utilisateur

**Fichiers**: `validations.ts`, `storage.ts:29`, `remotion.ts:113`

Les URLs utilisateur (`customMusicUrl`, `originalUrl`, `agencyLogoUrl`) sont validees uniquement avec `z.string().url()`. Un attaquant peut fournir des URLs internes (`http://169.254.169.254/`, `http://localhost:8000/`).

**Fix**: Valider `https://` uniquement + blocage IPs privees.

### SEC-12: Aucun header de securite configure

**Fichier**: `web/next.config.ts`

Pas de CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy.

**Fix**: Ajouter via `headers()` dans `next.config.ts`.

---

## MEDIUM

### SEC-13: IDOR sur endpoint statut Replicate

**Fichier**: `web/src/app/api/replicate/[id]/route.ts:5-23`

Tout utilisateur authentifie peut verifier le statut de n'importe quelle prediction Replicate.

**Fix**: Verifier via `prediction_map` que la prediction appartient au projet de l'utilisateur.

### SEC-14: Race condition sur deduction de credits (fallback)

**Fichier**: `web/src/lib/store.ts:252-257`

Le fallback read-then-write permet le double-spend si deux requetes concurrentes.

**Fix**: S'assurer que le RPC `decrement_credits` est deploye. Supprimer le fallback.

### SEC-15: Race condition sur ajout de credits (fallback)

**Fichier**: `web/src/lib/store.ts:209-212`

Meme probleme que SEC-14 mais pour l'ajout de credits.

### SEC-16: Protection replay webhooks incomplete

**Fichiers**: `webhook/replicate/route.ts`, `webhook/stripe/route.ts`

Les evenements de souscription Stripe n'ont pas de protection d'idempotence.

**Fix**: Tracker les event IDs traites dans une table `processed_webhook_events`.

### SEC-17: Service role key utilisee partout (bypass RLS)

**Fichier**: `web/src/lib/supabase.ts:7-8`

Toute l'application utilise la cle service role, bypassant les Row Level Security.

**Fix**: Utiliser la cle anon + RLS pour les operations utilisateur.

### SEC-18: Reponses OpenAI JSON.parse sans validation

**Fichier**: `web/src/lib/services/openai.ts:71,114,169,229`

Les reponses GPT-4o sont parsees avec `JSON.parse` sans validation Zod du resultat.

### SEC-19: `trustHost: true` dans la config auth

**Fichier**: `web/src/lib/auth.ts:26`

Risque de manipulation du header Host si deploye hors Vercel.

### SEC-20: Pas de validation magic bytes sur les uploads

**Fichier**: `web/src/app/api/upload/route.ts:29-33`

Validation basee uniquement sur l'extension du fichier.

**Fix**: Valider les magic bytes avec la librairie `file-type`.

### SEC-21: Inngest serve route expose la liste des fonctions

**Fichier**: `web/src/app/api/inngest/route.ts:11-20`

**Fix**: S'assurer que `INNGEST_SIGNING_KEY` est configure en production.

---

## LOW

### SEC-22: IP spoofable via x-forwarded-for

**Fichier**: `web/src/lib/rate-limit.ts:78-83`

**Fix**: Utiliser `x-vercel-forwarded-for` sur Vercel.

### SEC-23: Messages d'erreur internes retournes au client

**Fichiers**: `upload/route.ts:79`, `upload/signed-url/route.ts:39,57`

**Fix**: Retourner des messages generiques cote client.

### SEC-24: Pas de pagination sur les projets dashboard

**Fichier**: `web/src/app/api/dashboard/projects/route.ts:11`

Limite fixe a 50 sans parametres de pagination.

### SEC-25: Pas de limite sur le nombre de fichiers par requete upload

**Fichier**: `web/src/app/api/upload/route.ts:23`

**Fix**: `if (files.length > 30) return error`

### SEC-26: Pas de borne superieure sur selectOptionSchema

**Fichier**: `web/src/lib/validations.ts:41-44`

`roomIndex` et `optionIndex` n'ont pas de `.max()`.

### SEC-27: Parametre `prefix` non valide dans storage

**Fichier**: `web/src/lib/services/storage.ts:26`

Le prefix est utilise dans le path de stockage sans validation contre une allowlist.

---

# SECTION 2 — PAIEMENTS, CREDITS & ABONNEMENTS

---

## CRITICAL

### PAY-01: Abonnes annuels recoivent 1/12e des credits attendus

**Fichiers**: `web/src/app/api/webhook/stripe/route.ts:145`, `web/src/app/api/checkout/route.ts:132`

Pour un abonnement annuel, Stripe envoie UN SEUL `invoice.payment_succeeded` par an. Le handler delivre `creditsPerMonth` credits (ex: 15 pour Pro). L'utilisateur recoit 15 credits par AN au lieu de 15 par MOIS (180/an).

**Fix**: Detecter `billing === "yearly"` dans les metadata et multiplier par 12:
```typescript
const credits = metadata.billing === "yearly"
  ? plan.creditsPerMonth * 12
  : plan.creditsPerMonth;
```

---

## HIGH

### PAY-02: Pas de handler `invoice.payment_failed`

**Fichier**: `web/src/app/api/webhook/stripe/route.ts:42-150`

Quand un paiement de renouvellement echoue, le statut en DB reste "active".

**Fix**: Ajouter un handler qui met a jour le statut en `past_due`.

### PAY-03: Pas de Stripe Billing Portal

**Fichier**: Manquant

Aucune route pour `stripe.billingPortal.sessions.create()`. Les utilisateurs ne peuvent pas annuler, upgrader, ou changer de moyen de paiement.

**Risque**: Non-conformite avec les lois de protection du consommateur EU.

**Fix**: Creer `/api/billing/portal` + bouton "Gerer mon abonnement" sur le dashboard.

### PAY-04: Pas de prevention de doublons d'abonnements

**Fichier**: `web/src/app/api/checkout/route.ts:94-146`

Si un utilisateur avec un abonnement actif achete un nouveau plan, Stripe cree un SECOND abonnement.

**Risque**: Double facturation.

**Fix**: Verifier `getActiveSubscription()` avant de creer la session checkout.

### PAY-05: `refundCredits()` sans garde d'idempotence

**Fichier**: `web/src/lib/store.ts:271-299`

`refundCredits` n'a AUCUNE verification d'idempotence. Le flag `creditsRefunded` est sur l'objet projet en memoire (pas atomique en DB).

**Risque**: Double remboursement = credits gratuits.

**Fix**: Verifier en DB avant de rembourser:
```typescript
const { data: existing } = await db.from("credit_transactions")
  .select("id").eq("project_id", projectId).eq("type", "refund").single();
if (existing) return;
```

### PAY-06: Credits deduits mais non rembourses si creation projet echoue

**Fichier**: `web/src/app/api/project/route.ts:69-135`

Credits deduits a la ligne 69-74. Si `saveProject()` echoue, le `catch` retourne 500 SANS rembourser.

**Fix**: Try/catch avec remboursement automatique post-deduction.

### PAY-07: Race condition `addCredits` fallback (TOCTOU)

**Fichier**: `web/src/lib/store.ts:207-215`

Quand le RPC `increment_credits` echoue, le fallback fait read-then-write. Deux achats simultanes peuvent perdre un increment.

**Fix**: S'assurer que le RPC est deploye. Supprimer le fallback.

### PAY-08: Race condition `deductCredits` fallback (TOCTOU)

**Fichier**: `web/src/lib/store.ts:252-257`

Meme probleme — deux creations de projet simultanees peuvent produire un solde negatif.

### PAY-09: Pas de contrainte DB empechant les abonnements multiples actifs

**Fichier**: `web/src/lib/store.ts:344-356`

`getActiveSubscription()` ne retourne qu'un seul resultat. Si un utilisateur a 2 abonnements actifs (via PAY-04), le second est invisible.

---

## MEDIUM

### PAY-10: Race condition creation customer Stripe

**Fichier**: `web/src/app/api/checkout/route.ts:44-53`

Deux clics rapides "Acheter" peuvent creer 2 customers Stripe.

**Fix**: `UPDATE users SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL`

### PAY-11: Pas de CHECK constraint sur la colonne credits

**Fichier**: `web/supabase-schema.sql:13`

`credits INTEGER NOT NULL DEFAULT 0` sans `CHECK (credits >= 0)`.

**Fix**: `ALTER TABLE users ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);`

### PAY-12: Transaction credit et mise a jour solde non atomiques

**Fichier**: `web/src/lib/store.ts:200-221`

Le solde est mis a jour, puis la transaction est enregistree separement. Un crash entre les deux laisse un trou dans l'audit trail.

**Fix**: Wrapper dans une fonction PostgreSQL transactionnelle.

### PAY-13: Pas de business logic pour statut `past_due`

**Fichier**: `web/src/app/api/webhook/stripe/route.ts:66-93`

Un utilisateur `past_due` peut continuer a utiliser ses credits.

### PAY-14: Pas de reconciliation si webhook n'arrive jamais

**Fichiers**: `checkout/route.ts`, `webhook/stripe/route.ts`

Si l'endpoint webhook est down apres un checkout reussi, les credits ne sont jamais delivres.

**Fix**: Endpoint de reconciliation ou cron job Inngest.

### PAY-15: Suppression utilisateur avec abonnement actif

**Fichier**: `web/supabase-schema.sql` (ON DELETE CASCADE)

La suppression cascade en DB mais l'abonnement Stripe continue a facturer.

**Fix**: Annuler les abonnements Stripe avant suppression.

### PAY-16: Admin refund utilise `creditsUsed` auto-declare

**Fichier**: `web/src/app/api/admin/projects/[id]/action/route.ts:67`

`const amount = project.creditsUsed || 1` — pas de source fiable.

**Fix**: Verifier via `credit_transactions` le montant reel deduit.

---

## LOW

### PAY-17: Webhook retourne 500 pour toutes les erreurs handler

**Fichier**: `web/src/app/api/webhook/stripe/route.ts:151-154`

**Fix**: Distinguer erreurs transitoires (500) vs permanentes (200 + log).

### PAY-18: Colonne `stripe_session_id` contient aussi des invoice IDs

**Fichier**: `web/src/lib/store.ts`, `supabase-schema.sql:52`

Nom trompeur. Pas de bug fonctionnel.

### PAY-19: Prix inline `price_data` au lieu de Stripe Price IDs

**Fichier**: `web/src/app/api/checkout/route.ts:69-76`

### PAY-20: Credits annules conserves dans le solde utilisateur

**Fichier**: `web/src/app/api/webhook/stripe/route.ts:96-116`

Comportement SaaS standard.

---

# SECTION 3 — PERFORMANCE & ARCHITECTURE

---

## CRITICAL

### PERF-01: Race condition sur `updateProject` (read-then-write sans lock)

**Fichier**: `web/src/lib/store.ts:29-38`

`updateProject()` fait read → merge en memoire → write. Avec webhooks, Inngest, et polling concurrent, les pertes de donnees sont quasi-certaines.

**Fix**: RPC Supabase avec `jsonb_set` pour des updates atomiques partiels. Ou optimistic locking avec `updated_at`.

### PERF-02: Le GET handler legacy fait toute la pipeline dans une seule requete

**Fichier**: `web/src/app/api/project/[id]/route.ts:39-509`

Quand `USE_INNGEST !== "true"`, le GET execute OpenAI, Replicate, et Remotion en synchrone.

**Fix**: Forcer `USE_INNGEST=true` en production. Supprimer le code legacy.

### PERF-03: Polling Inngest cree jusqu'a 360+ DB reads par projet

**Fichier**: `web/src/lib/inngest/functions/auto-staging.ts:138-232`

Staging (120 iterations) + video (180 iterations). Pour 10 rooms: ~3000 appels DB + API.

**Fix**: Utiliser les webhooks Replicate pour eliminer le polling.

### PERF-04: Projet JSONB = single point of failure

**Fichiers**: `web/src/lib/store.ts:19-27`, `web/supabase-schema.sql:73-79`

Tout l'etat du projet est un seul blob JSONB. Cause racine de PERF-01.

**Fix court terme**: RPC `update_project_field(project_id, json_path, value)` avec `jsonb_set()`.
**Fix long terme**: Normaliser le schema (tables `rooms`, `room_options`, `predictions`).

---

## HIGH

### PERF-05: `saveProject()` ecrase tout le blob JSONB

**Fichier**: `web/src/lib/store.ts:19-27`

Les writes concurrents s'ecrasent mutuellement.

### PERF-06: Project creation lance N `cleanPhoto` en parallele sans limite

**Fichier**: `web/src/app/api/project/route.ts:77-90`

`Promise.all(photos.map(cleanPhoto))` = jusqu'a 30 appels Replicate simultanes.

**Fix**: `p-limit` pour limiter a 5 appels concurrents.

### PERF-07: Route upload charge les fichiers entiers en memoire

**Fichier**: `web/src/app/api/upload/route.ts:52`

`Buffer.from(await file.arrayBuffer())` = jusqu'a 50MB par fichier en RAM.

**Fix**: Utiliser exclusivement le signed URL upload.

### PERF-08: `uploadFromUrl` charge les videos entieres en memoire

**Fichier**: `web/src/lib/services/storage.ts:29`

**Fix**: Streaming upload ou `createSignedUploadUrl`.

### PERF-09: Collision step ID / competition entre fonctions Inngest

**Fichier**: `web/src/lib/inngest/functions/videos.ts:37,90`

`videos-poll` et `render-poll` se battent pour le meme etat projet.

**Fix**: Verifier la phase attendue en debut de chaque step.

### PERF-10: Pas de timeout/max-duration sur les fonctions Inngest

**Fichier**: `web/src/lib/inngest/functions/auto-staging.ts:39`

`auto-staging` peut tourner 25 minutes. Si depasse la limite Inngest, pas de cleanup.

**Fix**: `cancelOn` + step final de nettoyage.

### PERF-11: Analyse + generation dans un seul step Inngest

**Fichier**: `web/src/lib/inngest/functions/cleaning-poll.ts:143-222`

Le step "analyze-photos" fait analyse + prompts + predictions. Si echec au milieu, tout est perdu.

**Fix**: Decouper en steps separees.

### PERF-12: Webhook + polling creent un double-processing

**Fichiers**: `webhook/replicate/route.ts:67-100`, `cleaning-poll.ts:58-89`

Les deux chemins modifient le meme projet. Writes concurrents.

**Fix**: Choisir un seul chemin (webhooks de preference).

### PERF-13: Pas de degradation gracieuse pour Supabase down

**Fichier**: `web/src/lib/supabase.ts`

Pas de circuit breaker pour Supabase.

**Fix**: Ajouter Supabase au systeme de circuit breaker.

### PERF-14: `uploadFromUrl` sans timeout sur le fetch

**Fichier**: `web/src/lib/services/storage.ts:29`

**Fix**: `signal: AbortSignal.timeout(120_000)`

---

## MEDIUM

### PERF-15: Index composite manquant `credit_transactions(user_id, project_id, type)`

**Fichier**: `web/supabase-schema.sql:95`

**Fix**: `CREATE INDEX idx_credit_tx_dedup ON credit_transactions(user_id, project_id, type);`

### PERF-16: Admin stats fait des full table scans

**Fichier**: `web/src/app/api/admin/route.ts:12-175`

**Fix**: Cache de 60 secondes ou vues materialisees.

### PERF-17: `getUserProjects` fetche le blob JSONB entier

**Fichier**: `web/src/lib/store.ts:53-96`

**Fix**: Utiliser les selecteurs JSONB path de Supabase.

### PERF-18: OpenAI client recree a chaque appel

**Fichier**: `web/src/lib/services/openai.ts:15-17`

**Fix**: Singleton lazy au niveau module.

### PERF-19: Replicate client recree a chaque appel

**Fichier**: `web/src/lib/services/replicate.ts:7-9`

### PERF-20: `costGuard`/`trackCost` utilisent des imports dynamiques

**Fichier**: `web/src/lib/circuit-breaker.ts:467,493`

**Fix**: Extraire dans un module `cost-tracking.ts` separe.

### PERF-21: `trackCost` fait read-modify-write sans atomicite

**Fichier**: `web/src/lib/circuit-breaker.ts:489-500`

**Fix**: Table separee de tracking de couts avec INSERT (append-only).

### PERF-22: Page d'accueil entierement "use client"

**Fichier**: `web/src/app/page.tsx:1`

Mauvais pour LCP et SEO.

**Fix**: Server components pour le marketing, client pour l'upload.

### PERF-23: Uploads photos sequentiels

**Fichier**: `web/src/hooks/useUpload.ts:103-107`

**Fix**: Upload parallele avec `p-limit(5)`.

### PERF-24: Polling 2-3s agressif sur useProject

**Fichier**: `web/src/hooks/useProject.ts:18-20`

**Fix**: Exponential backoff ou SSE.

### PERF-25: Pas de TTL/cleanup sur les projets

**Fichier**: `web/supabase-schema.sql:73-79`

**Fix**: Cron job Inngest pour archiver les projets > 90 jours.

### PERF-26: `requireProjectOwner` autorise l'acces quand `userId` est null

**Fichier**: `web/src/lib/api-auth.ts:41-48`

**Fix**: `if (!project.userId || project.userId !== ...)`

---

## LOW

### PERF-27: Rate limiter map cleanup faible — `web/src/lib/rate-limit.ts:12-26`
### PERF-28: Cache circuit breaker sans taille max (OK par design) — `circuit-breaker.ts:99-118`
### PERF-29: Blob URL leak sur unmount composant — `useUpload.ts:72-80`
### PERF-30: `autoRefund` duplique dans 3 fichiers — `route.ts:14`, `cleaning-poll.ts:12`, `auto-staging.ts:18`
### PERF-31: Alerte Resend sans timeout — `circuit-breaker.ts:533`
### PERF-32: Index composite manquant sur `subscriptions(user_id, status)` — `supabase-schema.sql:97`

---

# SECTION 4 — QUALITE DU CODE & GESTION D'ERREURS

---

## CRITICAL

### CODE-01: Schemas Zod existants mais non utilises dans les routes

**Fichiers**:
- `web/src/app/api/project/[id]/triage/route.ts:27` — `triageConfirmSchema` non importe
- `web/src/app/api/project/[id]/montage/route.ts:46` — `montageSchema` non importe

**Fix**: Importer et utiliser `safeParse()` dans chaque route.

### CODE-02: Non-null assertion crash sur `STYLES.find()!`

**Fichier**: `web/src/app/api/project/route.ts:65`

```typescript
const styleLabel = STYLES.find((s) => s.id === style)!.label;
```

**Fix**: `STYLES.find((s) => s.id === style)?.label ?? style`

### CODE-03: 25+ blocs `catch {}` vides — erreurs avalees silencieusement

| Fichier | Lignes |
|---------|--------|
| `project/[id]/route.ts` | 81, 207, 253, 363, 410, 454, 465, 482, 491 |
| `cleaning-poll.ts` | 79, 245 |
| `auto-staging.ts` | 159, 222 |
| `videos.ts` | 54, 102, 113 |
| `render-poll.ts` | 25, 36 |
| `montage.ts` | 25, 36 |

Le pipeline semble "bloque" quand les predictions echouent silencieusement.

**Fix**: Au minimum `console.warn`. Idealement propager vers `project.error`.

---

## HIGH

### CODE-04: 4x non-null assertions sur `getUserById()!`

**Fichier**: `web/src/lib/store.ts:197,214,242,261`

**Fix**: Null check explicite + erreur descriptive.

### CODE-05: Non-null assertions dans les fonctions Inngest

**Fichier**: `web/src/lib/inngest/functions/cleaning-poll.ts:114,144`

### CODE-06: Inngest event type cast en `any`

**Fichier**: `web/src/app/api/admin/projects/[id]/action/route.ts:49`

```typescript
await inngest.send({ name: eventName as any, data: { projectId: id } });
```

**Fix**: Typer `phaseEventMap` comme `Record<string, keyof Events>`.

### CODE-07: ~68 assertions `as` dont plusieurs non justifiees

**Fichiers principaux**: `store.ts:65-93`, `auth.ts:48,58-60`, `circuit-breaker.ts:155-156`, `admin/route.ts:19,32-38`

**Fix**: Wrapper type pour Supabase avec validation Zod a la frontiere.

### CODE-08: Aucun timeout/exhaustion handling sur les boucles de polling Inngest

| Fonction | Max iterations | Timeout | Apres epuisement |
|----------|---------------|---------|-----------------|
| cleaning-poll | 60 | ~5 min | Retourne silencieusement |
| check-options | 120 | ~10 min | Aucun |
| check-staging | 120 | ~10 min | Aucun |
| check-auto-videos | 180 | ~15 min | Aucun |
| check-videos | 180 | ~15 min | Aucun |
| check-render | 120 | ~10 min | Aucun |

**Fix**: Step final: si phase encore active → `phase = "error"` + auto-refund.

### CODE-09: `autoRefund` duplique dans 4 fichiers

`project/[id]/route.ts:14-37`, `cleaning-poll.ts:12-31`, `auto-staging.ts:18-37`, `videos.ts:71-76`

**Fix**: Extraire dans `src/lib/pipeline-helpers.ts`.

### CODE-10: Logique de render polling dupliquee 4 fois

`project/[id]/route.ts:443-495`, `videos.ts:89-123`, `render-poll.ts:12-49`, `montage.ts:12-49`

**Fix**: Extraire `handleRenderCompletion()` partage.

### CODE-11: Echec Remotion marque comme "done" au lieu de "error"

`project/[id]/route.ts:272`, `videos.ts:65`, `auto-staging.ts:246` — `phase = "done"` apres echec render. Pas d'auto-refund.

**Fix**: Setter `project.error = "Render echoue"`.

### CODE-12: 60+ appels `console.*` en production — pas de logging structure

**Fix**: Creer `src/lib/logger.ts` minimal avec output structure.

### CODE-13: Pas de validation centralisee des variables d'environnement

Certains modules throw, d'autres utilisent des defaults silencieux, d'autres utilisent `!`.

**Fix**: `src/lib/env.ts` avec validation Zod au demarrage.

### CODE-14: Hostname Supabase manquant dans `next.config.ts`

`images.remotePatterns` manque `*.supabase.co`. Les `<Image>` echoueront.

**Fix**: Ajouter `{ protocol: "https", hostname: "*.supabase.co" }`.

### CODE-15: Pas de validation body sur admin action

**Fichier**: `web/src/app/api/admin/projects/[id]/action/route.ts:20`

---

## MEDIUM

### CODE-16: Non-exhaustive switch sur `ProjectPhase` — `project/[id]/route.ts`
### CODE-17: Pas de `default` logging dans le switch webhook Stripe — `webhook/stripe/route.ts`
### CODE-18: Mix camelCase/snake_case dans les reponses API — `admin/route.ts`, `admin/projects/route.ts`
### CODE-19: Format de reponse d'erreur inconsistant (FR user / EN admin)
### CODE-20: `requireAdmin` return type inconsistant
### CODE-21: Pattern de cast JSON duplique — `store.ts`, `admin/route.ts`, `admin/page.tsx`
### CODE-22: ESLint trop permissif — manque `no-console`, `no-explicit-any`, `no-non-null-assertion`
### CODE-23: `next-auth` beta avec range caret — `"^5.0.0-beta.30"` → pinning exact
### CODE-24: Pas de champ `engines` dans package.json — `"engines": { "node": ">=22" }`
### CODE-25: Inngest `schemas` cast en `never` — `inngest/client.ts:6`

---

## LOW

### CODE-26: tsconfig manque `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`
### CODE-27: 7 exports non utilises (`downloadRender`, `uploadPhoto`, `getUserByEmail`, `montageSchema`, `triageConfirmSchema`, `InngestClient`, `Events`)
### CODE-28: Import `downloadRender` non utilise — `project/[id]/route.ts:10`
### CODE-29: Import `getProject` inutile dans montage route — `montage/route.ts:2`
### CODE-30: Pas de `serverExternalPackages` dans next.config
### CODE-31: Prediction polling pattern duplique dans 4 fichiers
### CODE-32: `selectOptionSchema` sans borne max — `validations.ts:41-44`
### CODE-33: `useCredits` hook jamais utilise — dead code

---

# SECTION 5 — REMOTION & N8N TELEGRAM BOT

---

## CRITICAL

### REM-01: Aucune authentification sur les endpoints de render

**Fichier**: `remotion/server/index.ts:47,100,113`

Tous les endpoints n'ont aucune auth. CORS est `*`. N'importe qui peut declencher des renders.

**Fix**:
```typescript
app.use((req, res, next) => {
  if (req.path !== '/health' && req.headers.authorization !== `Bearer ${RENDER_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### N8N-01: Tokens Telegram en clair dans le code source

**Fichiers**: `n8n/nodes/StartProcessing.js:45`, `CleanPhotos.js:114-115`, `GenerateRoomOptions.js:196-198`, `HandleCallbackQuery.js:117-119`, `HandleCustomPrompt.js:117-119`, `build-v21.js:27,160,465,527,553,591`

Le token Telegram bot est hardcode en fallback dans chaque node ET dans les URLs du build script.

**Fix**: Supprimer tous les tokens hardcodes. Utiliser uniquement `process.env.X` sans fallback.

### N8N-02: Build script bake les tokens dans le JSON workflow

**Fichier**: `n8n/build-v21.js:465,527,553,591`

**Fix**: Convertir en nodes Telegram ou injecter au deploy time.

### N8N-03: Cle API n8n en clair dans le deploy script

**Fichier**: `n8n/deploy-v21.sh:9`

`API_KEY="eyJhbGciOiJIUzI1NiIs..."` — acces admin complet.

**Fix**: `API_KEY="${N8N_API_KEY:?N8N_API_KEY must be set}"`

---

## HIGH

### REM-02: Pas de limite de concurrence sur les renders — `remotion/server/index.ts:47-96`

5-10 requetes simultanees = OOM kill. **Fix**: Max concurrent 2-3.

### REM-03: Pas de cleanup des renders termines — `remotion/server/index.ts:33,87-88`

Map + fichiers MP4 s'accumulent. **Fix**: Cleanup jobs > 30 min.

### REM-04: Pas de gestion d'erreur pour medias distants — `RoomSegment.tsx:89,129,140`

URLs Replicate avec TTL. Si expired, crash sans recovery.

### REM-05: Input props non valides avant render — `remotion/server/index.ts:70-74`

**Fix**: `schema.safeParse(inputProps)` avant de lancer le render.

### N8N-04: Sessions bloquees en phase 'videos'/'rendering' sur erreur

**Fichier**: `n8n/nodes/HandleCallbackQuery.js:604,697`

**Fix**: Try-catch + cleanup session + notification utilisateur.

### N8N-05: Race condition — executions concurrentes de `HandleCallbackQuery`

**Fichier**: `n8n/nodes/HandleCallbackQuery.js:111-803`

Node monolithique 20+ min. Deux instances modifient le meme `staticData`.

**Fix**: Flag `session.processing` verifie en debut de node.

### N8N-06: Pas de controle d'acces Telegram

N'importe qui peut utiliser le bot = appels API couteux.

**Fix**: Whitelist `ALLOWED_TELEGRAM_USERS` en env var.

### N8N-07: `JSON.parse` sans try-catch sur les reponses GPT-4o

**Fichiers**: `InitializeSession.js:13`, `GenerateRoomOptions.js:223-228`, `HandleCallbackQuery.js:386-391`

**Fix**: Try-catch avec retry ou message d'erreur.

### N8N-08: Pas de rollback sur echec de deploy

**Fichier**: `n8n/deploy-v21.sh:1-67`

Si le PUT echoue apres desactivation, le bot est offline.

**Fix**: Backup + trap ERR pour rollback.

---

## MEDIUM

### REM-06: Pas de timeout sur les renders — `remotion/server/index.ts:68-94`
### REM-07: Container Docker tourne en root — `remotion/Dockerfile:1-37`
### REM-08: `calculateDuration` edge case 0 rooms — `PropertyShowcase.tsx:25-27`
### REM-09: V1 schema sans `.url()` sur video URLs — `Root.tsx:46`
### N8N-09: Cleanup sessions uniquement sur `/go` — `StartProcessing.js:53-60`
### N8N-10: Pas de limite photos par session (50 photos = ~$50+) — `StartProcessing.js:87-96`
### N8N-11: Duplication massive de code entre les nodes (limitation n8n)
### N8N-12: Limite regeneration non verifiee dans GenerateRoomOptions
### N8N-13: Polling render sans timeout dans HandleCallbackQuery — `HandleCallbackQuery.js:759-764`
### N8N-14: Pas de sanitization inputs utilisateur — `HandleCustomPrompt.js:115,210`
### N8N-15: Pas de verification succes avant cleanup dans deploy — `deploy-v21.sh:41-45`
### N8N-16: Fonction `pollPrediction` non utilisee — dead code

---

## LOW

### REM-10: Health check superficiel — `remotion/server/index.ts:123-125`
### REM-11: Pas de HEALTHCHECK Docker — `remotion/Dockerfile`
### REM-12: `@remotion/bundler` en devDependencies mais necessaire au runtime — `package.json:25`
### REM-13: Version Remotion potentiellement obsolete — v4.0.242
### REM-14: React 18 dans Remotion vs React 19 dans web (pas de conflit runtime)
### N8N-17: UUIDs deterministes du build (OK)
### N8N-18: Build ne valide pas la structure workflow produite
### N8N-19: Parsing heuristique des infos propriete — `HandleCallbackQuery.js:713-734`
### N8N-20: StudioMontage accede `rooms[0]` sans garde — `StudioMontage.tsx:55`
### N8N-21: PropertyShowcase gap de crossfade avant outro (potentiellement intentionnel)
### N8N-22: Timeline StudioMontage sans overlap (choix de design)

---

# SECTION 6 — FRONTEND, UX & ACCESSIBILITE

---

## CRITICAL

### UX-01: Aucun error boundary dans toute l'application

**Fichiers**: Tous les routes sous `web/src/app/`

Zero fichier `error.tsx`. Erreur runtime = ecran blanc sans recovery.

**Fix**: Creer `src/app/error.tsx` (global) + `src/app/project/[id]/error.tsx`.

### UX-02: Hostname Supabase manquant dans next.config.ts

**Fichier**: `web/next.config.ts:5-23`

`images.remotePatterns` manque Supabase. Les photos uploadees ne s'afficheront pas via `<Image>`.

**Fix**: Ajouter `{ protocol: "https", hostname: "*.supabase.co" }`.

---

## HIGH

### UX-03: Aucun `loading.tsx` pour les transitions de route

**Fix**: Creer `loading.tsx` pour `/dashboard`, `/project/[id]`, `/admin`, `/pricing`.

### UX-04: Pas de metadata par page (SEO)

Toutes les pages partagent le titre generique "VIMIMO — Virtual Staging IA".

**Fix**: `layout.tsx` server component par route avec metadata appropriees.

### UX-05: Landing page entierement client-side (mauvais SEO)

**Fichier**: `web/src/app/page.tsx:1`

**Fix**: Server components pour le marketing, client pour l'upload.

### UX-06: Pas d'Open Graph / Twitter cards

**Fichier**: `web/src/app/layout.tsx:17-21`

**Fix**: Ajouter `openGraph` et `twitter` dans les metadata.

### UX-07: Fuite memoire Object URLs dans useUpload

**Fichier**: `web/src/hooks/useUpload.ts:71-81`

**Fix**: `useEffect` cleanup qui revoke toutes les URLs au unmount.

### UX-08: DropZone sans limite de taille fichier

**Fichier**: `web/src/components/upload/DropZone.tsx:22-27`

**Fix**: `maxSize: 20 * 1024 * 1024` + `onDropRejected` handler.

### UX-09: LoginForm ne verifie pas le resultat de signIn

**Fichier**: `web/src/components/auth/LoginForm.tsx:17-27`

**Fix**: Verifier `result.ok` avant `emailSent = true`.

### UX-10: ARIA labels manquants sur elements interactifs

`PhotoGrid.tsx`, `RoomCard.tsx`, `TriageView.tsx`, `PricingGrid.tsx`

### UX-11: Table admin projets non mobile-friendly

**Fichier**: `web/src/components/admin/ProjectsTable.tsx:44-243`

**Fix**: Layout card-based sur mobile.

---

## MEDIUM

### UX-12: Pas de page 404 personnalisee — manquant `src/app/not-found.tsx`
### UX-13: Pas de sitemap.xml ni robots.txt — manquants
### UX-14: Flash theme (FOUC) pour utilisateurs light mode — `layout.tsx:29`, `useTheme.tsx:27-37`
### UX-15: Navigation clavier deficiente sur menu dropdown — `AuthButton.tsx:41-97`
### UX-16: Contraste couleur borderline pour `text-muted` en light mode — `globals.css:7`
### UX-17: Double-polling potentiel dans useProject — `useProject.ts:74-92`
### UX-18: Pas d'integration Visibility API pour le polling — `useProject.ts`
### UX-19: Uploads photos sequentiels — `useUpload.ts:103-107`
### UX-20: Erreurs dashboard fetch avalees silencieusement — `dashboard/page.tsx:62-76`
### UX-21: `ProjectView` retourne `null` pour phase `uploading` — `ProjectView.tsx:95`
### UX-22: Pas de feedback de rejet de fichiers dans DropZone — `DropZone.tsx:22-27`
### UX-23: Bouton supprimer invisible sur mobile (hover-only) — `PhotoGrid.tsx:37`
### UX-24: Barre de progression upload non affichee — `page.tsx:39-43`
### UX-25: Couleurs hardcodees dans MorphAnimation labels — `GenerationView.tsx:209`
### UX-26: Header duplique dans chaque page (5 fichiers)
### UX-27: `<a href="/">` au lieu de `<Link>` dans 7+ endroits
### UX-28: Elements interactifs imbriques (Link wrapping Button) — `page.tsx:102-107`
### UX-29: Pas de confirmation avant actions admin destructives — `admin/page.tsx:226-268`
### UX-30: Checkout success ne await pas le refresh session — `page.tsx:20-33`

---

## LOW

### UX-31: Pas de favicon ni OG image — `web/public/`
### UX-32: Hierarchie de headings mineure
### UX-33: AuthButton utilise `<img>` au lieu de `next/image` — `AuthButton.tsx:48-52`
### UX-34: Admin ProjectsTable utilise `<img>` au lieu de `next/image` — `ProjectsTable.tsx:128-131`
### UX-35: Dropdowns `<select>` admin sans dark mode styling — `admin/page.tsx:487-505`
### UX-36: MontageForm title sans maxLength — `MontageForm.tsx:60-76`
### UX-37: Admin utilise `alert()` pour les erreurs — `admin/page.tsx:236,241,256,264`
### UX-38: Pas de breadcrumb sur la page projet — `project/[id]/page.tsx`
