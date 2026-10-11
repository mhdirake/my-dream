import { Colors, Fonts, Radius } from '@/constants/colors';
import { AlertPortal } from '@/components/ui/AlertLayer';
import { useEffect, useState } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ConfirmButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type ConfirmRequest = {
  title: string;
  message?: string;
  buttons: ConfirmButton[];
};

let showListener: ((req: ConfirmRequest | null) => void) | null = null;
let confirmationOpen = false;

export function dismissConfirmSheet(): boolean {
  if (!confirmationOpen) return false;
  showListener?.(null);
  return true;
}

// Drop-in replacement for Alert.alert(title, message, buttons) that renders
// a themed bottom sheet instead of the native OS dialog.
export const confirmSheet = {
  show(title: string, message?: string, buttons?: ConfirmButton[]) {
    const finalButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'باشه' }];
    showListener?.({ title, message, buttons: finalButtons });
  },
};

export function ConfirmSheetHost() {
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [slideY] = useState(() => new Animated.Value(500));

  useEffect(() => {
    showListener = req => setRequest(req);
    return () => { showListener = null; confirmationOpen = false; };
  }, []);

  useEffect(() => {
    confirmationOpen = request !== null;
  }, [request]);

  useEffect(() => {
    if (request) {
      slideY.setValue(500);
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    }
  }, [request, slideY]);

  const close = (after?: () => void) => {
    Animated.timing(slideY, { toValue: 500, duration: 200, useNativeDriver: true }).start(() => {
      setRequest(null);
      if (after) setTimeout(after, 80);
    });
  };

  useEffect(() => {
    if (!request) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setRequest(null);
      return true;
    });
    return () => subscription.remove();
  }, [request]);

  if (!request) return null;

  const cancelButtons = request.buttons.filter(b => b.style === 'cancel');
  const actionButtons = request.buttons.filter(b => b.style !== 'cancel');

  return (
    <AlertPortal>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
        <Animated.View style={[styles.sheet, { paddingBottom: 16 + insets.bottom, transform: [{ translateY: slideY }] }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{request.title}</Text>
          {!!request.message && <Text style={styles.message}>{request.message}</Text>}
          <View style={styles.buttons}>
            {actionButtons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.btn, btn.style === 'destructive' ? styles.btnDestructive : styles.btnDefault]}
                onPress={() => close(btn.onPress)}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnTxt, btn.style === 'destructive' ? styles.btnTxtDestructive : styles.btnTxtDefault]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
            {cancelButtons.map((btn, i) => (
              <TouchableOpacity
                key={`cancel-${i}`}
                style={[styles.btn, styles.btnCancel]}
                onPress={() => close(btn.onPress)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnTxtCancel}>{btn.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </AlertPortal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    backgroundColor: Colors.modalBackdrop,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 16, paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.line, alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 16, fontFamily: Fonts.extraBold, color: Colors.ink, textAlign: 'center' },
  message: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted,
    textAlign: 'center', marginTop: 8, marginBottom: 4, lineHeight: 20,
  },
  buttons: { marginTop: 16, gap: 10 },
  btn: {
    paddingVertical: 14, borderRadius: Radius.lg,
    alignItems: 'center',
  },
  btnDefault: { backgroundColor: Colors.purple },
  btnDestructive: { backgroundColor: Colors.dangerSoft },
  btnCancel: { backgroundColor: Colors.ph2 },
  btnTxt: { fontSize: 14, fontFamily: Fonts.bold },
  btnTxtDefault: { color: '#fff' },
  btnTxtDestructive: { color: Colors.danger },
  btnTxtCancel: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.inkSoft },
});
