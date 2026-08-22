// Minimal stand-in for `react-native` in unit tests (vitest runs in Node, not
// the RN runtime, and the real package's Flow syntax can't be parsed by
// vite/rollup). Extend as more named exports are needed by tested modules.
export const Platform = {
  OS: 'ios' as const,
  select: <T extends Record<string, unknown>>(spec: T) => spec.ios ?? spec.default,
};
