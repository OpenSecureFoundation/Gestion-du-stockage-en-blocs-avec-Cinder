# Projet de Gestion du stockage en blocs avec Cinder
Réalisé par DZOUAKEU FESSI Emmanuella Cindy
# Présentation 

Ce projet s’inscrit dans le domaine du cloud computing et plus précisément dans la gestion du stockage en blocs avec OpenStack Cinder. Il vise à automatiser la création des snapshots des volumes afin d’améliorer la sécurité des données et réduire les interventions manuelles.
Dans les environnements OpenStack, la gestion des snapshots est généralement réalisée manuellement. Cette approche présente plusieurs limites, notamment le risque d’oubli, la dépendance à l’utilisateur et le manque d’automatisation. Face à ces limites, une solution automatisée devient nécessaire.

# Problématique 

Comment automatiser la gestion des snapshots des volumes Cinder tout en offrant une interface simple permettant aux utilisateurs de configurer eux-mêmes leurs sauvegardes ?
# Objectifs 
- Permettre à un utilisateur de configurer des snapshots automatiques
- Automatiser la création des snapshots
- Réduire les erreurs humaines
- Améliorer la disponibilité des données
# Fonctionnalités
- S'uthentifier via Keystone
- Afficher des volumes Cinder
- Sélectionner d’un volume
- Définir la fréquence de snapshot
- Planifier automatiquement des snapshots
- Restaurer un volume via un snapshot
# Architecture générale
L’architecture repose sur une application utilisateur interagissant avec les services OpenStack via API REST. Un composant Scheduler assure l’automatisation des snapshots.

# Description des composants
- Interface utilisateur : interaction avec l’utilisateur
- Keystone : authentification
- Cinder : gestion des volumes et snapshots
- Scheduler : planification automatique

# Lancer tout le projet en une commande 

#!/bin/bash
#─── start.sh ──────────────────────────────────────────────────────────────────
#Script de démarrage automatique CinderAuto
#Usage: ~/start.sh

#Démarrer le réseau
sudo ip addr add 192.168.43.15/24 dev enp0s3 2>/dev/null
sudo ip route add default via 192.168.43.1 2>/dev/null
sudo /usr/sbin/sshd 2>/dev/null

#Démarrer le backend
cd ~/cinderauto/backend
source venv/bin/activate
python app.py &

#Démarrer le frontend
cd ~/cinderauto/frontend
npm run dev &

echo "✅ CinderAuto démarré !"
echo "📱 Accès : http://192.168.43.15:5173"


