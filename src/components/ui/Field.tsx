import { Colors, Fonts } from '@/constants/colors';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface FieldProps {
  label?: string;
  value?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  suffix?: string;
  secureTextEntry?: boolean;
  onChangeText?: (v: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}

export function Field({ label, value, placeholder, hint, error, suffix, secureTextEntry, onChangeText, keyboardType, autoCapitalize, autoCorrect }: FieldProps) {
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.box, error && styles.boxError]}>
        <TextInput
          style={styles.input}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={Colors.muted}
          secureTextEntry={secureTextEntry}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
      {(hint || error) && (
        <Text style={[styles.hint, error && styles.hintError]}>{error || hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, color: Colors.inkSoft, marginBottom: 7, fontFamily: Fonts.semiBold },
  box: {
    // borderWidth: 1.5,
    // borderColor: Colors.lineSoft,
    // borderRadius: 14,
    // paddingHorizontal: 15,
    // paddingVertical: 13,
    // flexDirection: 'row',
    // alignItems: 'center',
    // backgroundColor: Colors.surface,
    // minHeight: 48,
  },
  boxError: { borderColor: Colors.danger },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.ink,
    backgroundColor: Colors.surface,
    flexDirection: "row"
  },
  suffix: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.regular },
  hint: { fontSize: 10.5, color: Colors.muted, marginTop: 5, fontFamily: Fonts.regular },
  hintError: { color: Colors.danger },
});
