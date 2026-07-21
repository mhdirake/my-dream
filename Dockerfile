FROM docker.iranserver.com/node:22.13.1-bookworm-slim AS deps
WORKDIR /app

ENV CI=1 \
  EXPO_NO_TELEMETRY=1

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  npm ci

FROM deps AS test
COPY . .
RUN npm run test:unit
RUN npx tsc --noEmit
RUN npx eslint \
  src/lib/api/auth.ts \
  src/lib/api/client.ts \
  src/lib/api/chat.ts \
  src/lib/chat/CentrifugoContext.tsx \
  src/lib/chat/useChatMessages.ts \
  src/lib/chat/chatRepository.ts \
  src/lib/chat/chatRepository.native.ts \
  src/lib/chat/chatRepository.types.ts \
  src/lib/chat/timeline.ts \
  src/lib/chat/timeline.test.ts \
  src/app/chat/\[id\].tsx \
  src/lib/notifications/push.ts \
  src/app/notifications.tsx
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

COPY --from=web-build /app/node_modules ./node_modules
COPY --from=web-build /app/dist ./dist
COPY package.json server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
