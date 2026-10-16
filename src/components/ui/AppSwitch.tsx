import { Colors } from '@/constants/colors';
import { Platform, Pressable, StyleSheet, Switch as NativeSwitch, View, type SwitchProps } from 'react-native';

// RN Web mixes logical insetInlineStart and physical negative margins for its
// active thumb. A fixed track with physical offsets avoids RTL thumb drift.
// Native platforms retain their system control and accessibility behaviour.
export function AppSwitch(props: SwitchProps) {
  if (Platform.OS !== 'web') return <NativeSwitch {...props} />;
  const { value = false, disabled, onValueChange, trackColor, thumbColor, accessibilityLabel, testID, style } = props;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onValueChange?.(!value)}
      testID={testID}
      style={[styles.target, style, disabled && styles.disabled]}
    >
      <View pointerEvents="none" style={[styles.track, { backgroundColor: (value ? trackColor?.true : trackColor?.false) ?? (value ? Colors.accentSoft : Colors.hair) }]}>
        <View style={[styles.thumb, { left: value ? 23 : 3, backgroundColor: thumbColor ?? (value ? Colors.accent : Colors.muted) }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: 44, minWidth: 48, alignItems: 'center', justifyContent: 'center', flexShrink: 0, direction: 'ltr' },
  track: { width: 48, height: 28, borderRadius: 14, position: 'relative', direction: 'ltr' },
  thumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, top: 3 },
  disabled: { opacity: 0.5 },
});
