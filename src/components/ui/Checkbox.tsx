import { Colors } from '@/constants/colors';
import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

type Props = {
  checked: boolean;
  /** Fill/accent color when checked. Defaults to the brand accent. */
  color?: string;
  size?: number;
};

/** The one checkbox used across the app: rounded square, filled + white tick when checked. */
export function Checkbox({ checked, color = Colors.accent, size = 20 }: Props) {
  const radius = Math.round(size * 0.3);
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: radius },
        checked
          ? { backgroundColor: color, borderColor: color }
          : { borderColor: Colors.lineSoft },
      ]}
    >
      {checked ? <Check size={Math.round(size * 0.62)} color="#fff" strokeWidth={3} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
