import { Colors, Fonts, Radius } from '@/constants/colors';
import { CheckCircle, Info, XCircle } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { BaseToast, type BaseToastProps } from 'react-native-toast-message';

type ToastVariant = 'success' | 'error' | 'info';

const VARIANT = {
  success: { icon: CheckCircle, color: Colors.ok,     bg: Colors.okSoft },
  error:   { icon: XCircle,     color: Colors.danger,  bg: Colors.dangerSoft },
  info:    { icon: Info,        color: Colors.trust,   bg: Colors.trustSoft },
} as const;

function AppToast({ type, text1, text2 }: BaseToastProps & { type: ToastVariant }) {
  const v = VARIANT[type];
  const Icon = v.icon;
  return (
    <View style={[styles.wrap, { borderLeftColor: v.color, backgroundColor: v.bg }]}>
      <Icon size={20} color={v.color} strokeWidth={2} />
      <View style={styles.texts}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.sub}>{text2}</Text> : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => <AppToast {...props} type="success" />,
  error:   (props: BaseToastProps) => <AppToast {...props} type="error" />,
  info:    (props: BaseToastProps) => <AppToast {...props} type="info" />,
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    minWidth: 0,
    maxWidth: '100%',
  },
  texts: { flex: 1 },
  title: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.ink,
    writingDirection: 'rtl',
  },
  sub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.inkSoft,
    marginTop: 2,
    writingDirection: 'rtl',
  },
});
