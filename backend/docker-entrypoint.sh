#!/bin/sh
set -e

echo "[exam-backend] running prisma generate"
npx prisma generate

echo "[exam-backend] applying schema changes"
if npx prisma migrate deploy; then
  echo "[exam-backend] migrate deploy succeeded"
else
  echo "[exam-backend] migrate deploy failed, falling back to prisma db push"
  npx prisma db push --accept-data-loss
fi

echo "[exam-backend] seeding data"
node dist/prisma/seed.js

echo "[exam-backend] starting nest app"
node dist/src/main.js
