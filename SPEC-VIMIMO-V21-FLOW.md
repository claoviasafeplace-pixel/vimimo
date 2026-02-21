# VIMIMO v2.1 — Specification du Flow Utilisateur

## Problemes identifies dans la version actuelle

### 1. Aucun controle sur le staging
L'utilisateur envoie ses photos et recoit un seul resultat de staging par piece, sans possibilite de choisir. Si le resultat ne convient pas (mauvais style de meubles, agencement inadapte, decoration hors sujet), il n'y a aucun recours. Le pipeline impose un resultat unique et lance directement la video dessus.

### 2. Pas de video individuelle par piece
Actuellement, toutes les pieces sont directement compilees dans une seule video finale. L'utilisateur ne peut pas voir le rendu video d'une piece specifique avant la compilation. Impossible d'isoler une piece pour la partager ou la valider independamment.

### 3. Rigidite du nombre de photos
Le flow est concu pour un lot de photos. L'utilisateur devrait pouvoir envoyer 1 seule photo ou 20, sans contrainte, et le pipeline s'adapte.

### 4. Video finale non adaptative
La video finale a une duree et une structure fixes. Elle devrait s'adapter dynamiquement : courte pour 1-2 photos, longue pour 10+, avec un montage coherent dans tous les cas.

---

## Flow utilisateur souhaite

### Etape 1 — Envoi libre des photos

```
L'utilisateur envoie ses photos sur Telegram.
- 1 photo, 3 photos, 10 photos, 20 photos... aucune limite imposee.
- Il envoie a son rythme, une par une ou en rafale.
- Quand il a fini, il envoie /go pour lancer le traitement.
```

**Principe** : L'utilisateur est totalement libre du nombre de photos. Le bot accumule tout ce qu'il recoit jusqu'au declenchement /go.

---

### Etape 2 — Selection interactive par photo

Pour **chaque photo** envoyee, le bot propose plusieurs options de staging :

```
Photo 1/5 — Salon principal
┌──────────────────────────────────┐
│  [Photo originale de la piece]   │
├──────────────────────────────────┤
│                                  │
│  Option 1 : Meuble moderne       │
│  Option 2 : Meuble scandinave    │
│  Option 3 : Decoration chaleureuse│
│  Option 4 : Agencement ouvert    │
│  Option 5 : Style luxe minimaliste│
│                                  │
│  [1] [2] [3] [4] [5]            │
│  [   Nouvelles options   ]       │
└──────────────────────────────────┘
```

**Ce que l'utilisateur peut faire :**

| Action | Resultat |
|--------|----------|
| Cliquer sur **1, 2, 3, 4 ou 5** | Selectionne cette option pour cette photo. Passe a la photo suivante. |
| Cliquer sur **Nouvelles options** | Le bot genere 5 nouvelles propositions differentes (max 3 regenerations par photo). |

**Types de propositions** (variees a chaque generation) :
- **Meuble** : Differents styles de mobilier (scandinave, industriel, contemporain, classique...)
- **Decoration** : Variations de deco (tableaux, plantes, tapis, luminaires, rideaux...)
- **Agencement** : Dispositions differentes des meubles dans l'espace
- **Ambiance** : Eclairages et atmospheres differentes (chaud, froid, naturel, cosy...)

L'objectif : l'utilisateur choisit **la proposition la plus pertinente** pour chaque piece, selon ses gouts et le rendu souhaite.

---

### Etape 3 — Videos individuelles par photo

Une fois **toutes les photos selectionnees**, le bot genere une video pour chaque photo :

```
Generation des videos en cours...

Video 1/5 — Salon principal ✓
Video 2/5 — Cuisine ouverte ✓
Video 3/5 — Chambre parentale ... (en cours)
Video 4/5 — Salle de bain
Video 5/5 — Bureau
```

Chaque video individuelle montre :
1. **La photo originale** (piece vide) — 1-2 secondes
2. **Transition animee** (wipe/swipe fluide) — passage de l'avant a l'apres
3. **La photo stagee** (proposition IA selectionnee) — avec mouvement camera subtil
4. **Retour photo stagee fixe** — pour apprecier le resultat

