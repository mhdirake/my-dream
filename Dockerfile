FROM docker.iranserver.com/node:22.13.1-bookworm-slim AS deps
WORKDIR /app

ENV CI=1 \
  EXPO_NO_TELEMETRY=1

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  set -eu; \
  for attempt in 1 2 3; do \
    if npm ci \
      --fetch-retries=5 \
      --fetch-retry-mintimeout=10000 \
      --fetch-retry-maxtimeout=120000 \
      --fetch-timeout=600000; then \
      exit 0; \
    fi; \
    echo "npm ci attempt ${attempt} failed; retrying"; \
    sleep $((attempt * 10)); \
  done; \
  exit 1

FROM deps AS test
COPY . .
RUN node --check server.js
RUN npm run test:unit
RUN npx tsc --noEmit
RUN npx eslint \
  src/lib/api/auth.ts \
  src/lib/api/client.ts \
  src/lib/api/client.test.ts \
  src/lib/api/media.ts \
  src/lib/api/media.test.ts \
  src/lib/auth/AuthContext.tsx \
  src/lib/auth/storage.ts \
  src/lib/auth/storage.test.ts \
  src/lib/auth/sessionController.ts \
  src/lib/auth/sessionController.test.ts \
  src/lib/passwordResetStore.ts \
  src/lib/passwordResetStore.test.ts \
  src/lib/api/chat.ts \
  src/lib/chat/CentrifugoContext.tsx \
  src/lib/chat/heartbeatGate.ts \
  src/lib/chat/heartbeatGate.test.ts \
  src/lib/chat/useChatMessages.ts \
  src/lib/chat/useConversations.ts \
  src/lib/chat/chatRepository.ts \
  src/lib/chat/chatRepository.native.ts \
  src/lib/chat/chatRepository.web.ts \
  src/lib/chat/chatRepository.types.ts \
  src/lib/chat/timeline.ts \
  src/lib/chat/timeline.test.ts \
  src/app/chat/\[id\].tsx \
  src/app/\(tabs\)/chat.tsx \
  src/lib/notifications/push.ts \
  src/app/notifications.tsx \
  src/app/onboarding/forgot-password.tsx \
  src/app/onboarding/forgot-password-otp.tsx \
  src/app/onboarding/reset-password.tsx \
  src/app/onboarding/login.tsx \
  src/app/onboarding/welcome.tsx
RUN ! grep -R -E "EXPO_PUBLIC_KC_SECRET|process\.env\.KC_SECRET|grant_type.*password" src eas.json app.json

FROM deps AS web-build
WORKDIR /app

ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

COPY . .

RUN --mount=type=cache,target=/root/.expo \
  npx expo export --platform web \
  && npm prune --omit=dev

FROM docker.iranserver.com/node:22.13.1-bookworm-slim AS web-runtime
WORKDIR /app

ENV NODE_ENV=production \
  PORT=3000

COPY --from=web-build --chown=node:node /app/node_modules ./node_modules
COPY --from=web-build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json server.js ./
USER node

EXPOSE 3000

CMD ["node", "server.js"]
