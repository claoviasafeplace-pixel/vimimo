Agis en tant qu'Architecte Logiciel Senior, Expert en conception de Bot Telegram, n8n (v2.4.8) et React (Remotion).

Contexte du projet : Je maintiens "VIMIMO", un pipeline de Virtual Staging IA automatisé.

Orchestrateur : n8n (sandbox restrictive : fetch/axios interdits, process doit être importé, état conservé en mémoire via $getWorkflowStaticData('global')).

Interface : Bot Telegram avec un "Wizard" (Inline Keyboards gérés par un nœud HandleCallbackQuery.js) et des messages textuels (gérés par un nœud HandleCustomPrompt.js).

Rendu vidéo : Un serveur Remotion qui reçoit un payload JSON via POST pour compiler la vidéo finale.

Le Besoin (Feature Request) : > Je veux remplacer le titre générique "Visite Virtuelle VIMIMO" de la vidéo finale par les vraies informations du bien. L'utilisateur doit pouvoir saisir de manière optionnelle le Prix, la Ville et le Quartier.

Mission : Rédige-moi les blocs de code pour implémenter ce flux de bout en bout.

Voici les étapes que tu dois coder :

Étape 1 : Modification du Wizard Telegram (HandleCallbackQuery.js)
Après que l'utilisateur a choisi le style de décoration, au lieu de demander immédiatement les photos, ajoute une étape :

Demande : "Voulez-vous ajouter les informations du bien (Prix, Ville, Quartier) pour la vidéo finale ?"

Affiche deux boutons inline : [✍️ Oui, ajouter les infos] (callback_data: 'ask_property_info') et [➡️ Passer] (callback_data: 'skip_property_info').

Si l'utilisateur clique sur "Oui", le bot lui demande de taper les infos (ex: "350 000€, Lyon, Croix-Rousse") et on stocke un flag staticData['awaiting_info_'+chatId] = true.

Étape 2 : Interception du texte (HandleCustomPrompt.js ou Routeur)

Ajoute la logique au début de mon gestionnaire de texte libre : si staticData['awaiting_info_'+chatId] est vrai, on ne fait pas de "Retouche Magique".

On sauvegarde le texte de l'utilisateur dans staticData['propertyInfo_'+chatId] = msg.text.

On supprime le flag d'attente.

On envoie le message confirmant les infos et demandant d'envoyer les photos (ou on auto-start si l'album est déjà là).

Étape 3 : Injection dans le payload Remotion (HandleCallbackQuery.js)

Dans la phase finale de rendu (phase === 'rendering'), récupère ces informations depuis la session.

Modifie le payload JSON envoyé à http://172.18.0.1:8000/renders pour injecter ces infos dans inputProps.property.title (ex: "Appartement à Lyon") et inputProps.property.address (ex: "Croix-Rousse • 350 000€").

Étape 4 : Mise à jour de Remotion (schemas.ts et IntroCard.tsx)

Montre-moi comment adapter le composant React IntroCard.tsx pour qu'il affiche élégamment ces nouvelles données (titre principal, sous-titre pour le quartier, et un joli badge ou texte mis en valeur pour le prix).

Contraintes strictes :

Respecte mon utilisation de staticData.

N'invente pas de modules externes non supportés par n8n.

Donne-moi le code prêt à copier-coller avec des commentaires clairs.