**Chaque video est envoyee individuellement sur Telegram** au fur et a mesure qu'elle est prete. L'utilisateur peut voir, valider et partager chaque piece independamment.

---

### Etape 4 — Video de montage finale

Une fois toutes les videos individuelles generees, le bot compile une **video montee complete** :

```
┌─────────────────────────────────────────┐
│           VIDEO FINALE MONTEE           │
├─────────────────────────────────────────┤
│                                         │
│  INTRO                                  │
│  - Logo/titre du bien                   │
│  - Adresse ou reference                 │
│  - 2-3 secondes                         │
│                                         │
│  PLAN 1 — Salon principal               │
│  - Photo originale (swipe anime)        │
│  - → Proposition IA selectionnee        │
│  - Video avec mouvement camera          │
│  - Transition vers plan suivant         │
│                                         │
│  PLAN 2 — Cuisine ouverte               │
│  - Photo originale (swipe anime)        │
│  - → Proposition IA selectionnee        │
│  - Video avec mouvement camera          │
│  - Transition vers plan suivant         │
│                                         │
│  ... (autant de plans que de photos)    │
│                                         │
│  PLAN N — Derniere piece                │
│  - Photo originale (swipe anime)        │
│  - → Proposition IA selectionnee        │
│  - Video avec mouvement camera          │
│                                         │
│  OUTRO                                  │
│  - Recap visuel                         │
│  - Contact / branding                   │
│  - 2-3 secondes                         │
│                                         │
└─────────────────────────────────────────┘
```

**La duree s'adapte automatiquement :**

| Nombre de photos | Duree estimee de la video finale |
|-----------------|----------------------------------|
| 1 photo | ~8-10 secondes |
| 3 photos | ~20-25 secondes |
| 5 photos | ~35-40 secondes |
| 10 photos | ~70-80 secondes |
| 20 photos | ~2-3 minutes |

**Structure de chaque plan dans le montage :**
1. **Photo originale** affichee brievement (1s)
2. **Animation swipe/wipe** — transition clean de l'avant vers l'apres (1s)
3. **Video IA** — la video generee avec mouvement camera sur le staging (4-5s)
4. **Photo stagee** fixe finale — appreciation du resultat (1s)
5. **Transition** vers le plan suivant (crossfade/cut 0.5s)

---

## Resume du flow complet

```
UTILISATEUR                          BOT VIMIMO
    |                                     |
    |-- Envoie 1 a N photos ------------->|
    |-- Envoie /go ---------------------->|
    |                                     |
    |                          [Analyse IA de toutes les photos]
    |                                     |
    |<-- Photo 1 : 5 options staging -----|
    |-- Choix (ou regen) ---------------->|
    |                                     |
    |<-- Photo 2 : 5 options staging -----|
    |-- Choix (ou regen) ---------------->|
    |                                     |
    |         ... pour chaque photo ...   |
    |                                     |
    |<-- Photo N : 5 options staging -----|
    |-- Choix (ou regen) ---------------->|
    |                                     |
    |                          [Generation videos individuelles]
    |                                     |
    |<-- Video individuelle piece 1 ------|
    |<-- Video individuelle piece 2 ------|
    |<-- ...                              |
    |<-- Video individuelle piece N ------|
    |                                     |
    |                          [Compilation video finale]
    |                                     |
    |<-- VIDEO MONTEE COMPLETE -----------|
    |                                     |
```

---

## Points cles

1. **Liberte totale** sur le nombre de photos : 1 ou 50, le pipeline s'adapte.
2. **Choix utilisateur** : 5 propositions par photo, possibilite de regenerer, l'utilisateur decide.
3. **Videos individuelles** envoyees une par une : chaque piece est visible et partageable seule.
4. **Video montee finale** : compilation de tous les plans avec transitions animees, duree adaptative.
5. **Qualite du staging** : chaque proposition preserve la structure de la piece (murs, fenetres, portes, sol) et ne modifie que le mobilier/decoration.
