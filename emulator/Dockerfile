FROM node:20-alpine

# Java est requis par l'émulateur Firestore (jar téléchargé par firebase-tools)
RUN apk add --no-cache openjdk21-jre-headless

# Installer firebase-tools
RUN npm install -g firebase-tools

# Pré-télécharger les jars et l'UI au moment du build
# (évite les téléchargements réseau au démarrage du conteneur)
RUN firebase setup:emulators:firestore && firebase setup:emulators:ui

WORKDIR /app

EXPOSE 8080 4000

COPY emulator/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
