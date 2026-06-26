# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=docker.iranserver.com/node:22.13.1-bookworm

FROM ${NODE_IMAGE} AS deps
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

FROM ${NODE_IMAGE} AS web-runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=web-build /app/dist ./dist
COPY package.json server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
