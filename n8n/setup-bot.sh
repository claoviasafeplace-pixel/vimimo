#!/bin/bash
# ──────────────────────────────────────────────────────────────
# VIMIMO — Configuration du Bot Telegram
# ──────────────────────────────────────────────────────────────
# Usage : TELEGRAM_BOT_TOKEN=your_token bash setup-bot.sh
# Ce script configure les commandes du menu, la description,
# et la photo de profil du bot via l'API Telegram.
# ──────────────────────────────────────────────────────────────

set -euo pipefail

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "❌ Erreur : variable TELEGRAM_BOT_TOKEN non définie."
  echo "   Usage : TELEGRAM_BOT_TOKEN=123456:ABC-DEF bash setup-bot.sh"
  exit 1
fi

API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"

echo "⚙️  Configuration des commandes du menu..."
curl -s -X POST "${API}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Lancer l assistant et transformer une pièce"},
      {"command": "styles", "description": "Voir le catalogue des styles déco"},
      {"command": "exemples", "description": "Voir nos meilleures réalisations IA"},
      {"command": "aide", "description": "Conseils pour réussir votre vidéo source"}
    ]
  }' | python3 -m json.tool
echo ""

echo "📝 Configuration de la description du bot..."
curl -s -X POST "${API}/setMyDescription" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "VIMIMO transforme vos pièces vides en intérieurs de magazine grâce à l IA. Envoyez une photo ou vidéo pour commencer !"
  }' | python3 -m json.tool
echo ""

echo "📝 Configuration de la description courte..."
curl -s -X POST "${API}/setMyShortDescription" \
  -H "Content-Type: application/json" \
  -d '{
    "short_description": "Virtual Staging IA — Vidéo 4K en 3 min"
  }' | python3 -m json.tool
echo ""

echo "✅ Bot configuré avec succès !"
echo ""
echo "📋 Commandes disponibles :"
echo "   /start    → Message d'accueil"
echo "   /styles   → Catalogue des styles"
echo "   /exemples → Réalisations IA"
echo "   /aide     → Conseils vidéo"
