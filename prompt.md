# Prompts VIMIMO — Historique complet

## Prompt 1 — Refonte SaaS E-commerce Premium (Plan initial)

> Phase 0 à 10 : Refonte complète du modèle VIMIMO.
> Passage d'un outil self-service à un modèle conciergerie semi-automatique.
> Le client commande et paie, l'IA tourne, l'admin valide/ajuste, le client reçoit le livrable.

*(Ce prompt a généré le plan en 10 phases : Design System, Data Model, Tunnel /commander, Pricing B2C/B2B, Landing Page, Dashboard Client, Admin Kanban, Pipeline Integration, Login/Guest, Cleanup)*

---

## Prompt 2 — Redesign Landing Luxury Dark Mode

> Je veux un redesign complet de la landing page avec un design system "Luxury Dark Mode" :
> - Background : #0A0A0B
> - Accent : Architectural Champagne #D4AF37
> - Framer Motion animations partout
> - Hero → Social Proof → How it Works → Pricing/CTA funnel
> - Enterprise pricing avec slider (1-10 biens) + custom plan (10+ biens)

---

## Prompt 3 — Ajout d'animations

> ajoute des animations

*(Ajout massif d'animations : custom hooks useCounter, TiltCard, Particles, Marquee, GradientBorder, staggered word reveal, SVG line draw, parallax, floating particles, animated counters, trust marquee, 3D tilt cards, icon shake, glow backdrop, connector line draw, star spin-in, animated gradient border, spring price morphing, AnimatePresence)*

---

## Prompt 4 — Commit, push et deploy

> commit and push to vercel change la police decriture et ajoute des animations design

---

## Prompt 5 — Audit complet

> Fais un audit complet de mon site web et du projet

*(Audit en 4 axes parallèles : Sécurité API, Qualité code/architecture, Pipeline Inngest/BDD, Frontend UX/Performance/SEO. Résultat : 102 findings au total, rapport de 870 lignes)*

---

## Prompt 6 — Correction bugs + Refonte design warm cream + Pricing par bien

> oui corrige les bugs critiques

Suivi du prompt complet de refonte :

```
Tu es Claude Code (Opus 4.6) intégré dans un monorepo TypeScript Next.js/Remotion/n8n.

ROLE
Tu es à la fois :
- UX/UI designer senior spécialisé SaaS B2B immobilier
- Frontend engineer Next.js 16 + React 19 + Tailwind v4 + Framer Motion
- Copywriter orienté conversion (landing, pricing, bénéfices clairs)

CONTEXTE PRODUIT — VIMIMO
VIMIMO est une plateforme SaaS de home staging virtuel par IA pour les pros de l'immobilier (agents, mandataires, agences, marchands de biens).

Promesse business à clarifier et renforcer :
- À partir de simples photos (souvent vides ou datées), VIMIMO livre :
  - des visuels après home staging virtuel, réalistes et stylés
  - des vidéos avant/après et des montages "visite" pour annonces et réseaux sociaux
- Objectif : rendre le bien irrésistible en ligne, accélérer la vente/la mise en location et limiter la négociation.

Formule à garder en tête :
« Je transforme des photos brutes en présentations de biens ultra vendeuses et stylées. »

IMPORTANT — MODÈLE TARIFAIRE
- Le modèle passe à une **facturation par bien**, pas par crédit/pièce.
- Sur toute l'interface publique (landing, pricing, FAQ, textes) :
  - Ne parle plus de "crédits" ni de "crédits par pièce".
  - Parle en "bien" et, si besoin, en "nombre de biens traités par mois".
- Le backend peut continuer à fonctionner en crédits internes si besoin, mais c'est un **détail de mise en œuvre, jamais exposé à l'utilisateur**.
- Ton travail ici est purement UX/UI/copy : **adapter la présentation, les textes et les composants de pricing à une logique par bien**.

STACK & ARBO WEB
- Front : Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion
- Dossier front : web/
  - Pages clés :
    - Landing : web/src/app/page.tsx
    - Pricing : web/src/app/pricing/page.tsx
    - Login/Dashboard/Project : ne PAS casser la structure ni la logique métier
  - Composants :
    - web/src/components/landing/*
    - web/src/components/marketing/*
    - web/src/components/pricing/*
    - web/src/components/ui/*
- Ne JAMAIS modifier :
  - la logique de paiements, Inngest, Supabase, webhooks
  - les routes API et les types métier

OBJECTIF GLOBAL
Rendre le site VIMIMO :
1. Beaucoup plus design et premium
2. Visuellement cohérent avec une identité forte
3. Vivant grâce à des animations maîtrisées (Framer Motion)
4. Très clair sur la promesse : avant/après réaliste, transformation des photos en présentation vendeuse
5. Plus convaincant côté offres et bénéfices, avec une grille **par bien**, simple à comprendre.

CONTRAINTES GÉNÉRALES
- Ne touche pas au backend, à la BDD, aux jobs Inngest, ni aux webhooks.
- Ne change pas les routes ni les contrats d'API.
- Tu peux refactorer les composants React/Tailwind/Framer Motion, mais sans casser le comportement fonctionnel actuel.
- Respecte l'accessibilité de base (aria-*, contrastes suffisants, focus states).

IDENTITÉ VISUELLE À CONSTRUIRE
Je veux :
- Un fond crème chaleureux sur quasiment tout le site (ex : #FDF7F0 ou équivalent).
- Une identité qui évoque :
  - Immobilier haut de gamme mais accessible
  - Intérieurs lumineux, élégants, contemporains
  - Fiabilité / pro (pour des agences immobilières)
- Définit une palette cohérente, par exemple (à adapter intelligemment dans le code) :
  - Fond : crème chaud
  - Texte principal : gris anthracite très lisible
  - Accent 1 : terracotta / nude (pour boutons primaires, badges)
  - Accent 2 : bleu nuit ou vert profond (confiance, sections importantes)
  - Accent discret doré/beige pour touches premium (icônes, petits détails)
- Mets à jour toutes les classes Tailwind pour harmoniser :
  - Backgrounds, boutons, liens, survols, cartes, sections
  - États hover/focus/active cohérents sur tout le site
- Nettoie l'ancienne palette si possible pour éviter le mélange de styles.

ANIMATIONS & MICRO-INTERACTIONS
Je trouve actuellement le site trop "plat". Je veux :
1. Sur la landing :
   - Animations d'entrée en douceur (scroll reveal) pour les sections clés :
     - Hero
     - Section "Comment ça marche"
     - Section "Avant / Après"
     - Section "Offres & prix"
   - Transitions douces sur les boutons (scale léger + ombre + changement de couleur).
   - Hover cards pour les bénéfices/étapes, avec légère translation et ombre.
2. Sur la navigation :
   - Apparition douce de la navbar (fade/slide) au chargement.
   - Menu mobile avec animation (ouvrir/fermer) claire.
3. Sur les cartes de pricing :
   - Mise en avant de l'offre recommandée avec animation subtile au survol.
4. Garder les animations légères (pas de flashy), performantes et non bloquantes.

IMPORTANT :
- Utilise Framer Motion (déjà dans le projet) pour les principales animations.
- Regroupe les logiques d'animation dans des petits composants/utilitaires réutilisables quand c'est pertinent (variants, wrappers AnimatedSection, etc.).
- Assure-toi que le site reste fluide (pas d'animations lourdes sur des listes énormes).

SECTION "AVANT / APRÈS" TRÈS CONCRÈTE
Je veux un vrai focus sur le cœur de VIMIMO : la transformation d'un bien.

Tâches :
1. Créer/renforcer une section dédiée "Avant / Après" sur la landing :
   - Un composant principal (ex : BeforeAfterShowcase) dans web/src/components/landing
   - Présenter 1 à 3 exemples de pièces :
     - Photo "Avant" : pièce vide OU datée
     - Photo "Après" : intérieur meublé, décoré, lumineux
   - Mettre en place un slider avant/après ou un toggle clair (même sans vraies photos de prod, utiliser des placeholders/mock pour l'instant).
2. Ajouter un texte très concret, orienté bénéfices :
   - "Avant : pièce vide, difficile à se projeter"
   - "Après : salon chaleureux, prêt à être vendu"
   - Mots-clés : vendre plus vite, déclencher le coup de cœur, annonces qui sortent du lot, attirer plus de contacts qualifiés.
3. Relier cette section à la vidéo :
   - Mentionner que VIMIMO ne fait pas que des images, mais aussi :
     - des vidéos avant/après
     - des montages "visite" et "reels" pour réseaux sociaux

REFONTE DU HERO (PAGE D'ACCUEIL)
Objectif : un hero qui explique immédiatement et visuellement ce que fait VIMIMO.

Demandes :
1. Nouveau wording (FR) clair et concis :
   - Titre court qui raconte la transformation :
     - Exemple de direction (à améliorer) :
       "De simples photos à une présentation de bien irrésistible"
   - Sous-titre orienté résultats :
     - Vendre/louer plus vite
     - Valoriser le bien sans travaux
     - Présenter chaque pièce meublée, décorée, lumineuse
2. Call-to-action :
   - CTA principal : "Tester avec un bien" / "Transformer mes photos"
   - CTA secondaire : "Voir des exemples avant/après"
3. Illustrations dans le hero :
   - Un mockup combinant :
     - Une photo de pièce vide
     - Une version mise en scène
     - Un aperçu de vidéo/montage (thumbnail)
   - Tu peux le composer avec les assets existants ou des placeholders bien intégrés (section landing components).

REFONTE DES TEXTES & STRUCTURE DE LA LANDING
Tu dois revoir tout le copywriting pour :
- Clarifier le service :
  - "Vous nous envoyez vos photos brutes d'un bien"
  - "Nous livrons une présentation complète du bien : images et/ou vidéos prêtes à être utilisées dans vos annonces"
- Expliquer simplement le pipeline sans jargon technique :
  - Étapes côté utilisateur :
    1) Upload des photos d'un bien
    2) Choix du style / des pièces à mettre en avant
    3) Réception des visuels et vidéos prêts à l'emploi
- Transformer les features techniques en bénéfices business :
  - Moins de visites inutiles
  - Mieux se démarquer dans les portails immobiliers
  - Justifier un meilleur prix / limiter la négo
- Ajouter/renforcer des sections :
  - "Pour qui ?" (agents, mandataires, agences, marchands de biens)
  - "Cas d'usage" (biens vides, biens à rénover, logements meublés mais datés)
  - "FAQ" basique (droits d'utilisation des images, délais, formats livrés, etc.)

TRAVAIL SUR LA PAGE PRICING — FACTURATION PAR BIEN
Objectif : rendre les offres lisibles, rassurantes et orientées usage réel, avec un modèle **par bien**.

Contexte business (à respecter côté positionnement, mais adapter le wording) :
- Packs ponctuels (one shot) :
  - 1 bien 19€
  - 3 biens 49€
  - 5 biens 79€
- Abonnements mensuels pour agences (usage récurrent) :
  - Starter 49€ / mois
  - Pro 79€ / mois
  - Agency 149€ / mois

ATTENTION :
- Sur l'UI, on parle en **nombre de biens** traités, pas en crédits/pièces.
- En coulisses, si le backend a encore une logique de crédits/pièces, tu ne la modifies pas dans cette tâche. Tu adaptes seulement l'UX, les textes et les composants.

Demandes précises :
1. Clarifier la structure de la page pricing :
   - Bloc "Packs par bien" (one shot) clairement séparé.
   - Bloc "Abonnements agence" (nombre de biens par mois) clairement séparé.
2. Réécrire les descriptions pour chaque offre en mode concret :
   - À qui c'est destiné (indépendant, petite agence, réseau, etc.)
   - Quel problème ça résout (ex : valoriser les mandats exclusifs, accélérer les ventes en portefeuille, etc.)
   - Ce que l'utilisateur obtient concrètement pour **chaque bien** :
     - X visuels avant/après
     - Vidéo visite / reels possibles
3. Mettre en avant l'offre la plus logique pour une agence type avec :
   - Badge "Le plus utilisé"
   - Mise en avant visuelle (taille, background, bordure, légère animation)
4. Rappeler que :
   - 1 "commande" = 1 bien complet traité (plusieurs pièces possibles).
   - Ne jamais utiliser le mot "crédit" dans les textes, seulement "bien".

ACCESSIBILITÉ MINIMALE
Corrige/propose :
- Boutons de menu mobile avec aria-expanded + aria-controls
- Champs de recherche/filters avec aria-label explicites
- Icônes purement décoratives marquées comme telles
- Contrastes lisibles sur fond crème (texte jamais trop clair)

PLAN D'ACTION CONCRET POUR LE CODE
1. Inspecter les fichiers :
   - web/src/app/page.tsx
   - web/src/app/pricing/page.tsx
   - web/src/components/landing/*
   - web/src/components/marketing/*
   - web/src/components/pricing/*
   - web/src/components/ui/*
2. Proposer une première passe :
   - Refonte du hero
   - Nouvelle section "Avant / Après"
   - Palette Tailwind harmonisée (classes mises à jour dans les components)
   - Animations principales (wrapper AnimatedSection + animations hero/pricing/cards)
   - Adaptation UX pricing pour une logique **par bien** (suppression du vocabulaire "crédits")
3. Puis affiner :
   - Copywriting de toutes les sections
   - Page pricing (structure + textes orientés "par bien")
   - Ajustements a11y

FORMAT DE SORTIE ATTENDU
- Fournis directement des modifications de code complètes pour les fichiers clés (diff ou fichiers entiers).
- Explique en quelques phrases ce que tu changes par fichier.
- Respecte la cohérence globale TypeScript/React/Tailwind existante.
```

---

## Prompt 7 — Commit, push et deploy

> commit and push to vercel

---

## Prompt 8 — Deploy vimimo.fr + fichier prompts

> push sur vimimo.fr aussi creer moi un fichier prompt.md avec tous les prompt que je t'ai donnée
