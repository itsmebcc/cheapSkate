FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy server code
COPY server/ ./
COPY shared/ ./shared/

# Seed the database on first start
RUN node seed.js

EXPOSE 3001

ENV PORT=3001
ENV ADMIN_TOKEN=admin

CMD ["node", "server.js"]
