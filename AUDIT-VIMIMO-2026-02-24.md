# AUDIT COMPLET — VIMIMO Web App
**Date :** 24 février 2026
**Périmètre :** `/web/src/` — API routes, frontend, services, pipeline Inngest
**Statut build :** OK (zero erreurs)

---

## Résumé Exécutif

| Sévérité | Nombre | Domaines principaux |
|----------|--------|---------------------|
| **CRITIQUE** | 10 | Race conditions crédits, timeouts manquants, idempotence webhooks, endpoints non protégés |
| **WARNING** | 21 | Validation inputs, rate limiting, accessibilité, gestion erreurs |
| **INFO** | 25 | Bonnes pratiques, optimisations mineures, cohérence code |
| **Total** | **56** | |

**Architecture globale :** Solide — Inngest event-driven, Supabase persistence, retry logic, auth NextAuth v5, Stripe intégré. Les marges business sont excellentes (~92%). Les problèmes identifiés concernent principalement la robustesse en production sous charge.

---

## 1. ISSUES CRITIQUES

### 1.1 Race Condition : Déduction de crédits non-atomique
**Fichier :** `src/lib/store.ts` (lignes 224-240)
**Impact :** Double-spend possible

Le flux actuel :
1. `getUserById()` — lecture solde
2. Vérification `user.credits < amount`
3. `updateUser()` — écriture nouveau solde

Entre les étapes 1 et 3, une requête concurrente peut lire le même solde → **double déduction**.

**Fix :** Utiliser un RPC PostgreSQL atomique (`SELECT ... FOR UPDATE` + déduction dans la même transaction).

---

### 1.2 Timeouts manquants sur tous les appels API

| Service | Fichier | Timeout actuel | Risque |
|---------|---------|---------------|--------|
| OpenAI GPT-4o | `services/openai.ts` (lignes 49, 84, 116, 183) | 10 min (défaut SDK) | Hang silencieux |
| Remotion render | `services/remotion.ts` (lignes 43, 63, 72) | Aucun | Requête infinie |
| Replicate | `services/replicate.ts` (lignes 30-128) | 10s (défaut SDK) | OK mais non explicite |

**Fix :** Ajouter `AbortSignal.timeout(30000)` sur tous les `fetch()`, et `timeout: 60000` sur les appels OpenAI.

---

### 1.3 Endpoint non protégé : Replicate status
**Fichier :** `app/api/replicate/[id]/route.ts` (lignes 4-20)
**Impact :** Fuite d'info — n'importe qui peut requêter un prediction ID pour voir les URLs et le statut.

**Fix :** Ajouter `requireAuth()`.

---

### 1.4 Webhook replay : Stripe — double crédit possible
**Fichier :** `app/api/webhook/stripe/route.ts` (lignes 42-147)
**Impact :** Si webhook rejoué, `addCredits()` peut être appelé 2 fois pour le même invoice.

- `checkout.session.completed` : pas de check idempotence par session.id
- `invoice.payment_succeeded` : pas de vérification si invoice déjà traitée

**Fix :** Vérifier en base `credit_transactions.stripe_session_id` avant chaque ajout.

---

### 1.5 Webhook replay : Replicate — événements Inngest dupliqués
**Fichier :** `app/api/webhook/replicate/route.ts` (lignes 34-102)
**Impact :** Webhook rejoué → événement Inngest émis en double → pipeline steps potentiellement re-exécutés.

**Fix :** Ajouter un check idempotence : vérifier si le prediction est déjà dans l'état final avant de traiter.

---

### 1.6 Inngest step ID collision sur retry
**Fichier :** `lib/inngest/functions/cleaning-poll.ts` (lignes 36-62)
**Impact :** Les step IDs `check-cleaning-${attempt}` sont basés sur un compteur de boucle. Si Inngest restart, le compteur reset → état non-déterministe.

Aussi : les appels `generateStagingOption()` sont hors `step.run()` (ligne 154-162) — si échec après quelques lancements, les retries créent des duplicats.

**Fix :** Wrapper les lancements dans `step.run()` avec des IDs stables.

---

### 1.7 Validation fichier upload absente
**Fichiers :** `app/api/upload/route.ts` (ligne 23), `app/api/upload/signed-url/route.ts` (ligne 18)
**Impact :** Aucune validation d'extension ni de taille — upload arbitraire possible (.exe, .sh, .html).

**Fix :** Allowlist : `['jpg', 'jpeg', 'png', 'webp']`, taille max 50MB.

---

### 1.8 Vérification webhook Replicate optionnelle
**Fichier :** `app/api/webhook/replicate/route.ts` (lignes 13-26)
**Impact :** Si `REPLICATE_WEBHOOK_SECRET` non défini → webhook accepte TOUT payload sans vérification.

