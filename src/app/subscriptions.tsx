import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { subscriptionsApi, SubscriptionItem, SubscriptionReceipt, SubscriptionsResponse } from '@/lib/api/subscriptions';
import { useAuth } from '@/lib/auth/AuthContext';
import { subscriptionDate, subscriptionSource, subscriptionStatus } from '@/lib/subscriptions';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const digits=(n:number)=>n.toLocaleString('fa-IR');
function Entry({item,receipt=false}:{item:SubscriptionItem|SubscriptionReceipt;receipt?:boolean}) {
 const r=receipt ? item as SubscriptionReceipt : null;
 const accent=item.plan.slug === 'gold' ? Colors.goldDeep : item.plan.slug === 'silver' ? '#A9B8CC' : Colors.accent;
 return <View style={[styles.entry,{borderColor:accent+'66'}]}>
  <View style={styles.top}><Text style={[styles.plan,{color:accent}]}>{item.plan.name || (item.plan.slug === 'gold' ? 'طلایی' : 'نقره‌ای')}</Text><Text style={[styles.status,{color:accent}]}>{subscriptionStatus(item.status)}</Text></View>
  {!r && item.sources?.map((source,index)=><Text key={index} style={styles.text}>{subscriptionSource(source.source_type)}{source.sender_name ? ` · ${source.sender_name}` : ''}{source.duration_seconds !== null ? ` · ${digits(source.duration_seconds / 86400)} روز` : ''}</Text>)}
  {r && <Text style={styles.text}>{subscriptionSource(r.source_type)}{r.sender_name ? ` · ${r.sender_name}` : ''}{r.duration_seconds !== null ? ` · ${digits(r.duration_seconds / 86400)} روز` : ' · مدت نامشخص'}</Text>}
  {item.status === 'queued' && <Text style={styles.text}>پس از پایان اشتراک‌های پیشین، در {subscriptionDate(item.starts_at)} خودکار فعال می‌شود. مدت این اشتراک محفوظ است.</Text>}
  {r && <Text style={styles.muted}>دریافت: {subscriptionDate(r.received_at)}</Text>}
  <Text style={styles.muted}>شروع: {subscriptionDate(item.starts_at)}</Text>
  <Text style={styles.muted}>پایان: {subscriptionDate(item.ends_at)}</Text>
 </View>;
}
export default function SubscriptionsScreen() {
 const {session}=useAuth();
 const [data,setData]=useState<SubscriptionsResponse|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [retry,setRetry]=useState(0),[more,setMore]=useState(false);
 useFocusEffect(useCallback(()=>{
  if(!session?.accessToken) return;
  let active=true;setLoading(true);setError('');
  subscriptionsApi.list(session.accessToken).then(r=>{if(active)setData(r);}).catch(()=>{if(active)setError('اشتراک‌ها بارگذاری نشد؛ دوباره تلاش کن.');}).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[session?.accessToken,retry]));
 const next=async()=>{
  if(!session?.accessToken || !data || more)return;
  setMore(true);setError('');
  try {const r=await subscriptionsApi.list(session.accessToken,data.history.current_page+1);setData(prev=>prev ? {...r,history:{...r.history,data:[...prev.history.data,...r.history.data]}} : r);}
  catch{setError('دریافت ادامهٔ تاریخچه ناموفق بود؛ دوباره تلاش کن.');}finally{setMore(false);}
 };
 return <SafeAreaView style={styles.root}><AppBar title="اشتراک‌های من" back backFallback="/me" />
  <ScrollView contentContainerStyle={styles.content}>
   {loading ? <ActivityIndicator color={Colors.accent}/> : !data ? <><Text style={styles.text}>{error}</Text><Button onPress={()=>setRetry(v=>v+1)}>تلاش دوباره</Button></> : <>
    <Text style={styles.heading}>اشتراک فعال</Text>
    {data.active.length ? data.active.map(s=><Entry key={s.id} item={s}/>) : <Text style={styles.muted}>اشتراک پولی فعالی نداری؛ پلن پایه فعال است.</Text>}
    <Text style={styles.heading}>صف فعال‌سازی</Text>
    {data.queued.length ? data.queued.map(s=><Entry key={s.id} item={s}/>) : <Text style={styles.muted}>اشتراکی در صف نیست.</Text>}
    <Text style={styles.heading}>تاریخچهٔ دریافت‌ها</Text>
    {data.history.data.length ? data.history.data.map(s=><Entry key={s.id} item={s} receipt/>) : <Text style={styles.muted}>هنوز خرید، هدیه یا جایزه‌ای ثبت نشده است.</Text>}
    {!!error && <Text style={[styles.text,{color:Colors.danger}]}>{error}</Text>}
    {data.history.current_page < data.history.last_page && <Button variant="outline" onPress={next} disabled={more}>{more ? 'در حال دریافت…' : 'دریافت ادامهٔ تاریخچه'}</Button>}
   </>}
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:Colors.bg},content:{padding:20,gap:14,width:'100%',maxWidth:720,alignSelf:'center',paddingBottom:40},heading:{fontFamily:Fonts.bold,fontSize:18,color:Colors.ink,textAlign:'right',marginTop:12},entry:{backgroundColor:Colors.surface,borderWidth:1,borderRadius:Radius.lg,padding:18,gap:10},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8},plan:{fontFamily:Fonts.bold,fontSize:17},status:{fontFamily:Fonts.semiBold,fontSize:12},text:{fontFamily:Fonts.regular,color:Colors.inkSoft,fontSize:14,lineHeight:25,textAlign:'right',writingDirection:'rtl'},muted:{fontFamily:Fonts.regular,color:Colors.muted,fontSize:12,lineHeight:22,textAlign:'right',writingDirection:'rtl'}});
