import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Colors, Fonts } from '@/constants/colors';
import { inlineTerms, reachedTermsEnd, type TermsDocument } from '@/lib/termsPolicy';
import { useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export function TermsReader({ document, onAccept, busy = false, accepted = false }: {
  document: TermsDocument; onAccept: () => Promise<void>; busy?: boolean; accepted?: boolean;
}) {
  const [read, setRead] = useState(false);
  const [checked, setChecked] = useState(false);
  const size = useRef({ viewport: 0, content: 0, offset: 0 });
  const checkEnd = () => { if (reachedTermsEnd(size.current.viewport, size.current.content, size.current.offset)) setRead(true); };
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} scrollEventThrottle={32}
    onLayout={e => { size.current.viewport = e.nativeEvent.layout.height; checkEnd(); }}
    onContentSizeChange={(_, height) => { size.current.content = height; checkEnd(); }}
    onScroll={e => { size.current.offset = e.nativeEvent.contentOffset.y; checkEnd(); }}>
    <Text style={styles.meta}>نسخه {document.id} · {new Date(document.published_at).toLocaleDateString('fa-IR')}</Text>
    {document.content.split('\n').map((line, i) => {
      const heading = /^(#{1,3})\s+/.exec(line); const list = /^(?:[-*]|\d+\.)\s+/.test(line);
      const text = heading ? line.slice(heading[0].length) : list ? '• ' + line.replace(/^(?:[-*]|\d+\.)\s+/, '') : line;
      return <Text key={i} style={[styles.text, heading && styles.heading]}>
        {inlineTerms(text).map((part, j) => <Text key={j} style={[part.bold && { fontFamily: Fonts.bold }, part.italic && { fontStyle: 'italic' }, part.href && { color: Colors.accent, textDecorationLine: 'underline' }]}
          onPress={part.href ? () => { Linking.openURL(part.href!).catch(() => {}); } : undefined}>{part.text}</Text>)}
      </Text>;
    })}
    <View style={styles.footer}>
      {!read && <Text style={styles.meta}>برای فعال شدن تأیید، تا انتهای متن بروید.</Text>}
      {accepted ? <Text style={styles.text}>این نسخه را تأیید کرده‌اید.</Text> : <>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled: !read || busy }} disabled={!read || busy}
          onPress={() => setChecked(v => !v)} style={[styles.checkbox, !read && { opacity: 0.5 }]}>
          <Checkbox checked={checked} />
          <Text style={[styles.text, { flex: 1 }]}>متن قوانین و حریم خصوصی را خواندم و می‌پذیرم.</Text>
        </Pressable>
        <Button disabled={!read || !checked || busy} onPress={() => { void onAccept(); }}>{busy ? 'در حال ثبت تأیید…' : 'تأیید و ادامه'}</Button>
      </>}
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32, gap: 8 },
  text: { color: Colors.ink, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
  heading: { fontFamily: Fonts.bold, fontSize: 18, marginTop: 16 },
  meta: { color: Colors.muted, fontFamily: Fonts.regular, fontSize: 12, textAlign: 'right' },
  footer: { marginTop: 20, gap: 14 }, checkbox: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
