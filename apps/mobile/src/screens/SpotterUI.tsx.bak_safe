import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, Image, Modal, ScrollView, TextInput, Switch, Alert,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { spotterStrings, fill } from '../lib/spotterStrings'
import type { SpotterApi, SpotterReq } from '../lib/spotter'

const GREEN = '#1D9E75'
const DEEP = '#0E6B4F'
const MINT = '#EAF6F1'
const AMBER = '#E8960C'
const LIFTS = ['bench', 'squat', 'deadlift', 'other']
const EMOJI: Record<string, string> = { bench: '🏋️', squat: '🦵', deadlift: '⚡', other: '💪' }

function leftText(expires: string, now: number) {
  const s = Math.max(0, Math.floor((new Date(expires).getTime() - now) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function Face({ name, url, size }: { name: string, url?: string | null, size: number }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.42 }}>{(name[0] || '?').toUpperCase()}</Text>
    </View>
  )
}

// Floating button, bottom right, with a count of people who need a spot right now.
export function SpotterFab({ lang, count, active, onPress }: { lang: string, count: number, active: boolean, onPress: () => void }) {
  const s = spotterStrings(lang)
  return (
    <TouchableOpacity style={[st.fab, active && { backgroundColor: AMBER }]} onPress={onPress} activeOpacity={0.88}>
      <Text style={{ fontSize: 17 }}>🏋️</Text>
      <Text style={st.fabText}>{s.fab}</Text>
      {count > 0 && <View style={st.fabBadge}><Text style={st.fabBadgeText}>{count}</Text></View>}
    </TouchableOpacity>
  )
}

