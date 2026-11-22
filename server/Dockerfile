FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip \
 && pip3 install --no-cache-dir --break-system-packages ruff \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund
COPY . .

ENV NODE_ENV=production
CMD ["node", "server.js"]