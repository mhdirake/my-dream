#!/bin/bash
set -Eeuo pipefail
umask 077
case "${CI_PROJECT_NAME:?required}" in native-app|my-dream-app) ;; *) echo 'Not a PWA project'; exit 1 ;; esac
: "${MD_PWA_IMAGE:?build artifact required}" "${MD_PWA_IMAGE_ID:?build artifact required}" "${MD_ENV_FILE:?required}"
[[ "${CI_COMMIT_SHA:?required}" =~ ^[a-f0-9]{40}$ ]] && [[ "${CI_PIPELINE_ID:?required}" =~ ^[0-9]+$ ]]
test "$MD_PWA_IMAGE" = "md-$CI_PROJECT_NAME:$CI_COMMIT_SHA-$CI_PIPELINE_ID"
[[ "$MD_PWA_IMAGE_ID" =~ ^sha256:[a-f0-9]{64}$ ]]
test -f "$MD_ENV_FILE" && test -s "$MD_ENV_FILE" && test ! -L "$MD_ENV_FILE"
test -f compose.production.yml && test ! -L compose.production.yml
actual_id=$(docker image inspect --format '{{.Id}}' "$MD_PWA_IMAGE") || {
    echo 'The built image is missing on md. Restore it or rerun build-production; deploy will not build.'
    exit 1
}
test "$actual_id" = "$MD_PWA_IMAGE_ID"
revision=$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$MD_PWA_IMAGE")
test "$revision" = "${CI_COMMIT_SHA:?required}"

# Keep the existing md-app Compose project and edge alias; no other service is touched.
target=/srv/mydream/apps/native-app
mkdir -p "$target"
test ! -L "$target" && test "$(readlink -f "$target")" = "$target"
test -w "$target" && test -x "$target" || { echo 'PWA directory must be owned by gitlab-runner'; exit 1; }
backup=$(mktemp -d /tmp/md-pwa-deploy.XXXXXX)
case "$backup" in /tmp/md-pwa-deploy.*) ;; *) exit 1 ;; esac
test -d "$backup" && test ! -L "$backup"
for file in compose.production.yml .env .image.env; do
    if [ -e "$target/$file" ]; then
        test -f "$target/$file" && test ! -L "$target/$file"
        cp -p -- "$target/$file" "$backup/$file"
    fi
done
previous=$(sed -n 's/^MD_APP_IMAGE=//p' "$backup/.image.env" 2>/dev/null || true)
cleanup() {
    for file in compose.production.yml .env .image.env; do
        if [ -e "$backup/$file" ]; then
            test -f "$backup/$file" && test ! -L "$backup/$file"
            rm -- "$backup/$file"
        fi
    done
    rmdir -- "$backup"
}
trap cleanup EXIT
rollback() {
    local code=$?
    trap - ERR
    echo 'PWA deployment failed; restoring previous configuration and image.'
    for file in compose.production.yml .env .image.env; do
        if [ -f "$backup/$file" ]; then
            install -m 600 "$backup/$file" "$target/$file"
        else
            if [ -e "$target/$file" ]; then
                test -f "$target/$file" && test ! -L "$target/$file"
                rm -- "$target/$file"
            fi
        fi
    done
    if [ -n "$previous" ]; then
        MD_APP_IMAGE="$previous" docker compose -f "$target/compose.production.yml" \
            up -d --no-build --pull never --wait --wait-timeout 180 || echo 'Rollback needs operator attention.'
    fi
    exit "$code"
}
trap rollback ERR
install -m 600 compose.production.yml "$target/compose.production.yml"
install -m 600 "$MD_ENV_FILE" "$target/.env"
export MD_APP_IMAGE="$MD_PWA_IMAGE"
cd "$target"
docker compose -f compose.production.yml config --quiet
docker compose -f compose.production.yml up -d --no-build --pull never --wait --wait-timeout 180
curl --fail --silent --show-error --retry 5 --retry-connrefused --retry-delay 2 \
    --connect-timeout 5 --max-time 20 "${MD_PUBLIC_URL:-https://app.mydreamapp.ir}/health" >/dev/null
printf 'MD_APP_IMAGE=%s\n' "$MD_APP_IMAGE" > .image.env
trap - ERR
echo 'PWA deployment and public health check succeeded (no build performed).'
