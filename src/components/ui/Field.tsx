import { Colors, Fonts } from '@/constants/colors';
import { Platform, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';

interface FieldProps {
  label?: string;
  required?: boolean;
  value?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  secureTextEntry?: boolean;
  onChangeText?: (v: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  maxLength?: number;
  textDirection?: 'rtl' | 'ltr';
  keepCursorAtEnd?: boolean;
  editable?: boolean;
}

export function Field({ label, required = false, value, placeholder, hint, error, prefix, suffix, secureTextEntry, onChangeText, keyboardType, autoCapitalize, autoCorrect, maxLength, textDirection, keepCursorAtEnd, editable = true }: FieldProps) {
  const directionStyle: TextStyle | null = textDirection === 'ltr'
    ? styles.inputLtr
    : textDirection === 'rtl'
      ? styles.inputRtl
      : null;
  const cursorAtEnd = keepCursorAtEnd && Platform.OS !== 'web' && value != null
    ? { start: value.length, end: value.length }
    : undefined;

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}{required && <Text style={styles.required}> *</Text>}</Text>}
      <View style={[styles.box, prefix && styles.prefixBox, error && styles.boxError]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, directionStyle, error && styles.boxError]}
          accessibilityLabel={label ? `${label}${required ? '، الزامی' : ''}` : undefined}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={Colors.muted}
          secureTextEntry={secureTextEntry}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          selection={cursorAtEnd}
          editable={editable}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
      {(hint || error) && (
        <Text accessibilityLiveRegion={error ? 'polite' : 'none'} style={[styles.hint, error && styles.hintError]}>{error || hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, color: Colors.inkSoft, marginBottom: 7, fontFamily: Fonts.semiBold },
  required: { color: Colors.danger },
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
  prefixBox: { flexDirection: 'row', direction: 'ltr', alignItems: 'center', gap: 10 },
  prefix: { color: Colors.ink, fontFamily: Fonts.semiBold, fontSize: 16, writingDirection: 'ltr' },
  input: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.ink,
    backgroundColor: Colors.surface,
  },
  inputLtr: {
    textAlign: 'left',
    writingDirection: 'ltr',
  } as TextStyle,
  inputRtl: { textAlign: 'right', writingDirection: 'rtl' },
  suffix: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.regular },
  hint: { fontSize: 10.5, color: Colors.muted, marginTop: 5, fontFamily: Fonts.regular },
  hintError: { color: Colors.danger },
});
