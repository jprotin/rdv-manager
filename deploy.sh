#!/bin/bash
set -e

COMPOSE="docker compose"
COMPOSE_DEV="docker compose -f docker-compose.dev.yml"

usage() {
  echo "Usage: $0 {build|start|stop|restart|clean|logs|status|dev|dev-stop|dev-logs}"
  echo ""
  echo "  Production :"
  echo "    build      Construire les images Docker"
  echo "    start      Démarrer l'application (port \${FRONTEND_PORT:-4200})"
  echo "    stop       Arrêter l'application"
  echo "    restart    Redémarrer l'application"
  echo "    logs       Suivre les logs (optionnel: nom du service)"
  echo "    status     État des conteneurs"
  echo "    clean      Supprimer conteneurs, volumes et images"
  echo ""
  echo "  Développement local :"
  echo "    dev        Démarrer l'émulateur Firestore"
  echo "    dev-stop   Arrêter l'émulateur"
  echo "    dev-logs   Suivre les logs de l'émulateur"
  exit 1
}

# ---- Production ----

build() {
  echo "→ Build des images Docker..."
  $COMPOSE build --no-cache
  echo "✓ Build terminé."
}

start() {
  echo "→ Démarrage des services..."
  $COMPOSE up -d
  sleep 5
  $COMPOSE ps
  echo "✓ Application disponible sur http://localhost:${FRONTEND_PORT:-4200}"
}

stop() {
  echo "→ Arrêt des services..."
  $COMPOSE down
  echo "✓ Services arrêtés."
}

restart() {
  stop
  start
}

clean() {
  echo "⚠ Suppression de tous les conteneurs, volumes et images..."
  read -p "Confirmer ? (o/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Oo]$ ]]; then
    $COMPOSE down --volumes --remove-orphans
    docker system prune -af
    echo "✓ Nettoyage terminé."
  else
    echo "Annulé."
  fi
}

logs() {
  $COMPOSE logs -f --tail=100 "${2:-}"
}

status() {
  $COMPOSE ps
}

# ---- Développement ----

dev() {
  if [ ! -f frontend/.env ]; then
    echo "⚠ Fichier frontend/.env introuvable."
    echo "  cp frontend/.env.example frontend/.env"
    echo "  puis renseigner les variables (VITE_FIREBASE_PROJECT_ID peut être fictif, ex: rdv-dev)"
    exit 1
  fi

  echo "→ Build et démarrage (émulateur Firestore + frontend dev)..."
  $COMPOSE_DEV up -d --build

  echo ""
  echo "→ Attente du démarrage..."
  for i in $(seq 1 24); do
    if $COMPOSE_DEV ps | grep -q "healthy"; then
      break
    fi
    sleep 3
    printf "."
  done
  echo ""
  echo ""
  echo "✓ Environnement de développement prêt :"
  echo "  App          : http://localhost:5173"
  echo "  Emulator UI  : http://localhost:4000  ← inspecter/modifier les données"
}

dev-stop() {
  echo "→ Arrêt de l'émulateur..."
  $COMPOSE_DEV down
  echo "✓ Émulateur arrêté. Les données sont sauvegardées dans ./emulator-data/"
}

dev-logs() {
  $COMPOSE_DEV logs -f --tail=100
}

# Load .env if present (production: .env à la racine, dev: frontend/.env)
[ -f .env ] && export $(grep -v '^#' .env | xargs)
[ -f frontend/.env ] && export $(grep -v '^#' frontend/.env | xargs)

case "${1:-}" in
  build)     build      ;;
  start)     start      ;;
  stop)      stop       ;;
  restart)   restart    ;;
  clean)     clean      ;;
  logs)      logs "$@"  ;;
  status)    status     ;;
  dev)       dev        ;;
  dev-stop)  dev-stop   ;;
  dev-logs)  dev-logs   ;;
  *)         usage      ;;
esac
