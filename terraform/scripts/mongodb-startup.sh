#!/bin/bash
set -e
exec > /var/log/startup-script.log 2>&1

# Formater et monter le disque de données si pas encore fait
if ! blkid /dev/disk/by-id/google-mongodb-data; then
  mkfs.ext4 -F /dev/disk/by-id/google-mongodb-data
fi

mkdir -p /data/mongodb
mount /dev/disk/by-id/google-mongodb-data /data/mongodb || true

# Montage persistant
grep -q mongodb-data /etc/fstab || \
  echo '/dev/disk/by-id/google-mongodb-data /data/mongodb ext4 defaults,nofail 0 2' >> /etc/fstab

# Installer MongoDB 7
if ! command -v mongod &>/dev/null; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
    | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
    https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
    | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

  apt-get update -y
  apt-get install -y mongodb-org
fi

# Configurer le répertoire de données et l'écoute réseau
chown -R mongodb:mongodb /data/mongodb
cat > /etc/mongod.conf <<EOF
storage:
  dbPath: /data/mongodb
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
net:
  port: 27017
  bindIp: 0.0.0.0
processManagement:
  timeZoneInfo: /usr/share/zoneinfo
EOF

systemctl enable mongod
systemctl restart mongod
sleep 15

# Créer l'utilisateur admin si il n'existe pas encore
mongosh --quiet --eval "
  if (db.getSiblingDB('admin').getUser('rdvadmin') === null) {
    db.getSiblingDB('admin').createUser({
      user: 'rdvadmin',
      pwd: '${mongo_password}',
      roles: ['userAdminAnyDatabase', 'dbAdminAnyDatabase', 'readWriteAnyDatabase']
    });
    print('Utilisateur créé');
  } else {
    print('Utilisateur déjà existant');
  }
"

# Activer l'authentification
cat > /etc/mongod.conf <<EOF
storage:
  dbPath: /data/mongodb
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
net:
  port: 27017
  bindIp: 0.0.0.0
security:
  authorization: enabled
processManagement:
  timeZoneInfo: /usr/share/zoneinfo
EOF

systemctl restart mongod
echo "MongoDB prêt."
