#!/bin/bash
# ─── start.sh ──────────────────────────────────────────────────────────────────
# Script de démarrage automatique CinderAuto
# Usage: ~/start.sh

# Démarrer le réseau
sudo ip addr add 192.168.43.15/24 dev enp0s3 2>/dev/null
sudo ip route add default via 192.168.43.1 2>/dev/null
sudo /usr/sbin/sshd 2>/dev/null

# Démarrer le backend
cd ~/cinderauto/backend
source venv/bin/activate
python app.py &

# Démarrer le frontend
cd ~/cinderauto/frontend
npm run dev &

echo "✅ CinderAuto démarré !"
echo "📱 Accès : http://192.168.43.15:5173"
