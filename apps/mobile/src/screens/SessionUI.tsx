import React, { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TouchableOpacity, Image, Modal, ScrollView, TextInput, Alert,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { sessionStrings, fmt } from '../lib/sessionStrings'
import type { SessionRow, SessionsApi } from '../lib/sessions'
import Logbook, { LogbookRow } from './LogbookUI'

const GREEN = '#1D9E75'
const DEEP = '#0E6B4F'
const MINT = '#EAF6F1'
const AMBER = '#E8960C'
const FOCUS = ['push', 'pull', 'legs', 'upper', 'lower', 'cardio', 'open']
const FOCUS_EMOJI: Record<string, string> = { push: '💪', pull: '🧗', legs: '🦵', upper: '🏋️', lower: '🦿', cardio: '🏃', open: '✨' }
const EXERCISES = ['Bench press', 'Squat', 'Deadlift', 'Overhead press', 'Barbell row', 'Pull-up', 'Lat pulldown', 'Leg press', 'Curl']

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }
function timeLabel(d: Date) { return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
function dayLabel(d: Date, s: Record<string, string>) {
  const now = new Date()
  if (sameDay(d, now)) return s.today
  if (sameDay(d, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))) return s.tomorrow
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}
function whenLabel(iso: string, s: Record<string, string>) {
  const d = new Date(iso)
  return `${dayLabel(d, s)} ${timeLabel(d)}`
}
function relative(ms: number) {
  const m = Math.round(ms / 60000)
  if (m < 60) return `${Math.max(m, 1)} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h${m % 60 ? ` ${m % 60}m` : ''}`
  return `${Math.floor(h / 24)}d`
}
function Face({ name, url, size }: { name: string, url?: string | null, size: number }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.42 }}>{(name[0] || '?').toUpperCase()}</Text>
    </View>
  )
}
function errText(c: string | null, s: Record<string, string>) {
  if (!c) return null
  const map: Record<string, string> = { no_gym: s.err_no_gym, already_active: s.err_active, bad_time: s.err_time, invalid_state: s.err_state }
  return map[c] || s.err_generic
}

