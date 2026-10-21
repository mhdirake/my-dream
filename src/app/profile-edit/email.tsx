import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Colors, Fonts } from '@/constants/colors';
import { profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSafeBack } from '@/lib/useSafeBack';
import { toast } from '@/lib/toast';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function EmailScreen() {
 const { session } = useAuth();
 const back = useSafeBack('/profile-edit');
 const [email,setEmail] = useState('');
 const [loading,setLoading] = useState(true);
 const [failed,setFailed] = useState(false);
 const [saving,setSaving] = useState(false);
 const [error,setError] = useState('');
 const [retry,setRetry] = useState(0);
 useEffect(() => {
  if (!session?.accessToken) return;
  let active=true; setLoading(true); setFailed(false);
  profileApi.getProfile(session.accessToken).then(p => { if(active) setEmail(p.email ?? ''); })
   .catch(() => { if(active) setFailed(true); }).finally(() => { if(active) setLoading(false); });
  return () => { active=false; };
 },[session?.userId,retry]);
 const save = async () => {
  if (!session?.accessToken || saving) return;
  const value=email.trim().toLowerCase();
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setError('ایمیل معتبر وارد کن'); return; }
  setSaving(true);setError('');
  try { await profileApi.updateProfile(session.accessToken,{email:value || null}); toast.success('ایمیل ذخیره شد'); back(); }
  catch(e) { setError(e instanceof Error ? e.message : 'ذخیره نشد؛ دوباره تلاش کن'); }
  finally { setSaving(false); }
 };
 return <SafeAreaView style={{flex:1,backgroundColor:Colors.bg}}>
  <AppBar title="ایمیل" back backFallback="/profile-edit" />
  <ScrollView contentContainerStyle={{padding:20,gap:20,width:'100%',maxWidth:600,alignSelf:'center'}} keyboardShouldPersistTaps="handled">
   <Text style={{fontFamily:Fonts.regular,color:Colors.muted,textAlign:'right',lineHeight:24}}>ایمیل اختیاری است. برای حذف، فیلد را خالی و ذخیره کن. ورود با شماره موبایل انجام می‌شود.</Text>
   {failed ? <Button onPress={() => setRetry(v=>v+1)}>تلاش دوباره</Button> : <>
   <Field label="ایمیل (اختیاری)" value={email} onChangeText={v=>{setEmail(v);setError('');}} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={255} editable={!loading && !saving} error={error || undefined} textDirection="ltr" />
   <Button onPress={save} disabled={loading || saving}>{loading ? 'در حال دریافت…' : saving ? 'در حال ذخیره…' : 'ذخیره'}</Button></>}
  </ScrollView>
 </SafeAreaView>;
}
