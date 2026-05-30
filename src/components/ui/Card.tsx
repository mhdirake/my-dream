import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

type CardTint = 'rose' | 'purple' | 'trust' | 'ok' | 'gold';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  soft?: boolean;
  dashed?: boolean;
  tint?: CardTint;
  dark?: boolean;
}

const tintStyles: Record<CardTint, ViewStyle> = {
  rose:   { backgroundColor: '#FCE8ED', borderColor: Colors.accent + '22' },
  purple: { backgroundColor: '#EDE7F8', borderColor: Colors.purple + '22' },
  trust:  { backgroundColor: '#E6F0FD', borderColor: Colors.trust + '22'  },
  ok:     { backgroundColor: '#E2F7F1', borderColor: Colors.ok + '22'     },
  gold:   { backgroundColor: '#FEF3DD', borderColor: Colors.gold + '33'   },
};

export function Card({ children, style, soft, dashed, tint, dark }: CardProps) {
  return (
    <View style={[
      styles.base,
      soft  && styles.soft,
      dashed && styles.dashed,
      dark  && styles.dark,
      tint  && tintStyles[tint],
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hair,
  },
  soft: {
    backgroundColor: Colors.ph2,
    borderWidth: 0,
  },
  dashed: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    borderStyle: 'dashed',
  },
  dark: {
    backgroundColor: Colors.darkCard,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
