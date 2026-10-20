import React, { useContext, useEffect, useMemo, useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Keyboard,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native'
import { SafeAreaInsetsContext } from 'react-native-safe-area-context'
import { useLogbook, usePendingCount, todayBrussels, type LogEntry, type WorkoutDay, type LastSet } from '../lib/logbook'
import { logbookStrings, lfmt } from '../lib/logbookStrings'
import { exerciseName, searchExercises, type Group } from '../lib/exercises'

const GREEN = '#1D9E75'
const DEEP = '#0E6B4F'
const MINT = '#EAF6F1'
const AMBER = '#E8960C'
const DANGER = '#D64545'

type Api = ReturnType<typeof useLogbook>

function kgText(n: number) { return String(Math.round(n * 10) / 10) }
function liftText(e: { sets: number, reps: number, weight_kg: number }) {
  return `${e.sets} × ${e.reps}${e.weight_kg > 0 ? ` · ${kgText(e.weight_kg)} kg` : ''}`
}
function volumeOf(list: LogEntry[]) {
  return list.filter(e => e.status === 'confirmed').reduce((a, e) => a + e.sets * e.reps * e.weight_kg, 0)
}
function tn(kg: number) { return (Math.round(kg / 100) / 10).toFixed(1) }
function dayText(day: string, lang: string) {
  try { return new Date(`${day}T12:00:00`).toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' }) } catch { return day }
}
function groupEntries(entries: LogEntry[]) {
  const map = new Map<string, LogEntry[]>()
  entries.forEach(e => { const k = e.exercise_key || e.exercise; map.set(k, [...(map.get(k) || []), e]) })
  return Array.from(map.values())
}

// Android draws edge to edge, so the keyboard covers the sheet unless we lift it ourselves.
function useKb() {
  const [h, setH] = useState(0)
  useEffect(() => {
    if (Platform.OS !== 'android') return
    const a = Keyboard.addListener('keyboardDidShow', e => setH(e.endCoordinates.height))
    const b = Keyboard.addListener('keyboardDidHide', () => setH(0))
    return () => { a.remove(); b.remove() }
  }, [])
  return h
}

// ─── Entry point row shown under the chat header ─────────────────────────────────────
export function LogbookRow({ lang, matchId, myId, onPress }: { lang: string, matchId: string, myId: string, onPress: () => void }) {
  const L = logbookStrings(lang)
  const n = usePendingCount(matchId, myId)
  return (
    <TouchableOpacity style={st.rowBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={st.rowText}>📈 {L.title}</Text>
      {n > 0 && <View style={st.badge}><Text style={st.badgeText}>{n}</Text></View>}
      <View style={{ flex: 1 }} />
      <Text style={st.chev}>›</Text>
    </TouchableOpacity>
  )
}

// ─── The Logbook ─────────────────────────────────────────────────────────────────────
export default function Logbook({ lang, matchId, myId, otherName, onClose }: {
  lang: string, matchId: string, myId: string, otherName: string, onClose: () => void
}) {
  const L = logbookStrings(lang)
  const first = otherName.split(' ')[0]
  const lb = useLogbook(matchId)
  const insets = useContext(SafeAreaInsetsContext)
  const kb = useKb()
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  const today = todayBrussels()
  const todayDay = lb.days.find(d => d.day === today)
  const earlier = lb.days.filter(d => d.day !== today && d.entries.length > 0)
  const pendingForMe = lb.days.flatMap(d => d.entries).filter(e => e.user_id === myId && e.status === 'pending')
  const recentKeys = useMemo(() => {
    const all = lb.days.flatMap(d => d.entries).filter(e => e.exercise_key).sort((a, b) => b.created_at.localeCompare(a.created_at))
    return Array.from(new Set(all.map(e => e.exercise_key as string))).slice(0, 6)
  }, [lb.days])
  const bottom = kb > 0 ? kb : (insets?.bottom ?? 0)

  function remove(e: LogEntry) {
    Alert.alert(L.delete_q, undefined, [
      { text: L.cancel, style: 'cancel' },
      { text: L.delete, style: 'destructive', onPress: async () => { const err = await lb.respond(e.id, 'delete'); if (err) Alert.alert(L[err]) } },
    ])
  }

  const canDelete = (e: LogEntry) => e.user_id === myId || (e.logged_by === myId && e.status === 'pending')

  function dayBlocks(d: WorkoutDay) {
    return groupEntries(d.entries).map(list => {
      const mine = list.filter(e => e.user_id === myId)
      const theirs = list.filter(e => e.user_id !== myId)
      const name = exerciseName(list[0].exercise_key, lang, list[0].exercise)
      const col = (who: string, items: LogEntry[]) => (
        <View style={{ flex: 1 }}>
          <Text style={st.colWho}>{who}</Text>
          {items.length === 0 ? <Text style={st.dash}>—</Text> : items.map(e => (
            <View key={e.id} style={[st.chipLift, e.status === 'pending' && st.chipPending]}>
              <View style={{ flex: 1 }}>
                <Text style={st.liftText}>{e.is_pr ? '🔥 ' : ''}{liftText(e)}</Text>
                {e.status === 'pending' && (
                  <Text style={st.pendNote}>{e.user_id === myId ? lfmt(L.for_you, { name: first }) : lfmt(L.waiting_for, { name: first })}</Text>
                )}
              </View>
              {canDelete(e) && (
                <TouchableOpacity onPress={() => remove(e)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={st.x}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )
      return (
        <View key={list[0].exercise_key || list[0].exercise} style={st.block}>
          <Text style={st.blockName}>{name}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            {col(L.you, mine)}
            {col(first, theirs)}
          </View>
        </View>
      )
    })
  }

  const volLine = (d: WorkoutDay) => {
    const a = volumeOf(d.entries.filter(e => e.user_id === myId))
    const b = volumeOf(d.entries.filter(e => e.user_id !== myId))
    if (a + b === 0) return ''
    return `${L.you} ${tn(a)} t · ${first} ${tn(b)} t`
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={adding ? () => setAdding(false) : onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[st.sheet, { height: '92%', paddingBottom: bottom + 12 }]}>
          <View style={st.grab} />
          <View style={st.head}>
            {adding && (
              <TouchableOpacity onPress={() => setAdding(false)} style={{ marginRight: 12 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={st.back}>‹</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={st.title}>📈 {adding ? L.add : L.title}</Text>
              {!adding && <Text style={st.sub}>{L.together}: {lfmt(L.tonnes, { n: tn(lb.volume) })} · {L.you} + {first}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><Text style={st.close}>✕</Text></TouchableOpacity>
          </View>

          {adding ? (
            <AddLift lang={lang} myId={myId} first={first} lb={lb} recentKeys={recentKeys} onDone={() => setAdding(false)} />
          ) : (
            <>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                {lb.loading && <ActivityIndicator color={GREEN} style={{ marginTop: 30 }} />}

                {pendingForMe.map(e => (
                  <PendingCard key={e.id} lang={lang} entry={e} first={first} onAccept={() => lb.respond(e.id, 'accept')}
                    onEdit={(v) => lb.respond(e.id, 'edit', v)} onDecline={() => lb.respond(e.id, 'delete')} />
                ))}

                {!lb.loading && (
                  <>
                    <View style={st.secRow}>
                      <Text style={st.section}>{L.today}</Text>
                      {todayDay && volLine(todayDay) ? <Text style={st.secMeta}>{volLine(todayDay)}</Text> : null}
                    </View>
                    {todayDay && todayDay.entries.length > 0 ? dayBlocks(todayDay) : (
                      <View style={st.emptyCard}>
                        <Text style={st.emptyTitle}>{L.empty_title}</Text>
                        <Text style={st.emptySub}>{lfmt(L.empty_sub, { name: first })}</Text>
                      </View>
                    )}

                    {earlier.length > 0 && <Text style={[st.section, { marginTop: 24 }]}>{L.earlier}</Text>}
                    {earlier.map(d => (
                      <View key={d.id} style={st.dayCard}>
                        <TouchableOpacity style={st.dayHead} onPress={() => setOpen(open === d.id ? null : d.id)} activeOpacity={0.8}>
                          <View style={{ flex: 1 }}>
                            <Text style={st.dayTitle}>{dayText(d.day, lang)}</Text>
                            <Text style={st.daySub}>{lfmt(L.lifts, { n: d.entries.filter(e => e.status === 'confirmed').length })}{volLine(d) ? ` · ${volLine(d)}` : ''}</Text>
                          </View>
                          <Text style={st.chev}>{open === d.id ? '⌃' : '⌄'}</Text>
                        </TouchableOpacity>
                        {open === d.id && <View style={{ marginTop: 6 }}>{dayBlocks(d)}</View>}
                      </View>
                    ))}
                    {lb.days.length === 0 && <Text style={st.hint}>{L.no_history}</Text>}
                  </>
                )}
              </ScrollView>
              <TouchableOpacity style={st.addBtn} onPress={() => setAdding(true)} activeOpacity={0.85}>
                <Text style={st.addBtnText}>＋ {L.add}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── A lift your partner logged for you ──────────────────────────────────────────────
function PendingCard({ lang, entry, first, onAccept, onEdit, onDecline }: {
  lang: string, entry: LogEntry, first: string,
  onAccept: () => Promise<string | null>, onEdit: (v: { sets: number, reps: number, kg: number }) => Promise<string | null>, onDecline: () => Promise<string | null>
}) {
  const L = logbookStrings(lang)
  const [editing, setEditing] = useState(false)
  const [sets, setSets] = useState(String(entry.sets))
  const [reps, setReps] = useState(String(entry.reps))
  const [kg, setKg] = useState(kgText(entry.weight_kg))
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<string | null>) {
    setBusy(true)
    const err = await fn()
    setBusy(false)
    if (err) Alert.alert(L[err])
  }
  function saveEdit() {
    const s = parseInt(sets, 10), r = parseInt(reps, 10), w = parseFloat(kg.replace(',', '.')) || 0
    if (!(s >= 1 && s <= 20 && r >= 1 && r <= 100 && w >= 0 && w <= 1000)) { Alert.alert(L.err_bad); return }
    run(() => onEdit({ sets: s, reps: r, kg: w }))
  }

  return (
    <View style={st.pendCard}>
      <Text style={st.pendKicker}>⏳ {lfmt(L.for_you, { name: first })}</Text>
      <Text style={st.pendName}>{exerciseName(entry.exercise_key, lang, entry.exercise)}</Text>
      {editing ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TextInput style={st.smallInput} value={sets} onChangeText={setSets} keyboardType="number-pad" maxLength={2} />
          <TextInput style={st.smallInput} value={reps} onChangeText={setReps} keyboardType="number-pad" maxLength={3} />
          <TextInput style={st.smallInput} value={kg} onChangeText={setKg} keyboardType="decimal-pad" maxLength={6} />
        </View>
      ) : <Text style={st.pendLift}>{liftText(entry)}</Text>}
      <View style={st.pendBtns}>
        {editing ? (
          <TouchableOpacity style={[st.pillOn, busy && { opacity: 0.6 }]} disabled={busy} onPress={saveEdit}><Text style={st.pillOnText}>{L.save_confirm}</Text></TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={[st.pillOn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => run(onAccept)}><Text style={st.pillOnText}>✓ {L.confirm}</Text></TouchableOpacity>
            <TouchableOpacity style={st.pill} disabled={busy} onPress={() => setEditing(true)}><Text style={st.pillText}>✎ {L.edit}</Text></TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={st.pill} disabled={busy} onPress={() => run(onDecline)}><Text style={[st.pillText, { color: DANGER }]}>{L.decline}</Text></TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Add a lift: for you, or for your partner ────────────────────────────────────────
function Stepper({ label, value, onChange, step, min, max }: {
  label: string, value: string, onChange: (v: string) => void, step: number, min: number, max: number
}) {
  const num = parseFloat(value.replace(',', '.')) || 0
  const bump = (d: number) => onChange(kgText(Math.min(max, Math.max(min, num + d))))
  return (
    <View style={{ flex: 1 }}>
      <Text style={st.stepLabel}>{label}</Text>
      <View style={st.stepRow}>
        <TouchableOpacity style={st.stepBtn} onPress={() => bump(-step)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}><Text style={st.stepBtnText}>−</Text></TouchableOpacity>
        <TextInput style={st.stepInput} value={value} onChangeText={onChange} keyboardType="decimal-pad" maxLength={6} selectTextOnFocus />
        <TouchableOpacity style={st.stepBtn} onPress={() => bump(step)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}><Text style={st.stepBtnText}>＋</Text></TouchableOpacity>
      </View>
    </View>
  )
}

function AddLift({ lang, myId, first, lb, recentKeys, onDone }: {
  lang: string, myId: string, first: string, lb: Api, recentKeys: string[], onDone: () => void
}) {
  const L = logbookStrings(lang)
  const [forOther, setForOther] = useState(false)
  const [key, setKey] = useState('')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<Group | 'all'>('all')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('8')
  const [kg, setKg] = useState('')
  const [last, setLast] = useState<LastSet[]>([])
  const [prefilled, setPrefilled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')

  useEffect(() => {
    if (!key) { setLast([]); return }
    let live = true
    lb.lastTime(key).then(r => { if (live) setLast(r) })
    return () => { live = false }
  }, [key])

  // "Last time" for whoever the lift is for becomes the starting point: just beat it.
  useEffect(() => {
    if (!key) return
    const mine = last.find(r => (r.user_id === myId) === !forOther)
    if (mine) { setSets(String(mine.sets)); setReps(String(mine.reps)); setKg(kgText(mine.weight_kg)); setPrefilled(true) }
    else { setSets('3'); setReps('8'); setKg(''); setPrefilled(false) }
  }, [key, last, forOther])

  const results = useMemo(() => searchExercises(query, lang, group).slice(0, 12), [query, lang, group])
  const groups: (Group | 'all')[] = ['all', 'push', 'pull', 'legs', 'core']

  async function save() {
    if (!key) { Alert.alert(L.pick_first); return }
    const s = parseInt(sets, 10), r = parseInt(reps, 10), w = parseFloat(kg.replace(',', '.')) || 0
    if (!(s >= 1 && s <= 20 && r >= 1 && r <= 100 && w >= 0 && w <= 1000)) { Alert.alert(L.err_bad); return }
    setBusy(true)
    const res = await lb.logSet(forOther, key, s, r, w)
    setBusy(false)
    if (res.error) { Alert.alert(L[res.error]); return }
    Keyboard.dismiss()
    setFlash(forOther ? lfmt(L.sent, { name: first }) : res.isPr ? `🔥 ${L.pr_badge}! ${L.saved}` : L.saved)
    setTimeout(() => setFlash(''), 2400)
  }

  const lastDay = last.length ? last.map(r => r.day).sort().reverse()[0] : ''

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
      <Text style={st.label}>{L.who}</Text>
      <View style={st.seg}>
        <TouchableOpacity style={[st.segBtn, !forOther && st.segOn]} onPress={() => setForOther(false)} activeOpacity={0.85}>
          <Text style={[st.segText, !forOther && { color: '#fff' }]}>{L.you}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.segBtn, forOther && st.segOn]} onPress={() => setForOther(true)} activeOpacity={0.85}>
          <Text style={[st.segText, forOther && { color: '#fff' }]}>{first}</Text>
        </TouchableOpacity>
      </View>

      <Text style={st.label}>{L.exercise}</Text>
      {key ? (
        <View style={st.picked}>
          <Text style={st.pickedName}>{exerciseName(key, lang)}</Text>
          <TouchableOpacity onPress={() => { setKey(''); setQuery('') }}><Text style={st.change}>{L.change}</Text></TouchableOpacity>
        </View>
      ) : (
        <View>
          {recentKeys.length > 0 && !query && (
            <View style={{ marginBottom: 10 }}>
              <Text style={st.miniLabel}>{L.recent}</Text>
              <View style={st.wrap}>
                {recentKeys.map(k => (
                  <TouchableOpacity key={k} style={st.chip} onPress={() => setKey(k)} activeOpacity={0.85}><Text style={st.chipText}>{exerciseName(k, lang)}</Text></TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <TextInput style={st.input} value={query} onChangeText={setQuery} placeholder={L.search_ex} placeholderTextColor="#9aa8a2" autoCorrect={false} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }} keyboardShouldPersistTaps="handled">
            {groups.map(g => (
              <TouchableOpacity key={g} style={[st.chip, group === g && st.chipOn]} onPress={() => setGroup(g)} activeOpacity={0.85}>
                <Text style={[st.chipText, group === g && { color: '#fff' }]}>{L[`g_${g}`]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ marginTop: 6 }}>
            {results.map(ex => (
              <TouchableOpacity key={ex.key} style={st.result} onPress={() => { setKey(ex.key); Keyboard.dismiss() }} activeOpacity={0.7}>
                <Text style={st.resultText}>{exerciseName(ex.key, lang)}</Text>
                <Text style={st.resultGroup}>{L[`g_${ex.group}`]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!!key && (
        <>
          <View style={st.lastCard}>
            {last.length > 0 ? (
              <>
                <Text style={st.lastKicker}>{lfmt(L.last_time, { date: dayText(lastDay, lang) })}</Text>
                {last.map(r => (
                  <Text key={r.user_id} style={st.lastLine}>{r.user_id === myId ? L.you : first}: {liftText(r)}</Text>
                ))}
                {prefilled && <Text style={st.lastHint}>{L.prefilled}</Text>}
              </>
            ) : <Text style={st.lastHint}>{L.no_last}</Text>}
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            <Stepper label={L.sets} value={sets} onChange={setSets} step={1} min={1} max={20} />
            <Stepper label={L.reps} value={reps} onChange={setReps} step={1} min={1} max={100} />
          </View>
          <View style={{ marginTop: 12 }}>
            <Stepper label={L.kg} value={kg} onChange={setKg} step={2.5} min={0} max={1000} />
          </View>

          <TouchableOpacity style={[st.saveBtn, busy && { opacity: 0.6 }]} onPress={save} disabled={busy} activeOpacity={0.85}>
            <Text style={st.saveText}>{forOther ? lfmt(L.save_other, { name: first }) : L.save_me}</Text>
          </TouchableOpacity>
          {!!flash && <Text style={st.flash}>{flash}</Text>}
          <TouchableOpacity style={st.doneBtn} onPress={onDone} activeOpacity={0.8}><Text style={st.doneText}>{L.done}</Text></TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  grab: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: '#d9e2de', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.4 },
  sub: { marginTop: 2, fontSize: 13.5, color: '#6f7f79' },
  close: { fontSize: 22, color: '#9aa8a2', fontWeight: '700' },
  back: { fontSize: 30, color: GREEN, fontWeight: '700', marginTop: -6 },
  rowBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginTop: 6, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#cfe3da', paddingHorizontal: 14, paddingVertical: 9 },
  rowText: { fontSize: 14, fontWeight: '800', color: DEEP },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  chev: { fontSize: 20, color: '#9aa8a2', fontWeight: '700' },
  secRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  section: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  secMeta: { fontSize: 12.5, color: '#6f7f79', fontWeight: '600' },
  block: { backgroundColor: MINT, borderRadius: 18, padding: 14, marginBottom: 10 },
  blockName: { fontSize: 15.5, fontWeight: '800', color: '#1a1a1a' },
  colWho: { fontSize: 11.5, fontWeight: '800', color: '#6f7f79', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  dash: { color: '#b7c2bd', fontSize: 18, fontWeight: '700' },
  chipLift: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6, borderWidth: 1, borderColor: '#d9e8e1' },
  chipPending: { borderStyle: 'dashed', borderColor: AMBER, backgroundColor: '#FFF9EE' },
  liftText: { fontSize: 14.5, fontWeight: '700', color: '#1a1a1a' },
  pendNote: { fontSize: 11.5, color: AMBER, fontWeight: '600', marginTop: 2 },
  x: { color: '#b7c2bd', fontSize: 16, paddingLeft: 8 },
  emptyCard: { backgroundColor: MINT, borderRadius: 18, padding: 18 },
  emptyTitle: { fontSize: 15.5, fontWeight: '800', color: '#1a1a1a' },
  emptySub: { marginTop: 4, fontSize: 13.5, color: '#6f7f79' },
  hint: { textAlign: 'center', color: '#8a9a94', fontSize: 14, marginTop: 24 },
  dayCard: { borderWidth: 1, borderColor: '#e3eee9', borderRadius: 16, padding: 12, marginTop: 8 },
  dayHead: { flexDirection: 'row', alignItems: 'center' },
  dayTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  daySub: { marginTop: 2, fontSize: 12.5, color: '#6f7f79' },
  addBtn: { marginTop: 8, backgroundColor: GREEN, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pendCard: { backgroundColor: '#FFF6E5', borderRadius: 18, padding: 14, marginTop: 6, marginBottom: 6, borderWidth: 1, borderColor: '#f3dca8' },
  pendKicker: { fontSize: 12, fontWeight: '800', color: AMBER, letterSpacing: 0.3 },
  pendName: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginTop: 4 },
  pendLift: { fontSize: 14.5, color: '#4b5a54', marginTop: 2, fontWeight: '600' },
  pendBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  pill: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: '#e6d6b0' },
  pillText: { fontSize: 13.5, fontWeight: '700', color: '#1a1a1a' },
  pillOn: { backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  pillOnText: { fontSize: 13.5, fontWeight: '800', color: '#fff' },
  smallInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 9, textAlign: 'center', fontSize: 15, borderWidth: 1, borderColor: '#e6d6b0', color: '#1a1a1a' },
  label: { marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: '800', color: '#5f6f69' },
  miniLabel: { fontSize: 12, fontWeight: '700', color: '#8a9a94', marginBottom: 6 },
  seg: { flexDirection: 'row', backgroundColor: '#eef3f0', borderRadius: 14, padding: 4 },
  segBtn: { flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: 'center' },
  segOn: { backgroundColor: GREEN },
  segText: { fontSize: 14.5, fontWeight: '800', color: '#4b5a54' },
  input: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#d9e8e1', color: '#1a1a1a' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: '#cfe3da' },
  chipOn: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  result: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#eef3f0' },
  resultText: { flex: 1, fontSize: 15.5, fontWeight: '600', color: '#1a1a1a' },
  resultGroup: { fontSize: 12, color: '#9aa8a2', fontWeight: '700' },
  picked: { flexDirection: 'row', alignItems: 'center', backgroundColor: MINT, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  pickedName: { flex: 1, fontSize: 16, fontWeight: '800', color: DEEP },
  change: { fontSize: 13.5, fontWeight: '800', color: GREEN },
  lastCard: { marginTop: 14, backgroundColor: MINT, borderRadius: 16, padding: 14 },
  lastKicker: { fontSize: 12, fontWeight: '800', color: '#6f7f79', letterSpacing: 0.4, textTransform: 'uppercase' },
  lastLine: { marginTop: 5, fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  lastHint: { marginTop: 6, fontSize: 13, color: '#6f7f79', fontWeight: '600' },
  stepLabel: { fontSize: 12.5, fontWeight: '800', color: '#5f6f69', marginBottom: 6 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 44, height: 46, borderRadius: 13, backgroundColor: '#eef3f0', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 22, fontWeight: '800', color: DEEP },
  stepInput: { flex: 1, height: 46, backgroundColor: '#fff', borderRadius: 13, textAlign: 'center', fontSize: 18, fontWeight: '800', borderWidth: 1, borderColor: '#d9e8e1', color: '#1a1a1a', paddingVertical: 0 },
  saveBtn: { marginTop: 18, backgroundColor: GREEN, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  flash: { marginTop: 10, textAlign: 'center', fontSize: 14.5, fontWeight: '800', color: DEEP },
  doneBtn: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  doneText: { fontSize: 15, fontWeight: '800', color: '#6f7f79' },
})
