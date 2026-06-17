# Build stage
FROM docker.iranserver.com/node:26.1.0 AS builder

WORKDIR /app

COPY package*.json ./

ARG NPM_USER
ARG NPM_PASS

RUN printf "registry=https://nexus.gosafir.com/repository/npm-group/\n//nexus.gosafir.com/repository/npm-group/:username=%s\n//nexus.gosafir.com/repository/npm-group/:_password=%s\n//nexus.gosafir.com/repository/npm-group/:email=ci@example.com\n" \
  "$NPM_USER" \
  "$(printf '%s' "$NPM_PASS" | base64 | tr -d '\n')" > /root/.npmrc


RUN npm ci

COPY . .

# Build-time environment variables
ARG KC_URL
ARG KC_SECRET
ARG EXPO_PUBLIC_KC_SECRET
ARG EXPO_PUBLIC_KC_URL
ARG EXPO_PUBLIC_API_URL

ENV KC_URL=${KC_URL}
ENV KC_SECRET=${KC_SECRET}
ENV EXPO_PUBLIC_KC_SECRET=${EXPO_PUBLIC_KC_SECRET}
ENV EXPO_PUBLIC_KC_URL=${EXPO_PUBLIC_KC_URL}
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

# Generate web build
RUN npx expo export --platform web

# Runtime stage
FROM docker.iranserver.com/nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing support
RUN printf '%s\n' \
'server {' \
'    listen 80;' \
'    server_name _;' \
'    root /usr/share/nginx/html;' \
'    index index.html;' \
'' \
'    location / {' \
'        try_files $uri $uri/ /index.html;' \
'    }' \
'}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]