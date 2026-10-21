import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { getHiddenIds } from '../lib/safety'
import { inboxStrings } from '../lib/inboxStrings'
import { askCancel } from '../lib/cancelRequest'
import type { Conversation } from '../lib/inbox'

const GREEN = '#1D9E75'
const MINT = '#f0faf6'
const AMBER = '#FF9800'
const AMBER_BG = '#fff8f0'

export default function GymMembers({ t, lang, myId, gymId, gymName, connections, onBack, onOpenChat, onOpenProfile }: {
  t: Record<string, string>
  lang: string
  myId: string | undefined
  gymId: string | null
  gymName: string
  connections: Conversation[]
  onBack: () => void
  onOpenChat: (matchId: string, other: any) => void
  onOpenProfile: (user: any) => void
}) {
  const x = inboxStrings(lang)
  const [visitors, setVisitors] = useState<any[]>([])
  const [regulars, setRegulars] = useState<any[]>([])
  const [homeNames, setHomeNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [requested, setRequested] = useState<string[]>([])

  useEffect(() => {
    (async () => {
      if (!gymId || !myId) { setLoading(false); return }
      const now = new Date().toISOString()
      const [{ data }, hidden, { data: mine }] = await Promise.all([
        supabase.from('profiles').select('*')
          .or(`gym_id.eq.${gymId},and(temp_gym_id.eq.${gymId},temp_gym_expires_at.gt.${now})`)
          .neq('id', myId),
        getHiddenIds(),
        supabase.from('matches').select('user_a, user_b').or(`user_a.eq.${myId},user_b.eq.${myId}`),
      ])
      const all = (data || []).filter(p => !hidden.includes(p.id))
      const isVisitor = (p: any) => p.gym_id !== gymId && p.temp_gym_id === gymId && p.temp_gym_expires_at && new Date(p.temp_gym_expires_at) > new Date()
      const v = all.filter(isVisitor)
      setVisitors(v)
      setRegulars(all.filter(p => !isVisitor(p)))
      setRequested((mine || []).map(m => (m.user_a === myId ? m.user_b : m.user_a)))

      const homeIds = [...new Set(v.map(p => p.gym_id).filter(Boolean))]
      if (homeIds.length) {
        const { data: gyms } = await supabase.from('gyms').select('id, name').in('id', homeIds)
        const map: Record<string, string> = {}
        ;(gyms || []).forEach(g => { map[g.id] = g.name })
        setHomeNames(map)
      }
      setLoading(false)
    })()
  }, [gymId, myId])

  async function connect(id: string) {
    const { error } = await supabase.from('matches').insert({ user_a: myId, user_b: id, initiated_by: myId, status: 'pending' })
    if (!error || error.message.includes('duplicate')) setRequested(prev => [...prev, id])
  }

  function cancelSent(p: any) {
    askCancel(lang, p.full_name || p.username || '', p.id, r => {
      if (r === 'cancelled') setRequested(prev => prev.filter(x => x !== p.id))
    })
  }

  function row(p: any, visiting: boolean) {
    const nm = p.full_name || p.username || '?'
    const conn = connections.find(c => c.other?.id === p.id)
    const sent = requested.includes(p.id)
    const goal = p.training_goal && t[`goal_${p.training_goal}`] ? t[`goal_${p.training_goal}`] : ''
    return (
      <TouchableOpacity key={p.id} style={st.row} onPress={() => onOpenProfile(p)} activeOpacity={0.7}>
        <View>
          {p.avatar_url
            ? <Image source={{ uri: p.avatar_url }} style={[st.avatar, visiting && st.avatarVisit]} />
            : <View style={[st.avatar, visiting && st.avatarVisit, { backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{nm[0].toUpperCase()}</Text></View>}
          {visiting && <View style={st.plane}><Text style={{ fontSize: 11 }}>✈️</Text></View>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.name} numberOfLines={1}>{nm}</Text>
          {visiting ? (
            <Text style={st.visitLine} numberOfLines={1}>
              {homeNames[p.gym_id] ? `${x.visiting_from} ${homeNames[p.gym_id]}` : t.visiting}
              {p.temp_gym_expires_at ? ` · ${t.until} ${new Date(p.temp_gym_expires_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}` : ''}
            </Text>
          ) : (
            <Text style={st.user} numberOfLines={1}>@{p.username}{goal ? ` · ${goal}` : ''}</Text>
          )}
        </View>
        {conn ? (
          <TouchableOpacity style={st.btn} onPress={() => onOpenChat(conn.matchId, conn.other)} activeOpacity={0.8}>
            <Text style={st.btnText}>{x.message}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[st.btn, sent && st.btnSent]} onPress={() => (sent ? cancelSent(p) : connect(p.id))} activeOpacity={0.8}>
            <Text style={[st.btnText, sent && { color: GREEN }]}>{sent ? `${t.request_sent} ✕` : t.connect}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={st.backText}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={st.title}>{x.stat_members}</Text>
          {gymName ? <Text style={st.sub} numberOfLines={1}>{gymName}</Text> : null}
        </View>
        <View style={st.backBtn} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {loading && <ActivityIndicator color={GREEN} style={{ marginTop: 32 }} />}
        {!loading && visitors.length + regulars.length === 0 && <Text style={st.empty}>{x.no_members}</Text>}

        {visitors.length > 0 && (
          <View style={st.visitBox}>
            <Text style={st.sectionVisit}>✈️  {x.visitors_title} · {visitors.length}</Text>
            {visitors.map(p => row(p, true))}
          </View>
        )}

        {regulars.length > 0 && (
          <View style={{ marginTop: visitors.length > 0 ? 22 : 0 }}>
            {visitors.length > 0 && <Text style={st.section}>{x.regulars_title} · {regulars.length}</Text>}
            {regulars.map(p => row(p, false))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  sub: { fontSize: 12.5, color: '#8a9a94', marginTop: 1, maxWidth: 220 },
  backBtn: { width: 40, alignItems: 'center' },
  backText: { fontSize: 32, color: '#1a1a1a', marginTop: -4 },
  empty: { textAlign: 'center', color: '#8a9a94', fontSize: 15, marginTop: 40 },
  section: { fontSize: 13, fontWeight: '700', color: '#8a9a94', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  sectionVisit: { fontSize: 13, fontWeight: '800', color: '#a0670c', letterSpacing: 0.4, marginBottom: 4 },
  visitBox: { backgroundColor: AMBER_BG, borderRadius: 22, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, borderWidth: 1, borderColor: '#ffe2b8' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f5f4' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarVisit: { borderWidth: 2.5, borderColor: AMBER },
  plane: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', borderWidth: 1.5, borderColor: AMBER, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  user: { fontSize: 13, color: '#8a9a94', marginTop: 2 },
  visitLine: { fontSize: 12.5, color: '#a0670c', marginTop: 2, fontWeight: '600' },
  btn: { backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  btnSent: { backgroundColor: MINT },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
})
