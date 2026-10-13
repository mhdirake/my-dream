#!/bin/sh
# Dex merging shares the Gradle JVM with Kotlin; the app exceeds the former
# 1 GiB heap. Bound concurrency, give that JVM sufficient heap, and retain
# actionable diagnostics if a JVM/container is killed rather than retry blindly.
set -eu
heap=${ANDROID_GRADLE_HEAP_MB:-3072}
variant=${ANDROID_GRADLE_VARIANT:-Release}
architectures=${ANDROID_ARCHITECTURES:-arm64-v8a}
case "$heap" in ''|*[!0-9]*) echo 'Invalid Android heap size' >&2; exit 1 ;; esac
test "$heap" -ge 1024 && test "$heap" -le 8192
test "$variant" = Release

print_memory() {
  awk '/MemTotal|MemAvailable|SwapTotal/ {print}' /proc/meminfo
  for file in /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.current \
    /sys/fs/cgroup/memory.events /sys/fs/cgroup/memory/memory.limit_in_bytes \
    /sys/fs/cgroup/memory/memory.failcnt; do
    if [ -r "$file" ]; then printf '%s: ' "$file"; cat "$file"; fi
  done
}
print_memory
printf 'Gradle heap: %s MiB; workers: 1; native compile/link pools: 1\n' "$heap"
if NODE_ENV=production NODE_OPTIONS=--max-old-space-size=768 ./gradlew \
  clean "assemble$variant" "bundle$variant" \
  -Dorg.gradle.jvmargs="-Xmx${heap}m -XX:MaxMetaspaceSize=768m -XX:ActiveProcessorCount=2 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -XX:ErrorFile=/tmp/md-gradle-hs_err_pid%p.log" \
  -Dorg.gradle.parallel=false \
  --init-script /app/scripts/android-build-limits.gradle \
  -Pkotlin.compiler.execution.strategy=in-process \
  -PreactNativeArchitectures="$architectures" \
  --no-build-cache --max-workers=1 --no-daemon --stacktrace; then
  exit 0
else
  result=$?
  echo 'Android compilation failed; memory/JVM diagnostics follow' >&2
  print_memory
  for log in /tmp/md-gradle-hs_err_pid*.log; do
    if [ -f "$log" ]; then head -100 "$log"; fi
  done
  exit "$result"
fi
