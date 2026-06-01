import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Compass, Heart, MessageCircle, Gift, User, type LucideIcon } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/colors';

type Tab = 'discover' | 'likes' | 'chat' | 'gifts' | 'me';

interface TabBarProps {
  active: Tab;
  onPress: (tab: Tab) => void;
}

const TABS: { id: Tab; icon: LucideIcon; label: string }[] = [
  { id: 'discover', icon: Compass,       label: 'کشف'  },
  { id: 'likes',    icon: Heart,         label: 'مَچ'  },
  { id: 'chat',     icon: MessageCircle, label: 'پیام' },
  { id: 'gifts',    icon: Gift,          label: 'هدیه' },
  { id: 'me',       icon: User,          label: 'من'   },
];

export function TabBar({ active, onPress }: TabBarProps) {
  return (
    <View style={styles.bar}>
      {TABS.map(t => {
        const on = t.id === active;
        return (
          <Pressable key={t.id} onPress={() => onPress(t.id)} style={styles.item}>
            <View style={[styles.pill, on && styles.pillActive]}>
              <t.icon
                size={19}
                color={on ? '#fff' : Colors.muted}
                strokeWidth={on ? 2.2 : 1.7}
                fill={on && t.id === 'likes' ? '#fff' : 'none'}
              />
            </View>
            <Text style={[styles.label, on && styles.labelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    height: 64,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    zIndex: 20,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 12,
  },
  item: { alignItems: 'center', gap: 4, flex: 1 },
  pill: {
    width: 44,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    fontSize: 9.5,
    fontFamily: Fonts.semiBold,
    color: Colors.muted,
  },
  labelActive: { fontFamily: Fonts.extraBold, color: Colors.accent },
});
