import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
const sha = 'a'.repeat(40);
const image = `md-native-app:${sha}-42`;
const imageId = `sha256:${'b'.repeat(64)}`;
const posix = value => process.platform === 'win32'
  ? value.replaceAll('\\', '/').replace(/^([A-Z]):/i, (_, drive) => `/${drive.toLowerCase()}`) : value;
const quote = value => `'${value.replaceAll("'", "'\"'\"'")}'`;

const fakeDocker = `#!/bin/bash
set -eu
printf 'docker %s | image=%s\\n' "$*" "\${MD_APP_IMAGE:-}" >> "$MOCK_LOG"
case "$1" in
  build) test "\${FAIL_BUILD:-0}" != 1 ;;
  image)
    test "\${FAIL_IMAGE:-0}" != 1
    if [[ "$*" == *'{{.Id}}'* ]]; then printf '%s\\n' "$MOCK_IMAGE_ID"
    else printf '%s\\n' "\${MOCK_REVISION:-$CI_COMMIT_SHA}"; fi ;;
  compose)
    if [[ "$*" == *'up -d'* && "\${FAIL_UP:-0}" = 1 && "\${MD_APP_IMAGE:-}" = "$MOCK_IMAGE" ]]; then exit 1; fi ;;
  *) exit 91 ;;
esac
`;

function fixture(t, overrides = {}) {
  const temporaryRoot = realpathSync(tmpdir());
  const dir = mkdtempSync(path.join(temporaryRoot, 'md-pwa-ci-test-'));
  t.after(() => {
    assert.equal(path.dirname(dir), temporaryRoot);
    assert.ok(path.basename(dir).startsWith('md-pwa-ci-test-'));
    assert.equal(realpathSync(dir), dir);
    rmSync(dir, { recursive: true });
  });
  const bin = path.join(dir, 'bin');
  const scripts = path.join(dir, 'scripts');
  const target = path.join(dir, 'deployment');
  for (const folder of [bin, scripts, target]) mkdirSync(folder);
  for (const name of ['build-pwa.sh', 'deploy-pwa.sh']) {
    let source = readFileSync(path.join(root, 'scripts/ci', name), 'utf8');
    if (name === 'deploy-pwa.sh') {
      assert.ok(source.includes('target=/srv/mydream/apps/native-app'));
      source = source.replace('target=/srv/mydream/apps/native-app', `target=${quote(posix(target))}`);
    }
    writeFileSync(path.join(scripts, name), source);
  }
  writeFileSync(path.join(bin, 'docker'), fakeDocker);
  writeFileSync(path.join(bin, 'curl'), '#!/bin/bash\nexit "${FAIL_HEALTH:-0}"\n');
  chmodSync(path.join(bin, 'docker'), 0o755);
  chmodSync(path.join(bin, 'curl'), 0o755);
  writeFileSync(path.join(dir, 'compose.production.yml'), 'new-compose\n');
  writeFileSync(path.join(dir, 'ci-env'), 'new-secret\n');
  writeFileSync(path.join(target, 'compose.production.yml'), 'old-compose\n');
  writeFileSync(path.join(target, '.env'), 'old-secret\n');
  writeFileSync(path.join(target, '.image.env'), 'MD_APP_IMAGE=old-image:previous\n');
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    CI_PROJECT_NAME: 'native-app', CI_COMMIT_SHA: sha, CI_PIPELINE_ID: '42', MD_PWA_IMAGE: image, MD_PWA_IMAGE_ID: imageId,
    MD_ENV_FILE: posix(path.join(dir, 'ci-env')), MOCK_IMAGE: image, MOCK_IMAGE_ID: imageId, MOCK_LOG: posix(path.join(dir, 'commands.log')), MOCK_BIN: posix(bin),
    ...overrides };
  // Exported functions also override Windows curl.exe: tests must never use the network or real Docker.
  const run = name => spawnSync(bash, ['-c',
    'docker() { bash "$MOCK_BIN/docker" "$@"; }; curl() { bash "$MOCK_BIN/curl" "$@"; }; export -f docker curl; bash "$1"',
    'fixture', posix(path.join(scripts, name))], { cwd: dir, env, encoding: 'utf8' });
  const log = () => readFileSync(path.join(dir, 'commands.log'), 'utf8');
  return { dir, target, run, log };
}

test('all PWA shell scripts have valid Bash syntax', () => {
  for (const name of ['build-pwa.sh', 'deploy-pwa.sh']) {
    execFileSync(bash, ['-n', posix(path.join(root, 'scripts/ci', name))]);
  }
});