// ─── Plan a session (also used to suggest another time) ───────────────────────────
function PlanSheet({ lang, counter, otherName, onSubmit, onClose }: {
  lang: string, counter: boolean, otherName: string,
  onSubmit: (startsAtIso: string, focus: string) => Promise<string | null>, onClose: () => void
}) {
  const s = sessionStrings(lang)
  const insets = useSafeAreaInsets()
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = startOfDay(new Date()); d.setDate(d.getDate() + i); return d
  }), [])
  const slots = useMemo(() => {
    const out: { h: number, m: number }[] = []
    for (let h = 5; h <= 22; h++) { out.push({ h, m: 0 }); out.push({ h, m: 30 }) }
    return out
  }, [])
  const first = useMemo(() => {
    const t = new Date(Date.now() + 60 * 60000)
    let h = t.getHours(), m = t.getMinutes() <= 30 ? 30 : 0
    if (t.getMinutes() > 30) h += 1
    if (h > 22) return { day: 1, h: 18, m: 0 }
    return { day: 0, h: Math.max(h, 5), m }
  }, [])
  const [dayIdx, setDayIdx] = useState(first.day)
  const [slot, setSlot] = useState(slots.findIndex(x => x.h === first.h && x.m === first.m))
  const [focus, setFocus] = useState('open')
  const [busy, setBusy] = useState(false)

  const start = new Date(days[dayIdx]); start.setHours(slots[slot].h, slots[slot].m, 0, 0)
  const valid = start.getTime() > Date.now() + 10 * 60000

  async function submit() {
    if (busy || !valid) return
    setBusy(true)
    const c = await onSubmit(start.toISOString(), focus)
    setBusy(false)
    if (c) Alert.alert(errText(c, s) || '')
    else onClose()
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={st.grab} />
          <View style={st.head}>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>📅 {s.plan_session}</Text>
              <Text style={st.sub}>{s.plan_sub} · {otherName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><Text style={st.close}>✕</Text></TouchableOpacity>
          </View>

          <Text style={st.label}>{s.day}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map((d, i) => (
              <TouchableOpacity key={i} style={[st.chip, dayIdx === i && st.chipOn]} onPress={() => setDayIdx(i)} activeOpacity={0.85}>
                <Text style={[st.chipText, dayIdx === i && { color: '#fff' }]}>{dayLabel(d, s)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={st.label}>{s.time}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {slots.map((x, i) => {
              const t = new Date(days[dayIdx]); t.setHours(x.h, x.m, 0, 0)
              const past = t.getTime() <= Date.now() + 10 * 60000
              return (
                <TouchableOpacity key={i} disabled={past} style={[st.chip, slot === i && st.chipOn, past && { opacity: 0.3 }]} onPress={() => setSlot(i)} activeOpacity={0.85}>
                  <Text style={[st.chipText, slot === i && { color: '#fff' }]}>{timeLabel(t)}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {!counter && (
            <>
              <Text style={st.label}>{s.focus}</Text>
              <View style={st.wrap}>
                {FOCUS.map(f => (
                  <TouchableOpacity key={f} style={[st.chip, focus === f && st.chipOn]} onPress={() => setFocus(f)} activeOpacity={0.85}>
                    <Text style={[st.chipText, focus === f && { color: '#fff' }]}>{FOCUS_EMOJI[f]} {s[f]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity style={[st.btn, (!valid || busy) && { opacity: 0.5 }]} onPress={submit} disabled={!valid || busy} activeOpacity={0.85}>
            <Text style={st.btnText}>{counter ? s.send_counter : s.send_invite} · {dayLabel(start, s)} {timeLabel(start)}</Text>
          </TouchableOpacity>
          <View style={{ height: 24 + insets.bottom }} />
        </View>
      </View>
    </Modal>
  )
}

// ─── Shared workout log ───────────────────────────────────────────────────────
type Entry = { id: string, user_id: string, exercise: string, sets: number, reps: number, weight_kg: number }

export function LogSheet({ lang, session, myId, otherName, onClose }: {
  lang: string, session: SessionRow, myId: string, otherName: string, onClose: () => void
}) {
  const s = sessionStrings(lang)
  const insets = useSafeAreaInsets()
  const [entries, setEntries] = useState<Entry[]>([])
  const [exercise, setExercise] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [kg, setKg] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('workout_entries').select('*').eq('session_id', session.id).order('created_at', { ascending: true })
    setEntries((data as Entry[]) || [])
  }
  useEffect(() => {
    load()
    const ch = supabase.channel(`log:${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_entries', filter: `session_id=eq.${session.id}` }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session.id])

  const mine = entries.filter(e => e.user_id === myId)
  const theirs = entries.filter(e => e.user_id !== myId)
  const vol = (list: Entry[]) => Math.round(list.reduce((a, e) => a + e.sets * e.reps * Number(e.weight_kg), 0))
  const canAdd = exercise.trim().length > 0 && parseInt(sets) > 0 && parseInt(reps) > 0

  async function add() {
    if (!canAdd || busy) return
    setBusy(true)
    const { error } = await supabase.from('workout_entries').insert({
      session_id: session.id, user_id: myId, exercise: exercise.trim().slice(0, 40),
      sets: parseInt(sets), reps: parseInt(reps), weight_kg: parseFloat(kg.replace(',', '.')) || 0,
    })
    setBusy(false)
    if (error) { Alert.alert(s.err_generic); return }
    setExercise(''); setSets(''); setReps(''); setKg('')
    load()
  }
  async function remove(id: string) {
    await supabase.from('workout_entries').delete().eq('id', id)
    load()
  }

  const row = (e: Entry, own: boolean) => (
    <View key={e.id} style={st.entry}>
      <View style={{ flex: 1 }}>
        <Text style={st.entryName}>{e.exercise}</Text>
        <Text style={st.entrySub}>{e.sets} × {e.reps}{Number(e.weight_kg) > 0 ? ` · ${Number(e.weight_kg)} kg` : ''}</Text>
      </View>
      {own && <TouchableOpacity onPress={() => remove(e.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={{ color: '#b7c2bd', fontSize: 18 }}>✕</Text></TouchableOpacity>}
    </View>
  )

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[st.sheet, { maxHeight: '90%' }]}>
          <View style={st.grab} />
          <View style={st.head}>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>📝 {s.log_title}</Text>
              <Text style={st.sub}>{whenLabel(session.starts_at, s)} · {FOCUS_EMOJI[session.focus]} {s[session.focus]}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><Text style={st.close}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}>
            <View style={st.card}>
              <Text style={st.cardKicker}>{s.exercise}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
                {EXERCISES.map(x => (
                  <TouchableOpacity key={x} style={[st.chip, exercise === x && st.chipOn]} onPress={() => setExercise(x)} activeOpacity={0.85}>
                    <Text style={[st.chipText, exercise === x && { color: '#fff' }]}>{x}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput style={st.input} value={exercise} onChangeText={setExercise} placeholder={s.other_ex} placeholderTextColor="#9aa8a2" maxLength={40} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TextInput style={[st.input, st.num]} value={sets} onChangeText={setSets} placeholder={s.sets} placeholderTextColor="#9aa8a2" keyboardType="number-pad" maxLength={2} />
                <TextInput style={[st.input, st.num]} value={reps} onChangeText={setReps} placeholder={s.reps} placeholderTextColor="#9aa8a2" keyboardType="number-pad" maxLength={3} />
                <TextInput style={[st.input, st.num]} value={kg} onChangeText={setKg} placeholder="kg" placeholderTextColor="#9aa8a2" keyboardType="decimal-pad" maxLength={6} />
              </View>
              <TouchableOpacity style={[st.btn, (!canAdd || busy) && { opacity: 0.5 }]} onPress={add} disabled={!canAdd || busy} activeOpacity={0.85}>
                <Text style={st.btnText}>{s.add}</Text>
              </TouchableOpacity>
            </View>

            <View style={st.versus}>
              <View style={st.versusBox}><Text style={st.versusNum}>{vol(mine).toLocaleString()}</Text><Text style={st.versusLabel}>{s.you} · kg</Text></View>
              <Text style={{ color: '#9aa8a2', fontWeight: '800' }}>{s.volume}</Text>
              <View style={st.versusBox}><Text style={st.versusNum}>{vol(theirs).toLocaleString()}</Text><Text style={st.versusLabel}>{otherName.split(' ')[0]} · kg</Text></View>
            </View>

            <Text style={st.section}>{s.you}</Text>
            {mine.length === 0 ? <Text style={st.empty}>{s.nothing_logged}</Text> : mine.map(e => row(e, true))}
            <Text style={st.section}>{otherName.split(' ')[0]}</Text>
            {theirs.length === 0 ? <Text style={st.empty}>{s.nothing_logged}</Text> : theirs.map(e => row(e, false))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Bar under the chat header: plan / reply / countdown / confirm / log ─────────────
export function SessionBar({ lang, myId, matchId, otherName, sessions }: {
  lang: string, myId: string, matchId: string, otherName: string, sessions: SessionsApi
}) {
  const s = sessionStrings(lang)
  const [now, setNow] = useState(Date.now())
  const [plan, setPlan] = useState<null | 'new' | 'counter'>(null)
  const [log, setLog] = useState(false)
  const [stats, setStats] = useState<{ streak_weeks: number, total_sessions: number } | null>(null)
  const first = otherName.split(' ')[0]

  const mine = sessions.list.filter(x => x.match_id === matchId)
  const cur = mine.find(x => x.status === 'proposed' || x.status === 'confirmed') ?? mine.find(x => x.status === 'done')
  const doneCount = mine.filter(x => x.status === 'done').length

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])
  useEffect(() => {
    supabase.rpc('pair_stats', { p_match: matchId }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data
      if (row) setStats(row)
    })
  }, [matchId, doneCount])

  const act = async (id: string, action: string, startsAt?: string) => {
    const c = await sessions.respond(id, action, startsAt)
    if (c) Alert.alert(errText(c, s) || '')
    return c
  }

  const streakChip = stats && stats.streak_weeks > 0
    ? <View style={st.streak}><Text style={st.streakText}>🔥 {fmt(s.streak, { n: stats.streak_weeks })}</Text></View>
    : null

  let body: React.ReactElement
  if (!cur) {
    body = (
      <TouchableOpacity style={st.barRow} onPress={() => setPlan('new')} activeOpacity={0.8}>
        <Text style={st.barMain}>📅 {s.plan_session}</Text>
        {streakChip}
      </TouchableOpacity>
    )
  } else {
    const start = new Date(cur.starts_at).getTime()
    const when = whenLabel(cur.starts_at, s)
    const detail = `${FOCUS_EMOJI[cur.focus]} ${s[cur.focus]}${cur.gym_name ? ` · ${cur.gym_name}` : ''}`
    if (cur.status === 'proposed') {
      const forMe = cur.awaiting_id === myId
      body = (
        <View>
          <View style={st.barRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.barKicker}>{forMe ? fmt(s.suggested, { name: first }) : fmt(s.waiting_for, { name: first })}</Text>
              <Text style={st.barMain}>{when}</Text>
              <Text style={st.barSub} numberOfLines={1}>{detail}</Text>
            </View>
            {streakChip}
          </View>
          <View style={st.pills}>
            {forMe ? (
              <>
                <TouchableOpacity style={st.pillOn} onPress={() => act(cur.id, 'accept')}><Text style={st.pillOnText}>{s.accept}</Text></TouchableOpacity>
                <TouchableOpacity style={st.pill} onPress={() => setPlan('counter')}><Text style={st.pillText}>{s.other_time}</Text></TouchableOpacity>
                <TouchableOpacity style={st.pill} onPress={() => act(cur.id, 'decline')}><Text style={st.pillText}>{s.decline}</Text></TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={st.pill} onPress={() => act(cur.id, 'cancel')}><Text style={st.pillText}>{s.cancel}</Text></TouchableOpacity>
            )}
          </View>
        </View>
      )
    } else if (cur.status === 'confirmed') {
      const started = start <= now
      body = (
        <View>
          <View style={st.barRow}>
            <View style={{ flex: 1 }}>
              <Text style={[st.barKicker, { color: DEEP }]}>✅ {s.confirmed}{!started ? ` · ${fmt(s.in_x, { x: relative(start - now) })}` : ` · ${s.started}`}</Text>
              <Text style={st.barMain}>{when}</Text>
              <Text style={st.barSub} numberOfLines={1}>{detail}</Text>
            </View>
            {streakChip}
          </View>
          <View style={st.pills}>
            {started ? (
              cur.my_confirmed ? (
                <Text style={st.barSub}>{fmt(s.waiting_confirm, { name: first })}</Text>
              ) : (
                <>
                  <Text style={[st.barSub, { width: '100%', marginBottom: 6 }]}>{s.did_you_train}</Text>
                  <TouchableOpacity style={st.pillOn} onPress={() => act(cur.id, 'confirm')}><Text style={st.pillOnText}>{s.yes_we}</Text></TouchableOpacity>
                  <TouchableOpacity style={st.pill} onPress={() => act(cur.id, 'not_happened')}><Text style={st.pillText}>{s.not_happened}</Text></TouchableOpacity>
                </>
              )
            ) : (
              <TouchableOpacity style={st.pill} onPress={() => act(cur.id, 'cancel')}><Text style={st.pillText}>{s.cancel}</Text></TouchableOpacity>
            )}
            {(started || start - now < 2 * 3600000) && (
              <TouchableOpacity style={st.pill} onPress={() => setLog(true)}><Text style={st.pillText}>📝 {s.log_workout}</Text></TouchableOpacity>
            )}
          </View>
        </View>
      )
    } else {
      body = (
        <View>
          <View style={st.barRow}>
            <View style={{ flex: 1 }}>
              <Text style={[st.barKicker, { color: DEEP }]}>{s.session_done}</Text>
              <Text style={st.barMain}>{when}</Text>
            </View>
            {streakChip}
          </View>
          <View style={st.pills}>
            <TouchableOpacity style={st.pillOn} onPress={() => setLog(true)}><Text style={st.pillOnText}>📝 {s.log_workout}</Text></TouchableOpacity>
            <TouchableOpacity style={st.pill} onPress={() => setPlan('new')}><Text style={st.pillText}>📅 {s.plan_session}</Text></TouchableOpacity>
          </View>
        </View>
      )
    }
  }

  return (
    <>
      <View style={[st.bar, cur?.status === 'proposed' && cur.awaiting_id === myId && { backgroundColor: '#FFF6E5' }]}>{body}</View>
      <LogbookRow lang={lang} matchId={matchId} myId={myId} onPress={() => setLog(true)} />
      {plan && (
        <PlanSheet
          lang={lang} counter={plan === 'counter'} otherName={first}
          onSubmit={(iso, focus) => plan === 'counter' && cur ? sessions.respond(cur.id, 'counter', iso) : sessions.propose(matchId, iso, focus)}
          onClose={() => setPlan(null)}
        />
      )}
      {log && <Logbook lang={lang} matchId={matchId} myId={myId} otherName={otherName} onClose={() => setLog(false)} />}
    </>
  )
}

// ─── "Upcoming" strip at the top of the Chats tab ─────────────────────────────────
export function UpcomingStrip({ lang, items, myId, onOpen }: {
  lang: string, items: SessionRow[], myId: string | undefined, onOpen: (matchId: string) => void
}) {
  const s = sessionStrings(lang)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])
  if (items.length === 0) return null
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={st.stripTitle}>{s.upcoming}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {items.map(x => {
          const start = new Date(x.starts_at).getTime()
          const forMe = x.status === 'proposed' && x.awaiting_id === myId
          const soon = x.status === 'confirmed' && start > now && start - now < 3 * 3600000
          return (
            <TouchableOpacity key={x.id} style={[st.stripCard, forMe && { backgroundColor: '#FFF6E5' }]} onPress={() => onOpen(x.match_id)} activeOpacity={0.85}>
              <Face name={x.other_name || '?'} url={x.other_avatar} size={40} />
              <View style={{ maxWidth: 150 }}>
                <Text style={st.stripWhen} numberOfLines={1}>{whenLabel(x.starts_at, s)}</Text>
                <Text style={st.stripSub} numberOfLines={1}>{FOCUS_EMOJI[x.focus]} {s[x.focus]} · {fmt(s.with, { name: (x.other_name || '').split(' ')[0] })}</Text>
                {x.status === 'proposed' && <Text style={[st.stripTag, { color: AMBER }]}>{forMe ? s.reply : s.pending}</Text>}
                {soon && <Text style={[st.stripTag, { color: GREEN }]}>{fmt(s.in_x, { x: relative(start - now) })}</Text>}
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  grab: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: '#d9e2de', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.4 },
  sub: { marginTop: 2, fontSize: 13.5, color: '#6f7f79' },
  close: { fontSize: 22, color: '#9aa8a2', fontWeight: '700' },
  label: { marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: '700', color: '#5f6f69' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#cfe3da' },
  chipOn: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 14.5, fontWeight: '700', color: '#1a1a1a' },
  btn: { marginTop: 18, backgroundColor: GREEN, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  card: { backgroundColor: MINT, borderRadius: 22, padding: 16, marginTop: 8 },
  cardKicker: { fontSize: 12, fontWeight: '800', color: '#6f7f79', letterSpacing: 0.8, textTransform: 'uppercase' },
  input: { marginTop: 10, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#d9e8e1', color: '#1a1a1a' },
  num: { flex: 1, marginTop: 0, textAlign: 'center' },
  versus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingHorizontal: 6 },
  versusBox: { alignItems: 'center', minWidth: 90 },
  versusNum: { fontSize: 24, fontWeight: '800', color: DEEP },
  versusLabel: { marginTop: 2, fontSize: 12.5, color: '#6f7f79', fontWeight: '600' },
  section: { marginTop: 20, marginBottom: 6, fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  empty: { fontSize: 14, color: '#8a9a94', paddingVertical: 6 },
  entry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eef3f0' },
  entryName: { fontSize: 15.5, fontWeight: '700', color: '#1a1a1a' },
  entrySub: { marginTop: 2, fontSize: 13.5, color: '#6f7f79' },
  bar: { marginHorizontal: 12, marginTop: 8, backgroundColor: MINT, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barKicker: { fontSize: 12, fontWeight: '800', color: AMBER, letterSpacing: 0.3 },
  barMain: { fontSize: 15.5, fontWeight: '800', color: '#1a1a1a', marginTop: 1 },
  barSub: { fontSize: 13, color: '#6f7f79', marginTop: 1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' },
  pill: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: '#cfe3da' },
  pillText: { fontSize: 13.5, fontWeight: '700', color: '#1a1a1a' },
  pillOn: { backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  pillOnText: { fontSize: 13.5, fontWeight: '800', color: '#fff' },
  streak: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#cfe3da' },
  streakText: { fontSize: 12.5, fontWeight: '800', color: DEEP },
  stripTitle: { paddingHorizontal: 20, marginBottom: 10, fontSize: 13, fontWeight: '800', color: '#6f7f79', letterSpacing: 0.8, textTransform: 'uppercase' },
  stripCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: MINT, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 },
  stripWhen: { fontSize: 14.5, fontWeight: '800', color: '#1a1a1a' },
  stripSub: { fontSize: 12.5, color: '#6f7f79', marginTop: 1 },
  stripTag: { fontSize: 12, fontWeight: '800', marginTop: 2 },
})
