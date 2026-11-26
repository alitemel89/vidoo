FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
RUN apt-get update \
    && apt-get install --no-install-recommends -y ffmpeg fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/dist/browser ./dist/browser
COPY server.mjs render.mjs ./
ENV NODE_ENV=production VIDOO_DATA_DIR=/tmp/vidoo-data
USER node
CMD ["node", "server.mjs"]