test('build compiles once and exports the exact local image content ID', t => {
  const f = fixture(t);
  const result = f.run('build-pwa.sh');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(path.join(f.dir, '.pwa-build.env'), 'utf8'), `MD_PWA_IMAGE=${image}\nMD_PWA_IMAGE_ID=${imageId}\n`);
  assert.match(f.log(), /docker build /);
  assert.doesNotMatch(f.log(), /compose| push /);
});

test('a failed build cannot publish a deployment artifact', t => {
  const f = fixture(t, { FAIL_BUILD: '1' });
  assert.notEqual(f.run('build-pwa.sh').status, 0);
  assert.throws(() => readFileSync(path.join(f.dir, '.pwa-build.env')));
  assert.doesNotMatch(f.log(), / push /);
});

test('deploy reuses the exact built image and never builds or pulls', t => {
  const f = fixture(t);
  const result = f.run('deploy-pwa.sh');
  assert.equal(result.status, 0, result.stderr);
  assert.match(f.log(), /up -d --no-build --pull never --wait/);
  assert.doesNotMatch(f.log(), /docker build | pull | push /);
  assert.equal(readFileSync(path.join(f.target, '.image.env'), 'utf8'), `MD_APP_IMAGE=${image}\n`);
});

for (const failure of ['FAIL_UP', 'FAIL_HEALTH']) {
  test(`${failure}: failed rollout restores image, environment and compose file`, t => {
    const f = fixture(t, { [failure]: '1' });
    assert.notEqual(f.run('deploy-pwa.sh').status, 0);
    assert.equal(readFileSync(path.join(f.target, '.image.env'), 'utf8'), 'MD_APP_IMAGE=old-image:previous\n');
    assert.equal(readFileSync(path.join(f.target, '.env'), 'utf8'), 'old-secret\n');
    assert.equal(readFileSync(path.join(f.target, 'compose.production.yml'), 'utf8'), 'old-compose\n');
    assert.match(f.log(), /image=old-image:previous/);
    assert.doesNotMatch(f.log(), / build /);
  });
}

test('foreign image is rejected before any deployment operation', t => {
  const f = fixture(t, { MD_PWA_IMAGE: 'other-image:tag' });
  assert.notEqual(f.run('deploy-pwa.sh').status, 0);
  assert.throws(() => f.log());
  assert.equal(readFileSync(path.join(f.target, '.env'), 'utf8'), 'old-secret\n');
});

test('a missing built image fails safely without compiling or changing production', t => {
  const f = fixture(t, { FAIL_IMAGE: '1' });
  assert.notEqual(f.run('deploy-pwa.sh').status, 0);
  assert.doesNotMatch(f.log(), /compose|docker build /);
  assert.equal(readFileSync(path.join(f.target, '.env'), 'utf8'), 'old-secret\n');
});

test('overwritten image tags cannot deploy a different content ID', t => {
  const f = fixture(t, { MOCK_IMAGE_ID: `sha256:${'c'.repeat(64)}` });
  assert.notEqual(f.run('deploy-pwa.sh').status, 0);
  assert.doesNotMatch(f.log(), /compose/);
  assert.equal(readFileSync(path.join(f.target, '.env'), 'utf8'), 'old-secret\n');
});

test('revision mismatch is rejected without changing the running deployment', t => {
  const f = fixture(t, { MOCK_REVISION: 'c'.repeat(40) });
  assert.notEqual(f.run('deploy-pwa.sh').status, 0);
  assert.doesNotMatch(f.log(), /compose/);
  assert.equal(readFileSync(path.join(f.target, '.env'), 'utf8'), 'old-secret\n');
});

test('web deploy is automatic; redeploy and Android remain optional', () => {
  const ci = readFileSync(path.join(root, 'ci/pwa.yml'), 'utf8');
  const app = readFileSync(path.join(root, '.gitlab-ci.yml'), 'utf8');
  assert.match(ci, /stages: \[test, build, deploy\]/);
  assert.match(ci, /deploy-production:[\s\S]*?when: on_success/);
  assert.match(ci, /redeploy-production:[\s\S]*?when: manual\s+allow_failure: true/);
  assert.match(ci, /job: build-production\s+artifacts: true/);
  assert.match(ci, /GIT_STRATEGY: empty/);
  assert.match(ci, /paths:\s+- compose.production.yml\s+- scripts\/ci\/deploy-pwa.sh/);
  assert.match(app, /build-android:[\s\S]*?tags: \[germany\]/);
  assert.match(app, /build-android:[\s\S]*?when: manual\s+allow_failure: true/);
});
