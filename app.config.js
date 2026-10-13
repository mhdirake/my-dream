const MAX_ANDROID_VERSION_CODE = 2_100_000_000;

module.exports = ({ config }) => {
  const configuredVersionCode = config.android?.versionCode ?? 1;
  const rawVersionCode = process.env.ANDROID_VERSION_CODE;
  const buildGitSha = process.env.EXPO_PUBLIC_BUILD_SHA?.trim() || 'development';
  const versionCode = rawVersionCode?.trim()
    ? Number(rawVersionCode)
    : configuredVersionCode;

  if (
    !Number.isInteger(versionCode)
    || versionCode < 1
    || versionCode > MAX_ANDROID_VERSION_CODE
  ) {
    throw new Error(
      `ANDROID_VERSION_CODE must be an integer between 1 and ${MAX_ANDROID_VERSION_CODE}.`,
    );
  }

  return {
    ...config,
    extra: {
      ...config.extra,
      buildGitSha,
    },
    android: {
      ...config.android,
      versionCode,
    },
  };
};
