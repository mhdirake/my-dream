import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '@/constants/colors';

interface AvatarProps {
  size?: number;
  name?: string;
  online?: boolean;
  ring?: boolean;
  uri?: string;
}

export function Avatar({ size = 44, name, online, ring }: AvatarProps) {
  const initials = name ? name.charAt(0).toUpperCase() : '';
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        ring && { borderColor: Colors.accent, borderWidth: 2 },
        !ring && { borderColor: Colors.hair, borderWidth: 1 },
      ]}>
        <Text style={[styles.initial, { fontSize: size * 0.36, fontFamily: Fonts.bold, color: Colors.purple }]}>
          {initials}
        </Text>
      </View>
      {online && (
        <View style={[
          styles.dot,
          { width: size * 0.26, height: size * 0.26, borderRadius: size * 0.13 },
        ]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { lineHeight: undefined },
  dot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: Colors.ok,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
