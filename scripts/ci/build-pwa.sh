#!/bin/bash
set -euo pipefail
: "${CI_PROJECT_NAME:?required}" "${CI_COMMIT_SHA:?required}" "${CI_PIPELINE_ID:?required}"
case "$CI_PROJECT_NAME" in native-app|my-dream-app) ;; *) exit 1 ;; esac
[[ "$CI_COMMIT_SHA" =~ ^[a-f0-9]{40}$ ]] && [[ "$CI_PIPELINE_ID" =~ ^[0-9]+$ ]]
image="md-$CI_PROJECT_NAME:$CI_COMMIT_SHA-$CI_PIPELINE_ID"
docker build \
    -f "${MD_DOCKERFILE:-Dockerfile}" --target "${MD_BUILD_TARGET:-web-runtime}" \
    --build-arg EXPO_PUBLIC_API_URL=https://api.mydreamapp.ir \
    --label "org.opencontainers.image.revision=$CI_COMMIT_SHA" \
    -t "$image" .
# md jobs run on the production host. Retain the tagged image there and pass its
# content ID, not a mutable "latest" tag, to deploy/redeploy through the artifact.
image_id=$(docker image inspect --format '{{.Id}}' "$image")
[[ "$image_id" =~ ^sha256:[a-f0-9]{64}$ ]]
printf 'MD_PWA_IMAGE=%s\nMD_PWA_IMAGE_ID=%s\n' "$image" "$image_id" > .pwa-build.env
echo 'PWA image built on md; deployment will reuse its verified content ID.'
