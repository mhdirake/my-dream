import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { searchApi, type SearchUser } from '@/lib/api/search';
import { useAuth } from '@/lib/auth/AuthContext';
import { router } from 'expo-router';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function badgeKind(slug: string): 'ai' | 'community' | 'gold' | 'check' {
  if (slug === 'ai_trusted' || slug === 'ai-trusted') return 'ai';
  if (slug === 'community_verified' || slug === 'community-verified') return 'community';
  if (slug === 'gold_badge' || slug === 'gold-badge') return 'gold';
  return 'check';
}

export default function SearchScreen() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.search(token, query.trim());
        setResults(res.data);
        setHasMore(res.meta.current_page < res.meta.last_page);
        setPage(1);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, token]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || query.trim().length < 2) return;
    setLoadingMore(true);
    try {
      const res = await searchApi.search(token, query.trim(), 20, page + 1);
      setResults(prev => [...prev, ...res.data]);
      setHasMore(res.meta.current_page < res.meta.last_page);
      setPage(p => p + 1);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  const openProfile = (user: SearchUser) => {
    router.push({ pathname: '/user/[id]', params: { id: String(user.id) } } as never);
  };

  const renderItem = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity style={styles.card} onPress={() => openProfile(item)} activeOpacity={0.8}>
      <Avatar
        size={50}
        name={item.first_name}
        photoUrl={item.profile_photo?.urls?.thumbnail ?? null}
      />
      <View style={styles.cardInfo}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName}>
            {item.first_name}{item.last_name ? ` ${item.last_name}` : ''}
            {item.age ? `، ${item.age}` : ''}
          </Text>
          <View style={styles.badges}>
            {item.badges.slice(0, 2).map(b => (
              <Badge key={b.id} kind={badgeKind(b.slug)} />
            ))}
          </View>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardUsername}>@{item.username}</Text>
          {item.city ? <Text style={styles.cardCity}> · {item.city}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  const showHint = query.trim().length < 2 && !loading;
  const showEmpty = !loading && query.trim().length >= 2 && results.length === 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <Search size={15} color={Colors.muted} strokeWidth={2} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="جستجو با نام یا نام کاربری…"
            placeholderTextColor={Colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <X size={15} color={Colors.muted} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoider>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : showHint ? (
        <View style={styles.center}>
          <Search size={36} color={Colors.lineSoft} strokeWidth={1.5} />
          <Text style={styles.hintTxt}>با نام یا نام کاربری جستجو کن</Text>
          <Text style={styles.hintSub}>حداقل ۲ کاراکتر</Text>
        </View>
      ) : showEmpty ? (
        <View style={styles.center}>
          <Text style={styles.hintTxt}>نتیجه‌ای پیدا نشد</Text>
          <Text style={styles.hintSub}>«{query}» در هیچ پروفایلی نیست</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={u => String(u.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg, borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: Colors.hair,
    paddingHorizontal: 12, height: 40, gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  input: {
    flex: 1, fontSize: 14, fontFamily: Fonts.regular,
    color: Colors.ink, textAlign: 'auto',
    height: 40, paddingVertical: 0, margin: 0,
    textAlignVertical: 'center', includeFontPadding: false,
  },

  list: { padding: Spacing.lg, gap: 2 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.hair,
  },
  cardInfo: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 14.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  badges: { flexDirection: 'row', gap: 4 },
  cardMeta: { flexDirection: 'row', marginTop: 3 },
  cardUsername: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted },
  cardCity: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted },

  hintTxt: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  hintSub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },
});