**Fix :** Rendre obligatoire : retourner 503 si secret non configuré.

---

### 1.9 Assertion non-null sur secret Stripe
**Fichier :** `lib/stripe.ts` (ligne 7), `app/api/webhook/stripe/route.ts` (ligne 32)
**Impact :** `process.env.STRIPE_SECRET_KEY!` — si env var manquante, crash cryptique.

**Fix :** Validation runtime explicite avec `throw new Error("STRIPE_SECRET_KEY must be set")`.

---

### 1.10 Erreurs silencieuses UI — aucun feedback utilisateur
**Fichier :** `components/project/ResultView.tsx` (lignes 103, 109-123)
**Impact :** Si montage submit ou génération description échoue → `console.error()` seulement, l'utilisateur ne voit rien.

**Fix :** Ajouter un state `error` affiché dans l'UI.

---

## 2. WARNINGS

### Sécurité & Validation

| # | Issue | Fichier | Fix recommandé |
|---|-------|---------|----------------|
| 2.1 | **Aucun rate limiting** sur tous les endpoints | Tous les routes | Upstash Redis rate limiter — priorité : `/project` POST (5/min), `/checkout` (3/min), `/upload` (10/min) |
| 2.2 | **Pas de validation JSON** des request bodies | Multiple routes | Zod schemas pour tous les POST |
| 2.3 | **Search admin non sanitisé** | `api/admin/projects/route.ts` (l.26) | Validation longueur + regex sur param `search` |
| 2.4 | **MIME type client-side** dans upload | `app/api/upload/route.ts` (l.31) | Mapper extensions → MIME côté serveur |
| 2.5 | **Stripe webhook** retourne 400 au lieu de 403 | `webhook/stripe/route.ts` (l.28-36) | Distinguer missing vs invalid signature |

### Robustesse Pipeline

| # | Issue | Fichier | Fix recommandé |
|---|-------|---------|----------------|
| 2.6 | **Fallback silencieux** Remotion render | `inngest/functions/videos.ts` (l.40-46) | Sauver `proj.error` quand render échoue |
| 2.7 | **Promise.all sans allSettled** | `api/project/[id]/generate/route.ts` (l.33) | `Promise.allSettled()` pour résilience |
| 2.8 | **Upsert race condition** saveProject | `lib/store.ts` (l.19-27) | Optimistic locking avec version/timestamp |
| 2.9 | **Refund silencieux** si échec | `inngest/functions/cleaning-poll.ts` (l.13-26) | Ne pas marquer `creditsRefunded` si refund échoue |
| 2.10 | **JSON.parse non protégé** webhook Replicate | `webhook/replicate/route.ts` (l.28-31) | try/catch + validation payload shape |

### Frontend & UX

| # | Issue | Fichier | Fix recommandé |
|---|-------|---------|----------------|
| 2.11 | **console.error en prod** | Multiple (dashboard, admin, pricing, project) | Remplacer par error state UI ou logging service |
| 2.12 | **Aria-labels manquants** sur boutons icônes | `ResultView.tsx` (l.438-458), `AuthButton.tsx` | Ajouter aria-label descriptif |
| 2.13 | **`<img>` au lieu de `<Image>`** | `ProjectHistoryCard.tsx` (l.36), `ProjectsTable.tsx` (l.126) | Migrer vers Next.js `<Image>` |
| 2.14 | **Key avec index** au lieu d'ID | `MontageForm.tsx` (l.194-207, highlights) | Utiliser valeur unique |
| 2.15 | **Admin action spam** possible | `admin/page.tsx` (l.226-269) | Debounce ou lock par action |
| 2.16 | **parseInt sans radix** | `api/admin/projects/route.ts` (l.14-15) | `parseInt(..., 10)` |
| 2.17 | **Pas de loading skeleton** stats dashboard | `dashboard/page.tsx` (l.62-78) | Ajouter skeleton/placeholder |
| 2.18 | **Health check expose info env** | `api/health/route.ts` | Restreindre à IP interne ou auth |
| 2.19 | **Montage config non validée** | `api/project/[id]/montage/route.ts` (l.45-55) | Valider music, customMusicUrl, highlights |
| 2.20 | **No photo URL validation** | `api/project/route.ts` (l.17-23) | `new URL()` validation |
| 2.21 | **Admin data exposure** — retourne `row.data` complet | `api/admin/projects/route.ts` (l.107) | Filtrer les champs sensibles |

---

## 3. INFO & BONNES PRATIQUES

