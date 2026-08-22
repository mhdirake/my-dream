import { Colors, Fonts, Radius } from '@/constants/colors';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

let showListener: ((req: ConfirmRequest) => void) | null = null;

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
  const slideY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    showListener = req => setRequest(req);
    return () => { showListener = null; };
  }, []);

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

  if (!request) return null;

  const cancelButtons = request.buttons.filter(b => b.style === 'cancel');
  const actionButtons = request.buttons.filter(b => b.style !== 'cancel');

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close()}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.42)',
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