export function SpotterSheet({ lang, spotter, gymName, onClose }: {
  lang: string, spotter: SpotterApi, gymName: string, onClose: () => void
}) {
  const s = spotterStrings(lang)
  const [lift, setLift] = useState('bench')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
  const { mine, open } = spotter

  useEffect(() => {
    spotter.refresh()
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const liveOpen = open.filter(r => new Date(r.expires_at).getTime() > now)
  const err = (c: string | null) => {
    if (!c) return
    const map: Record<string, string> = { no_gym: s.err_no_gym, already_open: s.err_already, too_soon: s.err_too_soon, taken: s.err_taken, expired: s.err_expired }
    Alert.alert(map[c] || s.err_generic)
  }

  async function send() {
    if (busy) return
    setBusy(true)
    err(await spotter.create(lift, note.trim()))
    setNote('')
    setBusy(false)
  }

  async function help(r: SpotterReq) {
    if (busy) return
    setBusy(true)
    const c = await spotter.respond(r.id, 'help')
    setBusy(false)
    if (c) err(c)
    else Alert.alert(r.requester_name || '', `${s.claimed_hint} · ${gymName}`)
  }

  const liftName = (l: string) => s[l] || l

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={st.grab} />
          <View style={st.head}>
            <View>
              <Text style={st.title}>🏋️ {s.title}</Text>
              <Text style={st.gym}>{gymName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={st.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}>
            {mine ? (
              <View style={[st.card, { backgroundColor: mine.status === 'claimed' ? MINT : '#FFF6E5' }]}>
                <Text style={st.cardKicker}>{s.your_req}</Text>
                <Text style={st.cardTitle}>{EMOJI[mine.lift]} {liftName(mine.lift)}{mine.note ? ` · ${mine.note}` : ''}</Text>
                {mine.status === 'claimed' ? (
                  <>
                    <Text style={[st.status, { color: DEEP }]}>{fill(s.on_way, { name: spotter.helperName || '…' })}</Text>
                    <TouchableOpacity style={st.btn} onPress={async () => err(await spotter.respond(mine.id, 'done'))} activeOpacity={0.85}>
                      <Text style={st.btnText}>{s.done}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={[st.status, { color: AMBER }]}>{s.waiting}  ·  {leftText(mine.expires_at, now)}</Text>
                )}
                <TouchableOpacity onPress={async () => err(await spotter.respond(mine.id, 'cancel'))} style={{ marginTop: 12 }}>
                  <Text style={st.link}>{s.cancel}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={st.card}>
                <Text style={st.cardTitle}>{s.need_spot}</Text>
                <Text style={st.sub}>{s.need_sub}</Text>
                <Text style={st.label}>{s.pick_lift}</Text>
                <View style={st.chips}>
                  {LIFTS.map(l => (
                    <TouchableOpacity key={l} style={[st.chip, lift === l && st.chipOn]} onPress={() => setLift(l)} activeOpacity={0.85}>
                      <Text style={[st.chipText, lift === l && { color: '#fff' }]}>{EMOJI[l]} {liftName(l)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={st.input} value={note} onChangeText={setNote} placeholder={s.note_ph} placeholderTextColor="#9aa8a2" maxLength={80} />
                <TouchableOpacity style={[st.btn, busy && { opacity: 0.6 }]} onPress={send} disabled={busy} activeOpacity={0.85}>
                  <Text style={st.btnText}>{s.send}</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={st.section}>{s.now_needed}</Text>
            {liveOpen.length === 0 ? (
              <Text style={st.empty}>{s.none_now}</Text>
            ) : liveOpen.map(r => {
              const nm = r.requester_name || '?'
              return (
                <View key={r.id} style={st.row}>
                  <Face name={nm} url={r.requester_avatar} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.rowName} numberOfLines={1}>{fill(s.needs, { name: nm.split(' ')[0] })}</Text>
                    <Text style={st.rowSub} numberOfLines={2}>
                      {EMOJI[r.lift]} {liftName(r.lift)}{r.note ? ` · ${r.note}` : ''}  ·  {leftText(r.expires_at, now)}
                    </Text>
                  </View>
                  <TouchableOpacity style={st.help} onPress={() => help(r)} activeOpacity={0.85}>
                    <Text style={st.helpText}>{s.help}</Text>
                  </TouchableOpacity>
                </View>
              )
            })}

            <View style={st.alerts}>
              <View style={{ flex: 1 }}>
                <Text style={st.rowName}>{s.alerts}</Text>
                <Text style={st.rowSub}>{s.alerts_sub}</Text>
              </View>
              <Switch value={spotter.alertsOn} onValueChange={spotter.setAlerts} trackColor={{ true: GREEN, false: '#d4dcd8' }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const st = StyleSheet.create({
  fab: {
    position: 'absolute', right: 16, bottom: 104, zIndex: 20, elevation: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: DEEP, borderRadius: 26, paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#0E6B4F', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  fabBadge: { backgroundColor: '#E5484D', borderRadius: 11, minWidth: 22, height: 22, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
  fabBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, maxHeight: '88%' },
  grab: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: '#d9e2de', marginBottom: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 },
  gym: { marginTop: 2, fontSize: 14, color: '#6f7f79' },
  close: { fontSize: 22, color: '#9aa8a2', fontWeight: '700' },
  card: { backgroundColor: MINT, borderRadius: 22, padding: 18 },
  cardKicker: { fontSize: 12, fontWeight: '800', color: '#6f7f79', letterSpacing: 0.8, textTransform: 'uppercase' },
  cardTitle: { fontSize: 19, fontWeight: '800', color: '#1a1a1a', marginTop: 2 },
  sub: { marginTop: 4, fontSize: 14, color: '#5f6f69' },
  label: { marginTop: 16, fontSize: 13, fontWeight: '700', color: '#5f6f69' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#cfe3da' },
  chipOn: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 14.5, fontWeight: '700', color: '#1a1a1a' },
  input: { marginTop: 12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#d9e8e1', color: '#1a1a1a' },
  btn: { marginTop: 14, backgroundColor: GREEN, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  status: { marginTop: 10, fontSize: 15.5, fontWeight: '700' },
  link: { color: '#6f7f79', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  section: { marginTop: 24, marginBottom: 8, fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  empty: { fontSize: 14.5, color: '#8a9a94', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowName: { fontSize: 15.5, fontWeight: '800', color: '#1a1a1a' },
  rowSub: { marginTop: 2, fontSize: 13, color: '#6f7f79' },
  help: { backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  helpText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  alerts: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e8eeeb' },
})
