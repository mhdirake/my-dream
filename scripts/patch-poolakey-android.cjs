/* global require */
// Poolakey 3.1.2 assumes a Java synthetic property on its module base class.
// React Native 0.85 implements that base class in Kotlin; use ReactContext's
// currentActivity instead. Apply before native compilation, not in generated
// android/ files, so clean prebuilds and fresh CI installs retain the fix.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageRoot = path.join(root, 'node_modules/@cafebazaar/react-native-poolakey');
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
if (manifest.version !== '3.1.2') {
  throw new Error('Review the Poolakey Android compatibility patch before changing its version.');
}

const moduleFile = path.join(
  packageRoot,
  'android/src/main/java/com/cafebazaar/reactnativepoolakey/ReactNativePoolakeyModule.kt',
);
const source = fs.readFileSync(moduleFile, 'utf8');
const oldGuard = /check\(currentActivity != null\)/g;
const oldGetter = /\bgetCurrentActivity\(\)/g;
const guards = [...source.matchAll(oldGuard)].length;
const getters = [...source.matchAll(oldGetter)].length;

if (guards === 0 && getters === 0) {
  if ((source.match(/reactApplicationContext\.currentActivity/g) || []).length !== 3) {
    throw new Error('Unexpected Poolakey source: refusing an unreviewed compatibility patch.');
  }
  console.log('Poolakey React Native activity compatibility patch already applied.');
} else {
  if (guards !== 2 || getters !== 1) {
    throw new Error('Unexpected Poolakey source: expected two activity guards and one getter.');
  }
  const patched = source
    .replace(oldGuard, 'check(reactApplicationContext.currentActivity != null)')
    .replace(oldGetter, 'reactApplicationContext.currentActivity');
  fs.writeFileSync(moduleFile, patched, 'utf8');
  console.log('Applied Poolakey 3.1.2 activity compatibility patch for React Native 0.85.');
}
