#!/bin/bash
set -e

COMPOSE="docker compose"

usage() {
  echo "Usage: $0 {build|start|stop|restart|clean|logs|status}"
  exit 1
}

build() {
  echo "→ Build des images Docker..."
  $COMPOSE build --no-cache
  echo "✓ Build terminé."
}

start() {
  echo "→ Démarrage des services..."
  $COMPOSE up -d
  echo "→ Attente de la santé des services (30s max)..."
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

# Load .env if present
[ -f .env ] && export $(grep -v '^#' .env | xargs)

case "${1:-}" in
  build)   build   ;;
  start)   start   ;;
  stop)    stop    ;;
  restart) restart ;;
  clean)   clean   ;;
  logs)    logs "$@" ;;
  status)  status  ;;
  *)       usage   ;;
esac
