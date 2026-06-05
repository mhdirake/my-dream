import { Colors, Fonts, Radius } from '@/constants/colors';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type SelectOption = { id: number; name: string };

interface SelectModalProps {
  label: string;
  placeholder?: string;
  value?: SelectOption | null;
  options: SelectOption[];
  loading?: boolean;
  disabled?: boolean;
  onSelect: (option: SelectOption) => void;
}

export function SelectModal({
  label,
  placeholder = 'انتخاب کنید',
  value,
  options,
  loading,
  disabled,
  onSelect,
}: SelectModalProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      query.trim()
        ? options.filter(o => o.name.includes(query.trim()))
        : options,
    [options, query],
  );

  return (
    <>
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          onPress={() => !disabled && !loading && setOpen(true)}
          style={[styles.trigger, disabled && styles.triggerDisabled]}
        >
          <Text style={[styles.triggerText, !value && styles.placeholder]}>
            {loading ? 'در حال بارگذاری…' : value ? value.name : placeholder}
          </Text>
          <ChevronDown size={16} color={Colors.muted} strokeWidth={2} />
        </Pressable>
      </View>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{label}</Text>
            <Pressable onPress={() => { setOpen(false); setQuery(''); }} hitSlop={12}>
              <X size={20} color={Colors.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Search size={16} color={Colors.muted} strokeWidth={2} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="جستجو…"
              placeholderTextColor={Colors.muted}
              autoFocus
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                style={styles.item}
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <Text style={[styles.itemText, value?.id === item.id && styles.itemActive]}>
                  {item.name}
                </Text>
                {value?.id === item.id && (
                  <Check size={16} color={Colors.accent} strokeWidth={2.5} />
                )}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, color: Colors.inkSoft, marginBottom: 7, fontFamily: Fonts.semiBold },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: Colors.surface,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.ink, flex: 1 },
  placeholder: { color: Colors.muted },
  sheet: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lineSoft,
  },
  headerTitle: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
  },
  searchIcon: { marginLeft: 4 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.ink,
    textAlign: 'right',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  itemText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.ink },
  itemActive: { color: Colors.accent, fontFamily: Fonts.semiBold },
  sep: { height: 1, backgroundColor: Colors.lineSoft, marginHorizontal: 20 },
});
