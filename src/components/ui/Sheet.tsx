import { AppMaxWidth, Colors, Fonts, Spacing } from '@/constants/colors';
import { Modal } from '@/components/ui/BlurredModal';
import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Header title. Omit for a chromeless sheet (no header row). */
  title?: string;
  /** Tapping the dimmed backdrop or hardware back closes the sheet. Default true. */
  dismissable?: boolean;
  /** Grab handle at the top edge. Default true. */
  showHandle?: boolean;
  /** ✕ button in the header (only shown when `title` is set). Default true. */
  showClose?: boolean;
  /** Wrap `children` in a ScrollView. Turn off when the content scrolls itself. Default true. */
  scroll?: boolean;
  /** Pinned region below the (scrollable) body — action buttons live here. */
  footer?: ReactNode;
  /** Extra style for the body container (e.g. remove padding, center content). */
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * The one bottom-sheet shell every modal in the app uses: dim backdrop,
 * bottom-anchored card capped at the app frame width (`AppMaxWidth`), grab
 * handle, optional titled header with a close button, optional pinned footer.
 */
export function Sheet({
  visible,
  onClose,
  title,
  dismissable = true,
  showHandle = true,
  showClose = true,
  scroll = true,
  footer,
  contentStyle,
  children,
}: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismissable ? onClose : () => {}}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} />

        <View style={[styles.card, { paddingBottom: insets.bottom }]}>
          {showHandle ? <View style={styles.handle} /> : null}

          {title ? (
            <View style={styles.header}>
              <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
              {showClose ? (
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={8}>
                  <X size={18} color={Colors.muted} strokeWidth={2.5} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {scroll ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.content, contentStyle]}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.body, styles.content, contentStyle]}>{children}</View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalBackdrop,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: AppMaxWidth,
    maxHeight: '92%',
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.lineSoft,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
  },
  headerTitle: { fontSize: 15.5, fontFamily: Fonts.bold, color: Colors.ink, flex: 1, textAlign: 'right' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.hair,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  scroll: { flexShrink: 1 },
  body: { flexShrink: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  footer: {
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.hair,
    backgroundColor: Colors.surface,
  },
});
