import { AppBar } from '@/components/ui/AppBar';
import { CompatibilitySummary } from '@/components/discovery/CompatibilitySummary';
import { Colors, Fonts } from '@/constants/colors';
import { profileApi, type UserProfile } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Kept as a deep-link destination, but no route/cached values can supply scores.
export default function CompatibilityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, user } = useAuth();
  const candidateId = Number(id);
  const viewerId = user?.id ?? session?.userId;
  const token = session?.accessToken;
  const [result, setResult] = useState<{ token: string; profile: UserProfile } | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    if (!token || !Number.isSafeInteger(candidateId) || candidateId <= 0) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setResult(null);
    profileApi.getUserProfile(token, candidateId, viewerId)
      .then(profile => { if (!cancelled) setResult({ token, profile }); })
      .catch(() => { if (!cancelled) setResult(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, candidateId, viewerId]));

  const profile = result?.token === token && result?.profile.id === candidateId ? result.profile : null;
  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="سازگاری" back />
      {loading ? <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View> : (
        <ScrollView contentContainerStyle={styles.content}>
          {profile && <Text style={styles.name}>{profile.first_name}</Text>}
          <CompatibilitySummary compatibility={profile?.compatibility} detailed />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 60, gap: 14 },
  name: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.ink, textAlign: 'right' },
});
