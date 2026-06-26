ARG UBUNTU_IMAGE=docker.iranserver.com/ubuntu:24.04
ARG NODE_VERSION=22.13.1
ARG NODE_DOWNLOAD_BASE=https://nodejs.org/dist

FROM ${UBUNTU_IMAGE} AS node-base

ARG NODE_VERSION
ARG NODE_DOWNLOAD_BASE

ENV NODE_HOME=/opt/node \
  DEBIAN_FRONTEND=noninteractive \
  PATH=/opt/node/bin:$PATH \
  CI=1 \
  EXPO_NO_TELEMETRY=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    xz-utils \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fL --retry 5 --retry-all-errors --retry-delay 5 --connect-timeout 20 --max-time 600 \
    "${NODE_DOWNLOAD_BASE}/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz \
  && mkdir -p "$NODE_HOME" \
  && tar -xJf /tmp/node.tar.xz -C "$NODE_HOME" --strip-components=1 \
  && rm /tmp/node.tar.xz \
  && node --version \
  && npm --version

FROM node-base AS deps
WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  --mount=type=secret,id=npm_user,required=false \
  --mount=type=secret,id=npm_pass,required=false \
  set -eu; \
  if [ -s /run/secrets/npm_user ] && [ -s /run/secrets/npm_pass ]; then \
    npm_user="$(cat /run/secrets/npm_user)"; \
    npm_pass="$(cat /run/secrets/npm_pass)"; \
    pass64="$(printf '%s' "$npm_pass" | base64 | tr -d '\n')"; \
    printf "registry=https://nexus.gosafir.com/repository/npm-group/\n//nexus.gosafir.com/repository/npm-group/:username=%s\n//nexus.gosafir.com/repository/npm-group/:_password=%s\n//nexus.gosafir.com/repository/npm-group/:email=ci@example.com\n" "$npm_user" "$pass64" > /tmp/npmrc; \
    NPM_CONFIG_USERCONFIG=/tmp/npmrc npm ci; \
    rm -f /tmp/npmrc; \
  else \
    npm ci; \
  fi

FROM deps AS web-build
WORKDIR /app

COPY . .

ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

RUN --mount=type=cache,target=/root/.expo \
  npx expo export --platform web

FROM node-base AS web-runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=web-build /app/dist ./dist
COPY package.json server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
