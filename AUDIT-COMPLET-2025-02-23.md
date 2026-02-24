# AUDIT COMPLET — VIMIMO

**Date :** 23 Fevrier 2026
**Version auditee :** v2.2 (commit `96d6eae`)
**Branche :** `main` (clean)
**Auditeur :** Claude Opus 4.6

---

## TABLE DES MATIERES

1. [Vue d'ensemble du projet](#1-vue-densemble)
2. [Inventaire des composants](#2-inventaire)
3. [Securite — Vulnerabilites critiques](#3-securite)
4. [Web App (Next.js)](#4-web-app)
5. [Pipeline Remotion](#5-remotion)
6. [Workflows n8n](#6-n8n)
7. [Base de donnees & Etat](#7-base-de-donnees)
8. [DevOps & Infrastructure](#8-devops)
9. [Qualite de code](#9-qualite)
10. [Matrice de risques](#10-matrice)
11. [Plan d'action recommande](#11-plan-daction)

---

## 1. VUE D'ENSEMBLE

**VIMIMO** est une pipeline de virtual staging IA : photo/video de piece vide → video de piece meublee avec rendu cinematique.

**Stack technique :**
- **Bot Telegram** : Interface utilisateur (photos, selection de style, callbacks)
- **n8n** : Orchestration workflow (20 nodes, webhook Telegram)
- **GPT-4o Vision** : Analyse batch des photos
- **Flux/Replicate** : Generation d'images IA (staging)
- **Kling v2.1 Pro** : Generation video par piece
- **Remotion** : Compilation video finale (montage cinematique)
- **Next.js 16** : Web app (auth, credits, Stripe, upload)
- **Supabase** : Base de donnees PostgreSQL
- **Vercel** : Hebergement web app
- **VPS Hostinger** : n8n + Remotion server

**Taille du projet :** ~2400 lignes de code metier + ~95 fichiers source, 1.2 GB total (avec node_modules)

---

## 2. INVENTAIRE

### Structure des repertoires

```
VIMIMO/
├── web/                          # Next.js 16 web app
│   ├── src/app/                  # 13 routes API + pages
│   ├── src/components/           # 12+ composants React
│   ├── src/lib/                  # Auth, services, DB adapter, Stripe
│   ├── src/hooks/                # Hooks React
│   ├── src/types/                # Types TypeScript
│   ├── .env.local                # Secrets PRODUCTION (gitignored)
│   └── supabase-schema.sql       # Schema SQL
├── remotion/                     # Pipeline video
│   ├── src/                      # 3 compositions, 12 composants
│   ├── server/index.ts           # Serveur Express port 8000
│   └── Dockerfile                # Node 22 + Chromium
├── n8n/                          # Workflows Telegram bot
│   ├── nodes/                    # 7 Code nodes JavaScript
│   ├── workflow-v2.json          # Workflow dev (IDs lisibles)
│   ├── workflow-v2-deploy.json   # Workflow prod (UUIDs)
│   ├── build-v21.js              # Build : nodes → workflow
│   ├── build-deploy.js           # Conversion IDs → UUIDs
│   └── deploy-v21.sh             # Script de deploiement
├── prompts/                      # 6 system prompts IA
└── B1/                           # Media de test
```

### Dependances principales

| Composant | Dependance | Version | Statut |
|-----------|-----------|---------|--------|
| Web | Next.js | 16.1.6 | OK |
| Web | React | 19.2.3 | OK |
| Web | NextAuth | 5.0.0-beta.30 | **Beta** |
| Web | Stripe SDK | 20.3.1 | OK |
| Web | Supabase JS | 2.97.0 | OK |
| Remotion | remotion | 4.0.242 | **186 versions de retard** |
| Remotion | React | 18.3.1 | v19 disponible |
| Remotion | Express | 4.22.1 | v5 disponible |

---

## 3. SECURITE — VULNERABILITES CRITIQUES

### 3.1 Secrets exposes dans le code source

| Secret | Fichiers | Severite |
|--------|----------|----------|
| Token Telegram Bot `8120972729:AAF...` | `build-v21.js` (x6), `workflow-v2.json`, `workflow-v2-deploy.json`, `deploy-v21.sh`, 5 fichiers nodes/*.js | **CRITIQUE** |
| Cle API n8n (JWT) | `deploy-v21.sh` ligne 9 | **CRITIQUE** |

**Impact :** Toute personne avec acces au repo peut controler le bot Telegram et l'instance n8n.

**Action immediate :** Rotation des tokens + suppression des valeurs hardcodees + utilisation exclusive de variables d'environnement.

### 3.2 Endpoint API sans authentification

```
GET /api/replicate/[id]  →  AUCUNE verification d'auth
```

**Impact :** N'importe qui peut interroger le statut de n'importe quelle prediction Replicate par son ID. Risque d'enumeration et de surveillance des generations.

### 3.3 Pas de rate limiting

Aucun endpoint n'a de limitation de debit :

| Endpoint | Risque |
|----------|--------|
| `POST /api/checkout` | Spam de sessions Stripe |
| `POST /api/upload` | Remplissage stockage (pas de limite de taille) |
| `POST /api/project` | Creation massive de projets |
| `POST /renders` (Remotion) | Saturation CPU/RAM du VPS |

### 3.4 CORS ouvert sur le serveur Remotion

```typescript
// remotion/server/index.ts
res.header("Access-Control-Allow-Origin", "*");
```

**Impact :** N'importe quel site web peut declencher des rendus video couteux sur le VPS.

### 3.5 Risques SSRF

Les URLs dans `/api/project/[id]/montage` ne sont pas validees :
- `customMusicUrl` : Pourrait pointer vers `http://localhost`, `http://192.168.x.x`
- `agencyLogoUrl` : Meme risque
- Upload de photos : URLs Replicate non verifiees

### 3.6 Race condition sur les credits

```typescript
// /api/project/route.ts
const user = await getUserById(userId);           // Lecture credits
if (user.credits < creditsNeeded) return 402;
await deductCredits(userId, creditsNeeded, ...);  // Deduction
// ↑ Pas atomique : 2 requetes simultanees passent toutes les 2
```

### 3.7 Verification de proprietaire nullable

```typescript
// lib/api-auth.ts
if (project.userId && project.userId !== result.session.user.id) { ... }
// ↑ Si project.userId est null, n'importe qui accede au projet
```

### 3.8 Injection de prompt utilisateur

Dans `HandleCustomPrompt.js` et `HandleCallbackQuery.js`, le texte utilisateur est injecte directement dans les prompts Flux sans sanitization :
```javascript
const prompt = `...${userText}...`; // Injection de prompt IA possible
```

---

## 4. WEB APP (Next.js 16)

### 4.1 Architecture

| Element | Statut | Details |
|---------|--------|---------|
| App Router | OK | Next.js 16, structure /app correcte |
| TypeScript strict | OK | `strict: true` dans tsconfig |
| Auth NextAuth v5 | **Beta** | JWT + Google OAuth + Resend magic links |
| Middleware | Absent | Supprime (deprecie Next.js 16), auth via `requireAuth()` |
| Headers securite | **Absent** | Pas de CSP, X-Frame-Options, HSTS |
| Validation Zod | **Absente** | Validation basique manuelle uniquement |
| Tests | **Absents** | 0 fichier de test, pas de framework configure |

### 4.2 Routes API — Audit de securite

| Route | Auth | Validation input | Problemes |
|-------|------|-------------------|-----------|
| `POST /api/project` | `requireAuth()` | Basique | Style valide par enum OK |
| `GET /api/project/[id]` | `requireProjectOwner()` | OK | userId null risk |
| `POST /api/project/[id]/select` | `requireProjectOwner()` | Bounds check OK | - |
| `POST /api/project/[id]/generate` | `requireProjectOwner()` | Aucune | Pas de validation pre-generation |
| `POST /api/project/[id]/render` | `requireProjectOwner()` | OK | - |
| `POST /api/project/[id]/montage` | `requireProjectOwner()` | Basique | URLs non validees (SSRF) |
| `POST /api/upload` | `requireAuth()` | **Aucune** | **Pas de limite taille/nombre** |
| `POST /api/upload/signed-url` | `requireAuth()` | Basique | Pas de validation taille |
| `POST /api/checkout` | `requireAuth()` | Basique | Pas de rate limiting |
| `GET /api/dashboard` | `requireAuth()` | OK | - |
| `GET /api/health` | Aucune (OK) | OK | Public intentionnellement |
| `POST /api/webhook/stripe` | Signature | OK | Manque handlers refund/failed |
| `GET /api/replicate/[id]` | **AUCUNE** | **AUCUNE** | **Critique** |

### 4.3 Stripe — Evenements non geres

| Evenement | Statut | Impact |
|-----------|--------|--------|
| `checkout.session.completed` | OK | Credits ajoutes |
| `customer.subscription.*` | OK | Cycle de vie abo |
| `invoice.payment_succeeded` | OK | Credits mensuels |
| `charge.refunded` | **Absent** | Credits non rendus au remboursement |
| `payment_intent.payment_failed` | **Absent** | Pas de notification utilisateur |
| `charge.dispute.created` | **Absent** | Chargebacks non geres |

### 4.4 Composants React

**Points positifs :** Typage correct, ObjectURL correctement liberes, animations Framer Motion.

**Points negatifs :**
- Pas d'attributs `aria-label` / `role` (accessibilite)
- Messages d'erreur non sanitizes avant affichage
- Pas de AbortController pour les fetch en cours lors de la navigation

---

## 5. PIPELINE REMOTION

### 5.1 Compositions

| Composition | Schema Zod | Duree | Qualite |
|-------------|-----------|-------|---------|
| VirtualStaging | OK (5 keyframes) | 10s @ 30fps | 8/10 |
| PropertyShowcase | OK (1-20 rooms) | Dynamique | 9/10 |
| StudioMontage | OK (2-20 rooms) | Dynamique | 9/10 |

**Composants React : 26 fichiers, 2903 lignes — Qualite moyenne 8.5/10**

Points forts : Animations cinematiques soignees, interpolations pures, `useMemo` pour les particules.

Points faibles :
- **Aucun Error Boundary** : une erreur dans un composant = render entier echoue
- `FilmGrain.tsx` : check `btoa`/`Buffer` inutile (Remotion = toujours Node.js)

### 5.2 Serveur Express (render)

**Score : 5/10** — Fonctionnel mais risque en production.

| Probleme | Severite | Detail |
|----------|----------|--------|
| CORS `*` | Critique | N'importe qui peut lancer des rendus |
| Aucune auth | Critique | Pas de cle API requise |
| Pas de rate limiting | Haute | Saturation possible |
| Fuite memoire | Haute | `Map<RenderJob>` jamais nettoye |
| Pas de cleanup disque | Haute | `/out/*.mp4` jamais supprime |
| Pas de timeout render | Moyenne | `renderMedia()` peut bloquer indefiniment |
| JSON limit 10MB | Moyenne | Devrait etre 1-2MB |
| Pas de validation props | Moyenne | inputProps non valide contre schema |

### 5.3 Docker

| Element | Statut |
|---------|--------|
| Image de base | `node:22-slim` OK |
| Chromium | Installe avec toutes les deps |
| Utilisateur non-root | **Absent** (tourne en root) |
| Multi-stage build | **Absent** (devDeps en prod) |
| HEALTHCHECK | **Absent** |
| `.dockerignore` | Present |

---

## 6. WORKFLOWS n8n

### 6.1 Architecture

- 21 noeuds, 10 sources de connexion
- Trigger Telegram → CommandRouter (9 regles + fallback) → branches de traitement
- 7 Code nodes JavaScript (~2400 lignes)
- StaticData pour gestion d'etat (sessions, photos, styles)

### 6.2 Gestion d'erreurs par noeud

| Noeud | Lignes | Gestion erreurs | Problemes |
|-------|--------|-----------------|-----------|
| StartProcessing | 125 | Bonne | - |
| InitializeSession | 55 | **Absente** | `JSON.parse()` sans try-catch |
| GenerateRoomOptions | 302 | Partielle | `JSON.parse()` sans try-catch, erreurs Flux silencieuses |
| HandleCallbackQuery | 804 | Inconsistante | Pas de bounds check roomIdx, catches vides |
| CleanPhotos | 159 | Bonne | Retry avec backoff, fallback photo originale |
| AutoStartCheck | 54 | Aucune | Retourne `[]` silencieusement |
| HandleCustomPrompt | 281 | Bonne | Access room sans validation index |

### 6.3 Race conditions identifiees

1. **AutoStartCheck vs /go** : Les deux peuvent declencher la pipeline simultanement
2. **Callbacks concurrents** : Deux callbacks sur le meme `chatId` + `roomIdx` en parallele
3. **Cleanup de session** : `StartProcessing` peut supprimer une session pendant que `HandleCallbackQuery` l'utilise
4. **Expiration photos** : Photo ajoutee a 29min, puis /go = photo expire immediatement

### 6.4 Nettoyage de session

| Mecanisme | Localisation | Robustesse |
|-----------|-------------|------------|
| Sessions >15min | StartProcessing | OK |
| Photos >30min | StartProcessing | OK |
| Cleanup apres completion | HandleCallbackQuery | OK |
| Flag `awaiting_info` stale | **Non gere** | Peut bloquer l'utilisateur |
| Marqueur album `mg_*` | InitializeSession | Fuite possible si crash |

---

## 7. BASE DE DONNEES & ETAT

### 7.1 Schema Supabase

```sql
users, accounts, verification_tokens, credit_transactions, subscriptions, projects
```

| Element | Statut |
|---------|--------|
| RLS active | OK sur toutes les tables |
| Foreign keys CASCADE | OK |
| Audit trail credits | OK (credit_transactions) |
| Index FK et email | OK |
| Index created_at (projects) | **Absent** |
| Index created_at (transactions) | **Absent** |
| Chiffrement tokens OAuth | **Absent** |
| Soft deletes | **Absent** (CASCADE = perte audit) |
| Validation schema JSONB | **Absente** (projects.data accepte tout) |

### 7.2 KV (Vercel)

Utilise pour l'etat ephemere des projets web (TTL 24h). Correct pour cet usage.

### 7.3 StaticData (n8n)

Stockage en memoire n8n. Avantages : rapide, pas de DB externe. Inconvenients : perdu au redemarrage, pas de transactions atomiques.

---

## 8. DEVOPS & INFRASTRUCTURE

### 8.1 Deploiement

| Composant | Plateforme | Methode |
|-----------|-----------|---------|
| Web App | Vercel | Git push (CI/CD auto) |
| n8n | VPS Hostinger | `deploy-v21.sh` (API PUT) |
| Remotion | VPS Hostinger | Docker container |

### 8.2 Securite deploy

| Probleme | Detail |
|----------|--------|
| Cle API n8n en clair | `deploy-v21.sh` ligne 9 |
| Token Telegram en fallback | `deploy-v21.sh` ligne 53 |
| Fichiers temp dans /tmp | World-readable, secrets exposes |
| Pas de health checks | Ni Docker HEALTHCHECK ni monitoring |

### 8.3 Elements absents

- **Monitoring/Alerting** : Aucune solution (Sentry, Datadog, etc.)
- **Logging structure** : `console.log` uniquement (pas de correlation)
- **Backups BDD** : Non documente
- **CI/CD n8n** : Script bash manuel uniquement
- **Secrets management** : Pas de vault (secrets dans .env et scripts)

---

## 9. QUALITE DE CODE

### 9.1 Metriques

| Metrique | Valeur | Statut |
|----------|--------|--------|
| TODO/FIXME/HACK | 0 | OK |
| Tests unitaires | 0 | **Critique** |
| Tests integration | 0 | **Critique** |
| ESLint config | Basique (Next.js defaults) | Pas de regles securite |
| TypeScript strict | Oui (web + remotion) | OK |
| Documentation | 6400+ lignes markdown | Excellente |
| console.log en prod | ~20 occurrences | Acceptable (logging) |

### 9.2 Patterns positifs

- Schemas Zod pour les compositions Remotion
- Retry avec backoff exponentiel (Replicate, Flux)
- Gestion des credentials via `process.env` (partiellement)
- Separation claire des responsabilites (nodes n8n)
- Adapter Supabase custom bien implemente

### 9.3 Patterns a ameliorer

- Pas de validation Zod sur les routes API web
- `JSON.parse()` sans try-catch (3 emplacements n8n)
- Catches vides silencieux (`} catch (e) {}`)
- `HandleCallbackQuery.js` : 804 lignes (devrait etre decoupe)
- Pas de pre-commit hooks (secrets pourraient etre commites)

---

## 10. MATRICE DE RISQUES

### Critique (a corriger immediatement)

| # | Risque | Composant | Impact |
|---|--------|-----------|--------|
| C1 | Token Telegram hardcode dans le code | n8n | Compromission du bot |
| C2 | Cle API n8n dans deploy script | n8n | Controle total de l'instance |
| C3 | `/api/replicate/[id]` sans auth | Web | Enumeration de donnees |
| C4 | CORS `*` sur serveur Remotion | Remotion | Abus de ressources |
| C5 | Pas de limite sur upload fichiers | Web | DoS stockage/memoire |

### Haute (a corriger cette semaine)

| # | Risque | Composant | Impact |
|---|--------|-----------|--------|
| H1 | Race condition credits (non-atomique) | Web | Double-depense |
| H2 | `project.userId` nullable dans auth check | Web | Acces non autorise |
| H3 | Fuite memoire serveur Remotion | Remotion | Crash apres N rendus |
| H4 | Pas de cleanup disque `/out/` | Remotion | Disque plein |
| H5 | `JSON.parse` sans try-catch (x3) | n8n | Crash pipeline |
| H6 | Pas de bounds check roomIdx callback | n8n | Erreur runtime |
| H7 | Pas de rate limiting (tous endpoints) | Web + Remotion | Abus/DoS |
| H8 | Pas de validation input (routes API) | Web | Donnees corrompues |
| H9 | Headers securite absents (CSP, etc.) | Web | XSS/Clickjacking |
| H10 | Handlers Stripe manquants (refund, failed) | Web | Incoherence credits |

### Moyenne (a corriger ce mois)

| # | Risque | Composant | Impact |
|---|--------|-----------|--------|
| M1 | NextAuth en version beta | Web | Instabilite potentielle |
| M2 | Remotion 186 versions de retard | Remotion | Bugs connus non corriges |
| M3 | Docker tourne en root | Remotion | Surface d'attaque elargie |
| M4 | Pas de Error Boundaries React | Remotion | Render echoue silencieusement |
| M5 | Pas de monitoring/alerting | Infra | Pannes non detectees |
| M6 | Race conditions n8n (sessions) | n8n | Etat corrompu |
| M7 | SSRF via URLs non validees | Web | Acces reseau interne |
| M8 | Injection prompt utilisateur | n8n | Generation non souhaitee |

### Basse (amelioration continue)

| # | Risque | Composant | Impact |
|---|--------|-----------|--------|
| B1 | 0 tests | Tout | Regressions non detectees |
| B2 | Pas de pre-commit hooks | Tout | Secrets commites |
| B3 | Accessibilite composants (aria) | Web | Non-conformite |
| B4 | HandleCallbackQuery trop long (804L) | n8n | Maintenabilite |
| B5 | Pas de validation env vars au startup | Web | Erreurs runtime tardives |

---

## 11. PLAN D'ACTION RECOMMANDE

### Phase 1 — Securite immediate (J+0 a J+3)

- [ ] **Rotation tokens** : Regenerer le token Telegram Bot et la cle API n8n
- [ ] **Supprimer secrets du code** : Remplacer tous les fallbacks hardcodes par `process.env` seul
- [ ] **Auth `/api/replicate/[id]`** : Ajouter `requireAuth()` + validation ownership
- [ ] **Fermer CORS Remotion** : Whitelist des domaines autorises + API key
- [ ] **Limiter upload** : Max 50MB/fichier, max 20 fichiers, validation MIME

### Phase 2 — Robustesse (J+3 a J+10)

- [ ] **Credit atomique** : RPC Supabase `deduct_credits_if_sufficient` avec WHERE
- [ ] **Fix userId null** : `if (!project.userId || project.userId !== ...)` dans `requireProjectOwner()`
- [ ] **try-catch JSON.parse** : 3 emplacements dans n8n nodes
- [ ] **Bounds check roomIdx** : Validation dans `HandleCallbackQuery.js`
- [ ] **Cleanup Remotion** : TTL sur Map + suppression MP4 apres download
- [ ] **Rate limiting** : Upstash/Redis sur checkout, upload, project
- [ ] **Headers securite** : CSP, X-Frame-Options, HSTS dans next.config.ts
- [ ] **Handlers Stripe** : `charge.refunded`, `payment_intent.payment_failed`

### Phase 3 — Qualite (J+10 a J+30)

- [ ] **Validation Zod** : Schemas sur toutes les routes API POST/PUT
- [ ] **Tests** : Setup Vitest + premiers tests routes API et services
- [ ] **NextAuth stable** : Migration vers v5.0 stable
- [ ] **Update Remotion** : 4.0.242 → derniere version
- [ ] **Docker hardening** : User non-root, multi-stage build, HEALTHCHECK
- [ ] **Error Boundaries** : Wrapper compositions Remotion
- [ ] **Monitoring** : Sentry (web) + health checks automatises

### Phase 4 — Excellence (J+30+)

- [ ] **Pre-commit hooks** : Detection de secrets (gitleaks/detect-secrets)
- [ ] **Logging structure** : Pino/Winston avec correlation IDs
- [ ] **Backups BDD** : Automated Supabase backups
- [ ] **Refactoring n8n** : Decouper HandleCallbackQuery en sous-fonctions
- [ ] **Accessibilite** : Audit WCAG sur composants web
- [ ] **Bundle analysis** : @next/bundle-analyzer
- [ ] **Validation env vars** : Schema Zod au demarrage de l'app

---

## RESUME EXECUTIF

| Domaine | Score | Verdict |
|---------|-------|---------|
| **Securite** | 3/10 | Secrets exposes, pas de rate limiting, endpoints ouverts |
| **Architecture** | 8/10 | Bien concue, separation des responsabilites claire |
| **Qualite de code** | 7/10 | TypeScript strict, bon typage, mais 0 tests |
| **Web App** | 6/10 | Fonctionnelle, manque validation et securisation |
| **Remotion** | 7/10 | Compositions excellentes, serveur sous-securise |
| **n8n Workflows** | 6/10 | Pipeline robuste, erreurs non gerees, secrets exposes |
| **DevOps** | 4/10 | Deploiement fonctionnel, pas de monitoring ni CI/CD |
| **Documentation** | 9/10 | 6400+ lignes, tres detaillee |
| **GLOBAL** | **6.2/10** | **Fonctionnel mais non pret pour la production a grande echelle** |

Le projet a une architecture solide et une documentation exemplaire. Les priorites absolues sont la securisation des secrets, l'ajout d'authentification/rate limiting sur les endpoints exposes, et la mise en place de validation d'input. Ces corrections peuvent etre faites en 2 semaines et monteraient le score securite a 7+/10.
