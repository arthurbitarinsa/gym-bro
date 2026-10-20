import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getBlockedUsers, unblockUser } from '../lib/safety'
import { safetyStrings } from './SafetySheet'

const GREEN = '#1D9E75'

export default function BlockedUsers({ lang, onBack }: { lang: string, onBack: () => void }) {
  const s = safetyStrings(lang)
  const [list, setList] = useState<{ blocked_id: string, blocked_name: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setList(await getBlockedUsers())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function unblock(id: string) {
    setList(prev => prev.filter(u => u.blocked_id !== id))
    const ok = await unblockUser(id)
    if (!ok) load()
  }

  return (
    <SafeAreaView style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={st.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>{s.blocked_users}</Text>
        <View style={st.backBtn} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {loading && <ActivityIndicator color={GREEN} style={{ marginTop: 32 }} />}
        {!loading && list.length === 0 && <Text style={st.empty}>{s.no_blocked}</Text>}
        {list.map(u => (
          <View key={u.blocked_id} style={st.row}>
            <View style={st.avatar}><Text style={st.avatarText}>{(u.blocked_name || '?')[0].toUpperCase()}</Text></View>
            <Text style={st.name} numberOfLines={1}>{u.blocked_name || '—'}</Text>
            <TouchableOpacity style={st.btn} onPress={() => unblock(u.blocked_id)} activeOpacity={0.7}>
              <Text style={st.btnText}>{s.unblock}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  backBtn: { width: 40, alignItems: 'center' },
  backText: { fontSize: 32, color: '#1a1a1a', marginTop: -4 },
  empty: { textAlign: 'center', color: '#8a9a94', fontSize: 15, marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f0faf6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: GREEN, fontWeight: '800', fontSize: 17 },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  btn: { borderWidth: 1.5, borderColor: GREEN, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  btnText: { color: GREEN, fontWeight: '700', fontSize: 14 },
})
