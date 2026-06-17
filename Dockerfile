ARG NODE_IMAGE=docker.iranserver.com/node:22.13.1-bookworm

FROM ${NODE_IMAGE} AS deps
WORKDIR /app

COPY package*.json ./

ARG NPM_USER
ARG NPM_PASS
RUN --mount=type=cache,target=/root/.npm \
  set -eu; \
  if [ -n "${NPM_USER:-}" ] && [ -n "${NPM_PASS:-}" ]; then \
    pass64="$(printf '%s' "$NPM_PASS" | base64 | tr -d '\n')"; \
    printf "registry=https://nexus.gosafir.com/repository/npm-group/\n//nexus.gosafir.com/repository/npm-group/:username=%s\n//nexus.gosafir.com/repository/npm-group/:_password=%s\n//nexus.gosafir.com/repository/npm-group/:email=ci@example.com\n" "$NPM_USER" "$pass64" > /tmp/npmrc; \
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

FROM ${NODE_IMAGE} AS web-runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=web-build /app/dist ./dist
COPY package.json server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