| # | Observation | Fichier | Suggestion |
|---|-------------|---------|------------|
| 3.1 | Pas de logging structuré | Tous les fichiers | JSON structured logs avec context (projectId, userId) |
| 3.2 | Pas de CORS explicite | Routes API | Documenter la politique CORS |
| 3.3 | Stripe API version pinned | `lib/stripe.ts` (l.8) | Bonne pratique, documenter les breaking changes |
| 3.4 | Hardcoded magic numbers (5000ms) | `GenerationView.tsx` (l.28), `AutoStagingView.tsx` (l.39) | Extraire en constante |
| 3.5 | Code dupliqué highlights | `PropertyInfoForm.tsx`, `MontageForm.tsx` | Extraire hook partagé |
| 3.6 | Formatage nombre inconsistant | `PricingCard.tsx` (l.52,55), `SubscriptionCard.tsx` (l.74) | Fonction utilitaire `formatEur()` |
| 3.7 | Dates formatées inconsistamment | `admin/page.tsx` | Fonction `formatDate()` partagée |
| 3.8 | Strings FR hardcodées | Tout le frontend | OK pour app FR-only, noter la limitation |
| 3.9 | Supabase Service Role Key | `lib/supabase.ts` (l.8) | Vérifier qu'aucun import côté client |
| 3.10 | Pas de focus trap modals | `ResultView.tsx` description tabs | Accessibilité améliorée |
| 3.11 | MontageForm pas de Enter pour highlights | `MontageForm.tsx` (l.169-190) | Aligner avec PropertyInfoForm |
| 3.12 | preload="metadata" sur toutes les vidéos | Multiple | Correct, bonne pratique |
| 3.13 | cursor-pointer inconsistant | Multiple boutons | Standardiser |
| 3.14 | Réponse description non validée côté client | `ResultView.tsx` (l.117) | Vérifier shape `{instagram, tiktok}` |
| 3.15 | Inngest event dedup — pas de ID unique | `webhook/replicate/route.ts` (l.90-102) | Ajouter `id: predictionId` dans l'event |

---

## 4. POINTS POSITIFS

- **Auth robuste** — `requireAuth()` / `requireProjectOwner()` / `requireAdmin()` sur toutes les routes sensibles
- **Pas d'injection SQL** — Supabase client paramétrise les requêtes
- **Pas de XSS** — Aucun `dangerouslySetInnerHTML`
- **Retry logic solide** — `withRetry()` avec backoff exponentiel + jitter + cap
- **TypeScript strict** — Bon usage des types à travers le codebase
- **Components "use client" corrects** — Séparation serveur/client propre
- **Responsive design** — Tailwind breakpoints bien utilisés
- **Inngest step.sleep()** — Correctement utilisé (fix précédent)
- **Cleanup useEffect** — Event listeners nettoyés dans AuthButton
- **Vidéos optimisées** — muted, controls, playsInline

---

## 5. PLAN D'ACTION PRIORITAIRE

### Immédiat (24h)
1. Rendre la déduction de crédits atomique (RPC PostgreSQL)
2. Ajouter timeouts sur OpenAI + Remotion + Replicate
3. Ajouter auth sur `/api/replicate/[id]`
4. Fix idempotence webhooks Stripe (check session.id avant addCredits)

### Court terme (cette semaine)
5. Rendre vérification webhook Replicate obligatoire
6. Validation fichier upload (extension + taille)
7. Rate limiting sur endpoints critiques
8. Validation runtime des env vars
9. Feedback erreur UI (description, montage)
10. Inngest step IDs stables

### Moyen terme (sprint suivant)
11. Zod validation sur tous les POST bodies
12. Logging structuré
13. Optimistic locking saveProject
14. `Promise.allSettled()` partout
15. Migration `<img>` → `<Image>`
16. Aria-labels accessibilité

---

## 6. BILAN COÛTS API (rappel)

| Étape | Coût/pièce | Service |
|-------|-----------|---------|
| Analyse GPT-4o | ~0,02$ | OpenAI |
| Nettoyage Flux | ~0,05$ | Replicate |
| 5 options staging Flux | ~0,25$ | Replicate |
| Vidéo Kling v2.1 Pro | ~0,30$ | Replicate |
| Description Insta/TikTok | ~0,01$ | OpenAI |
| **Total / pièce** | **~0,63$** | |
| **Session 3 pièces** | **~1,89$** | |

**Marges :**
- Pack Essentiel (3 crédits, 24,99€) : **93% marge**
- Abo Starter (5 crédits/mois, 29€) : **89% marge**
- Abo Pro (15 crédits/mois, 79€) : **89% marge**

---

*Audit généré le 24/02/2026 — VIMIMO v2.1 — Build OK*
