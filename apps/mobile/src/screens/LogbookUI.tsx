import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Keyboard,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native'
import { SafeAreaInsetsContext } from 'react-native-safe-area-context'
import {
  useLogbook, usePendingCount, todayBrussels, KINDS, LABELS,
  type LogEntry, type WorkoutDay, type LastSet, type Kind, type SetInput,
} from '../lib/logbook'
import { logbookStrings, lfmt } from '../lib/logbookStrings'
import { exerciseName, searchExercises, type Group } from '../lib/exercises'
import { StreakCard } from './StreakUI'
import { RestBar } from './RestUI'
import { haptic } from '../lib/haptics'

const GREEN = '#1D9E75'
const DEEP = '#0E6B4F'
const MINT = '#EAF6F1'
const AMBER = '#E8960C'
const DANGER = '#D64545'
const PURPLE = '#6B46C1'

type Api = ReturnType<typeof useLogbook>
type Row = { id: number, kg: string, reps: string, kind: Kind }
type Preset = { key: string, forOther: boolean, seed?: { kg: string, reps: string, kind: Kind } }

const KIND_STYLE: Record<Kind, { bg: string, fg: string, tag: string }> = {
  work: { bg: '#DDEFE7', fg: DEEP, tag: '' },
  warmup: { bg: '#FFF1CF', fg: AMBER, tag: 'W' },
  drop: { bg: '#EDE6FB', fg: PURPLE, tag: 'D' },
  fail: { bg: '#FBE3E3', fg: DANGER, tag: 'F' },
}

function kgText(n: number) { return String(Math.round(n * 10) / 10) }
function whole(n: number) { return String(Math.round(n)) }
function clamp(n: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, n)) }
function e1rm(kg: number, reps: number) { return kg * (1 + reps / 30) }

function setText(e: { sets: number, reps: number, weight_kg: number }, bw: string) {
  const w = e.weight_kg > 0 ? `${kgText(e.weight_kg)} kg` : bw
  return e.sets > 1 ? `${e.sets} × ${e.reps} · ${w}` : `${w} × ${e.reps}`
}
function volumeOf(list: LogEntry[]) {
  return list.filter(e => e.status === 'confirmed' && e.kind !== 'warmup').reduce((a, e) => a + e.sets * e.reps * e.weight_kg, 0)
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
function parseRows(rows: Row[]): SetInput[] | null {
  const out: SetInput[] = []
  for (const r of rows) {
    const reps = parseInt(r.reps, 10)
    const kg = r.kg.trim() === '' ? 0 : parseFloat(r.kg.replace(',', '.'))
    if (!(reps >= 1 && reps <= 100) || !(kg >= 0 && kg <= 1000)) return null
    out.push({ reps, kg, kind: r.kind })
  }
  return out.length >= 1 && out.length <= 20 ? out : null
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

function KindBadge({ kind, n, onPress }: { kind: Kind, n: number, onPress?: () => void }) {
  const k = KIND_STYLE[kind]
  const inner = (
    <View style={[st.badgeSet, { backgroundColor: k.bg }]}>
      <Text style={[st.badgeSetText, { color: k.fg }]}>{k.tag || n}</Text>
    </View>
  )
  return onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.7} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>{inner}</TouchableOpacity> : inner
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
  const [adding, setAdding] = useState<Preset | { key?: undefined } | null>(null)
  const [editing, setEditing] = useState<LogEntry | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const today = todayBrussels()
  const todayDay = lb.days.find(d => d.day === today)
  const earlier = lb.days.filter(d => d.day !== today && d.entries.length > 0)
  const pending = lb.days.flatMap(d => d.entries).filter(e => e.user_id === myId && e.status === 'pending')
  const pendingGroups = groupEntries(pending)
  const recentKeys = useMemo(() => {
    const all = lb.days.flatMap(d => d.entries).filter(e => e.exercise_key).sort((a, b) => b.created_at.localeCompare(a.created_at))
    return Array.from(new Set(all.map(e => e.exercise_key as string))).slice(0, 6)
  }, [lb.days])
  const bottom = kb > 0 ? kb : (insets?.bottom ?? 0)

  const canEdit = (e: LogEntry) => e.user_id === myId || (e.logged_by === myId && e.status === 'pending')
  const flashErr = (err: string | null) => { if (err) Alert.alert(L[err]) }

  function removeBlock(d: WorkoutDay, key: string) {
    Alert.alert(L.remove_q, undefined, [
      { text: L.cancel, style: 'cancel' },
      { text: L.remove_mine, style: 'destructive', onPress: async () => flashErr(await lb.respondBlock(d.id, key, 'delete')) },
    ])
  }

  function addToBlock(key: string, mine: LogEntry[]) {
    const m = mine[mine.length - 1]
    setAdding({ key, forOther: false, seed: m ? { kg: kgText(m.weight_kg), reps: String(m.reps), kind: 'work' } : undefined })
  }

  function dayBlocks(d: WorkoutDay, isToday: boolean) {
    return groupEntries(d.entries).map(list => {
      const exKey = list[0].exercise_key
      const key = exKey || list[0].exercise
      const mine = list.filter(e => e.user_id === myId)
      const theirs = list.filter(e => e.user_id !== myId)
      const name = exerciseName(exKey, lang, list[0].exercise)
      const hasPr = list.some(e => e.is_pr && e.status === 'confirmed')
      const col = (who: string, items: LogEntry[]) => {
        const vol = volumeOf(items)
        return (
          <View style={{ flex: 1 }}>
            <Text style={st.colWho}>{who}</Text>
            {items.length === 0 ? <Text style={st.dash}>—</Text> : items.map((e, i) => {
              const editable = canEdit(e)
              return (
                <TouchableOpacity key={e.id} disabled={!editable} onPress={() => setEditing(e)} activeOpacity={0.7}
                  style={[st.setRow, e.status === 'pending' && st.chipPending]}>
                  <KindBadge kind={e.kind} n={i + 1} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={st.liftText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{e.is_pr ? '🔥 ' : ''}{setText(e, L.bw)}</Text>
                    {e.status === 'pending' && (
                      <Text style={st.pendNote}>{e.user_id === myId ? lfmt(L.for_you, { name: first }) : lfmt(L.waiting_for, { name: first })}</Text>
                    )}
                  </View>
                  {editable && <Text style={st.pencil}>✎</Text>}
                </TouchableOpacity>
              )
            })}
            {vol > 0 && <Text style={st.colVol}>Σ {whole(vol)} kg</Text>}
          </View>
        )
      }
      return (
        <View key={`${d.id}:${key}`} style={st.block}>
          <View style={st.blockHead}>
            <Text style={[st.blockName, { flex: 1 }]}>{hasPr ? '🔥 ' : ''}{name}</Text>
            {isToday && exKey && (
              <TouchableOpacity style={st.miniPill} onPress={() => addToBlock(exKey, mine)} activeOpacity={0.8}>
                <Text style={st.miniPillText}>{L.add_set_short}</Text>
              </TouchableOpacity>
            )}
            {exKey && (
              <TouchableOpacity onPress={() => removeBlock(d, exKey)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ paddingLeft: 12 }}>
                <Text style={st.dots}>⋯</Text>
              </TouchableOpacity>
            )}
          </View>
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

  const labelName = (l: string | null) => (l ? L[`lb_${l}`] : '')

  return (
    <Modal visible transparent animationType="slide" onRequestClose={editing ? () => setEditing(null) : adding ? () => setAdding(null) : onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[st.sheet, { height: '92%', paddingBottom: bottom + 12 }]}>
          <View style={st.grab} />
          <View style={st.head}>
            {adding && (
              <TouchableOpacity onPress={() => setAdding(null)} style={{ marginRight: 12 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
            <SetBuilder lang={lang} myId={myId} first={first} lb={lb} recentKeys={recentKeys}
              preset={'key' in adding && adding.key ? (adding as Preset) : undefined} onDone={() => setAdding(null)} />
          ) : (
            <>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                {lb.loading && <ActivityIndicator color={GREEN} style={{ marginTop: 30 }} />}

                <StreakCard lang={lang} matchId={matchId} myId={myId} first={first}
                  refreshKey={lb.days.reduce((a, d) => a + d.entries.filter(e => e.status === 'confirmed').length, 0)} />

                {pendingGroups.map(items => (
                  <PendingCard key={`${items[0].workout_id}:${items[0].exercise_key}`} lang={lang} items={items} first={first}
                    onTap={e => setEditing(e)}
                    onConfirm={async () => { const err = await lb.respondBlock(items[0].workout_id, items[0].exercise_key || '', 'accept'); if (!err) haptic.success(); flashErr(err) }}
                    onDecline={async () => flashErr(await lb.respondBlock(items[0].workout_id, items[0].exercise_key || '', 'delete'))} />
                ))}

                {!lb.loading && (
                  <>
                    <View style={st.secRow}>
                      <Text style={st.section}>{L.today}</Text>
                      {todayDay && volLine(todayDay) ? <Text style={st.secMeta}>{volLine(todayDay)}</Text> : null}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
                      {LABELS.map(l => {
                        const on = todayDay?.label === l
                        return (
                          <TouchableOpacity key={l} style={[st.chip, on && st.chipOn]} activeOpacity={0.85}
                            onPress={async () => flashErr(await lb.setLabel(on ? '' : l))}>
                            <Text style={[st.chipText, on && { color: '#fff' }]}>{L[`lb_${l}`]}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </ScrollView>

                    {todayDay && todayDay.entries.length > 0 ? dayBlocks(todayDay, true) : (
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
                            <Text style={st.dayTitle}>{dayText(d.day, lang)}{d.label ? ` · ${labelName(d.label)}` : ''}</Text>
                            <Text style={st.daySub}>{lfmt(L.lifts, { n: groupEntries(d.entries.filter(e => e.status === 'confirmed')).length })}{volLine(d) ? ` · ${volLine(d)}` : ''}</Text>
                          </View>
                          <Text style={st.chev}>{open === d.id ? '⌃' : '⌄'}</Text>
                        </TouchableOpacity>
                        {open === d.id && <View style={{ marginTop: 6 }}>{dayBlocks(d, false)}</View>}
                      </View>
                    ))}
                    {lb.days.length === 0 && <Text style={st.hint}>{L.no_history}</Text>}
                  </>
                )}
              </ScrollView>
              <RestBar lang={lang} matchId={matchId} myId={myId} first={first} />
              <TouchableOpacity style={st.addBtn} onPress={() => setAdding({})} activeOpacity={0.85}>
                <Text style={st.addBtnText}>＋ {L.add}</Text>
              </TouchableOpacity>
            </>
          )}

          {editing && (
            <EditSet lang={lang} entry={editing} bottom={bottom} onClose={() => setEditing(null)}
              onSave={async (reps, kg, kind) => { const err = await lb.editSet(editing.id, reps, kg, kind); if (!err) setEditing(null); return err }}
              onDelete={async () => { const err = await lb.deleteSet(editing.id); if (!err) setEditing(null); return err }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Sets your partner logged for you ────────────────────────────────────────────────
function PendingCard({ lang, items, first, onTap, onConfirm, onDecline }: {
  lang: string, items: LogEntry[], first: string,
  onTap: (e: LogEntry) => void, onConfirm: () => Promise<void>, onDecline: () => Promise<void>
}) {
  const L = logbookStrings(lang)
  const [busy, setBusy] = useState(false)
  async function run(fn: () => Promise<void>) { setBusy(true); await fn(); setBusy(false) }
  return (
    <View style={st.pendCard}>
      <Text style={st.pendKicker}>⏳ {lfmt(L.for_you, { name: first })}</Text>
      <Text style={st.pendName}>{exerciseName(items[0].exercise_key, lang, items[0].exercise)}</Text>
      <View style={{ marginTop: 8 }}>
        {items.map((e, i) => (
          <TouchableOpacity key={e.id} style={st.pendSet} onPress={() => onTap(e)} activeOpacity={0.7}>
            <KindBadge kind={e.kind} n={i + 1} />
            <Text style={[st.liftText, { flex: 1, marginLeft: 8 }]}>{setText(e, L.bw)}</Text>
            <Text style={st.pencil}>✎</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={st.pendBtns}>
        <TouchableOpacity style={[st.pillOn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => run(onConfirm)}><Text style={st.pillOnText}>✓ {L.confirm_all}</Text></TouchableOpacity>
        <TouchableOpacity style={st.pill} disabled={busy} onPress={() => run(onDecline)}><Text style={[st.pillText, { color: DANGER }]}>{L.decline}</Text></TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Edit or delete one set ──────────────────────────────────────────────────────────
function EditSet({ lang, entry, bottom, onClose, onSave, onDelete }: {
  lang: string, entry: LogEntry, bottom: number, onClose: () => void,
  onSave: (reps: number, kg: number, kind: Kind) => Promise<string | null>, onDelete: () => Promise<string | null>
}) {
  const L = logbookStrings(lang)
  const [kg, setKg] = useState(kgText(entry.weight_kg))
  const [reps, setReps] = useState(String(entry.reps))
  const [kind, setKind] = useState<Kind>(entry.kind)
  const [busy, setBusy] = useState(false)

  async function save() {
    const r = parseInt(reps, 10), w = kg.trim() === '' ? 0 : parseFloat(kg.replace(',', '.'))
    if (!(r >= 1 && r <= 100 && w >= 0 && w <= 1000)) { Alert.alert(L.err_bad); return }
    setBusy(true)
    const err = await onSave(r, w, kind)
    setBusy(false)
    if (err) Alert.alert(L[err])
  }
  function del() {
    Alert.alert(L.delete_set + '?', undefined, [
      { text: L.cancel, style: 'cancel' },
      { text: L.delete, style: 'destructive', onPress: async () => { setBusy(true); const err = await onDelete(); setBusy(false); if (err) Alert.alert(L[err]) } },
    ])
  }

  return (
    <View style={st.overlay}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      <ScrollView keyboardShouldPersistTaps="handled" style={st.editCard} contentContainerStyle={{ paddingBottom: bottom + 18 }} bounces={false}>
        <Text style={st.editTitle}>{L.edit_set}</Text>
        <Text style={st.editSub}>{exerciseName(entry.exercise_key, lang, entry.exercise)}</Text>
        {entry.sets > 1 && <Text style={st.legacy}>{lfmt(L.legacy_note, { n: entry.sets })}</Text>}

        <View style={st.kindRow}>
          {KINDS.map(k => {
            const on = kind === k
            const ks = KIND_STYLE[k]
            return (
              <TouchableOpacity key={k} onPress={() => setKind(k)} activeOpacity={0.85}
                style={[st.kindChip, on && { backgroundColor: ks.fg, borderColor: ks.fg }]}>
                <Text style={[st.kindChipText, on && { color: '#fff' }]}>{L[`kind_${k}`]}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <Stepper label={`${L.kg.split(' (')[0]}`} value={kg} onChange={setKg} step={2.5} min={0} max={1000} />
          <Stepper label={L.reps} value={reps} onChange={setReps} step={1} min={1} max={100} />
        </View>

        <TouchableOpacity style={[st.saveBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={save} activeOpacity={0.85}>
          <Text style={st.saveText}>{L.save_changes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.dangerBtn} disabled={busy} onPress={del} activeOpacity={0.8}>
          <Text style={st.dangerText}>{L.delete_set}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.doneBtn} onPress={onClose} activeOpacity={0.8}><Text style={st.doneText}>{L.cancel}</Text></TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ─── Steppers ────────────────────────────────────────────────────────────────────────
function Stepper({ label, value, onChange, step, min, max }: {
  label: string, value: string, onChange: (v: string) => void, step: number, min: number, max: number
}) {
  const num = parseFloat(value.replace(',', '.')) || 0
  const bump = (d: number) => onChange(kgText(clamp(num + d, min, max)))
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

function Mini({ value, onChange, step, min, max, decimal }: {
  value: string, onChange: (v: string) => void, step: number, min: number, max: number, decimal: boolean
}) {
  const num = parseFloat(value.replace(',', '.')) || 0
  const bump = (d: number) => onChange(kgText(clamp(num + d, min, max)))
  return (
    <View style={st.mini}>
      <TouchableOpacity style={st.miniBtn} onPress={() => bump(-step)} hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}><Text style={st.miniBtnText}>−</Text></TouchableOpacity>
      <TextInput style={st.miniInput} value={value} onChangeText={onChange} keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        maxLength={decimal ? 6 : 3} selectTextOnFocus />
      <TouchableOpacity style={st.miniBtn} onPress={() => bump(step)} hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}><Text style={st.miniBtnText}>＋</Text></TouchableOpacity>
    </View>
  )
}

// ─── Add an exercise: one row per set, each with its own weight and reps ─────────────
function SetBuilder({ lang, myId, first, lb, recentKeys, preset, onDone }: {
  lang: string, myId: string, first: string, lb: Api, recentKeys: string[], preset?: Preset, onDone: () => void
}) {
  const L = logbookStrings(lang)
  const nextId = useRef(1)
  const blank = (seed?: Partial<Row>): Row => ({ id: nextId.current++, kg: seed?.kg ?? '', reps: seed?.reps ?? '8', kind: seed?.kind ?? 'work' })

  const [forOther, setForOther] = useState(!!preset?.forOther)
  const [key, setKey] = useState(preset?.key || '')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<Group | 'all'>('all')
  const [rows, setRows] = useState<Row[]>(() => (preset?.key ? [blank(preset.seed)] : []))
  const touched = useRef(!!preset?.seed)
  const [last, setLast] = useState<{ key: string, rows: LastSet[] } | null>(null)
  const [prefilled, setPrefilled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')

  useEffect(() => {
    if (!key) { setLast(null); return }
    let live = true
    lb.lastSets(key).then(r => { if (live) setLast({ key, rows: r }) })
    return () => { live = false }
  }, [key])

  const lastFor = useMemo(() => {
    if (!last || last.key !== key) return [] as LastSet[]
    return last.rows.filter(r => (forOther ? r.user_id !== myId : r.user_id === myId))
  }, [last, key, forOther, myId])
  const expand = (rs: LastSet[]): Row[] => rs.flatMap(r =>
    Array.from({ length: Math.max(1, r.sets) }, () => blank({ kg: r.weight_kg > 0 ? kgText(r.weight_kg) : '', reps: String(r.reps), kind: r.kind })))

  // Start from last time, set by set: the point is to beat it.
  useEffect(() => {
    if (!key || !last || last.key !== key || touched.current) return
    if (lastFor.length > 0) { setRows(expand(lastFor).slice(0, 20)); setPrefilled(true) }
    else { setRows([blank()]); setPrefilled(false) }
  }, [last, forOther, key])

  function pick(k: string) {
    touched.current = false
    setPrefilled(false)
    setKey(k)
    setRows([blank()])
    Keyboard.dismiss()
  }
  function patch(id: number, p: Partial<Row>) {
    touched.current = true
    setPrefilled(false)
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r)))
  }
  function addSet() {
    touched.current = true
    setRows(rs => {
      if (rs.length >= 20) return rs
      const l = rs[rs.length - 1]
      return [...rs, blank(l ? { kg: l.kg, reps: l.reps, kind: l.kind === 'warmup' ? 'work' : l.kind } : undefined)]
    })
  }
  function removeRow(id: number) {
    touched.current = true
    setRows(rs => (rs.length > 1 ? rs.filter(r => r.id !== id) : rs))
  }
  function cycle(r: Row) {
    patch(r.id, { kind: KINDS[(KINDS.indexOf(r.kind) + 1) % KINDS.length] })
  }
  function copyLast() {
    if (!lastFor.length) return
    touched.current = true
    setRows(expand(lastFor).slice(0, 20))
    setPrefilled(true)
  }

  const results = useMemo(() => searchExercises(query, lang, group).slice(0, 12), [query, lang, group])
  const groups: (Group | 'all')[] = ['all', 'push', 'pull', 'legs', 'core']

  const parsed = parseRows(rows)
  const workSets = (parsed || []).filter(s => s.kind !== 'warmup')
  const vol = workSets.reduce((a, s) => a + s.kg * s.reps, 0)
  const best = workSets.reduce((a, s) => Math.max(a, s.kg > 0 ? e1rm(s.kg, s.reps) : 0), 0)

  async function save() {
    if (!key) { Alert.alert(L.pick_first); return }
    if (!parsed) { Alert.alert(L.err_bad); return }
    setBusy(true)
    const res = await lb.logSets(forOther, key, parsed)
    setBusy(false)
    if (res.error) { Alert.alert(L[res.error]); return }
    Keyboard.dismiss()
    if (res.isPr && !forOther) haptic.pr(); else haptic.success()
    setFlash(forOther ? lfmt(L.sent, { name: first }) : res.isPr ? `🔥 ${L.pr_badge}! ${L.saved}` : L.saved)
    setTimeout(() => setFlash(''), 2600)
    touched.current = false
    setKey(''); setQuery(''); setRows([]); setLast(null); setPrefilled(false)
  }

  const lastDay = lastFor.length ? lastFor[0].day : ''
  const lastLine = (rs: LastSet[]) => rs.flatMap(r =>
    Array.from({ length: Math.max(1, r.sets) }, () => `${KIND_STYLE[r.kind].tag}${r.weight_kg > 0 ? kgText(r.weight_kg) : L.bw}×${r.reps}`)).join('  ·  ')
  const lastOther = last && last.key === key ? last.rows.filter(r => (forOther ? r.user_id === myId : r.user_id !== myId)) : []

  const saveLabel = parsed
    ? (forOther ? (rows.length === 1 ? lfmt(L.save_1_other, { name: first }) : lfmt(L.save_n_other, { n: rows.length, name: first }))
      : (rows.length === 1 ? L.save_1_me : lfmt(L.save_n_me, { n: rows.length })))
    : (forOther ? lfmt(L.save_other, { name: first }) : L.save_me)

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
      {!!flash && <View style={st.flashBar}><Text style={st.flash}>{flash}</Text></View>}

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
          <TouchableOpacity onPress={() => { setKey(''); setQuery(''); setRows([]); touched.current = false }}><Text style={st.change}>{L.change}</Text></TouchableOpacity>
        </View>
      ) : (
        <View>
          {recentKeys.length > 0 && !query && (
            <View style={{ marginBottom: 10 }}>
              <Text style={st.miniLabel}>{L.recent}</Text>
              <View style={st.wrap}>
                {recentKeys.map(k => (
                  <TouchableOpacity key={k} style={st.chip} onPress={() => pick(k)} activeOpacity={0.85}><Text style={st.chipText}>{exerciseName(k, lang)}</Text></TouchableOpacity>
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
              <TouchableOpacity key={ex.key} style={st.result} onPress={() => pick(ex.key)} activeOpacity={0.7}>
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
            {lastFor.length > 0 || lastOther.length > 0 ? (
              <>
                <Text style={st.lastKicker}>{lfmt(L.last_time, { date: dayText(lastDay || (lastOther[0]?.day ?? ''), lang) })}</Text>
                {lastFor.length > 0 && <Text style={st.lastLine}>{forOther ? first : L.you}: {lastLine(lastFor)}</Text>}
                {lastOther.length > 0 && <Text style={[st.lastLine, { color: '#6f7f79', fontWeight: '600' }]}>{forOther ? L.you : first}: {lastLine(lastOther)}</Text>}
                {lastFor.length > 0 && (
                  <TouchableOpacity onPress={copyLast} style={{ marginTop: 8 }} activeOpacity={0.7}>
                    <Text style={st.change}>↺ {L.copy_last}</Text>
                  </TouchableOpacity>
                )}
                {prefilled && <Text style={st.lastHint}>{L.prefilled}</Text>}
              </>
            ) : <Text style={st.lastHint}>{L.no_last}</Text>}
          </View>

          <View style={[st.setLine, { marginTop: 16 }]}>
            <View style={{ width: 34 }} />
            <Text style={[st.colHead, { flex: 1.15 }]}>{L.col_kg}</Text>
            <Text style={[st.colHead, { flex: 1 }]}>{L.col_reps}</Text>
            <View style={{ width: 22 }} />
          </View>
          {rows.map((r, i) => (
            <View key={r.id} style={st.setLine}>
              <KindBadge kind={r.kind} n={i + 1} onPress={() => cycle(r)} />
              <View style={{ flex: 1.15 }}><Mini value={r.kg} onChange={v => patch(r.id, { kg: v })} step={2.5} min={0} max={1000} decimal /></View>
              <View style={{ flex: 1 }}><Mini value={r.reps} onChange={v => patch(r.id, { reps: v.replace(/[^0-9]/g, '') })} step={1} min={1} max={100} decimal={false} /></View>
              <TouchableOpacity onPress={() => removeRow(r.id)} disabled={rows.length <= 1} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }} style={{ width: 22, alignItems: 'center', opacity: rows.length <= 1 ? 0.25 : 1 }}>
                <Text style={st.x}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <Text style={st.kindHint}>{L.kind_hint}</Text>

          <TouchableOpacity style={[st.addSetBtn, rows.length >= 20 && { opacity: 0.4 }]} onPress={addSet} disabled={rows.length >= 20} activeOpacity={0.8}>
            <Text style={st.addSetText}>{L.add_set}</Text>
          </TouchableOpacity>

          {parsed && (
            <View style={st.totalCard}>
              <Text style={st.totalText}>{lfmt(L.total_sets, { n: workSets.length })}{vol > 0 ? `  ·  ${lfmt(L.total_vol, { kg: whole(vol) })}` : ''}</Text>
              {best > 0 && <Text style={st.totalSub}>{lfmt(L.est_1rm, { kg: whole(best) })}</Text>}
            </View>
          )}

          <TouchableOpacity style={[st.saveBtn, busy && { opacity: 0.6 }]} onPress={save} disabled={busy} activeOpacity={0.85}>
            <Text style={st.saveText}>{saveLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.doneBtn} onPress={onDone} activeOpacity={0.8}><Text style={st.doneText}>{L.done}</Text></TouchableOpacity>
        </>
      )}
      {!key && (
        <TouchableOpacity style={st.doneBtn} onPress={onDone} activeOpacity={0.8}><Text style={st.doneText}>{L.done}</Text></TouchableOpacity>
      )}
    </ScrollView>
  )
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, overflow: 'hidden' },
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
  blockHead: { flexDirection: 'row', alignItems: 'center' },
  blockName: { fontSize: 15.5, fontWeight: '800', color: '#1a1a1a' },
  miniPill: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: '#cfe3da' },
  miniPillText: { fontSize: 12.5, fontWeight: '800', color: GREEN },
  dots: { fontSize: 22, color: '#8a9a94', fontWeight: '800', marginTop: -6 },
  colWho: { fontSize: 11.5, fontWeight: '800', color: '#6f7f79', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  colVol: { marginTop: 2, fontSize: 12, fontWeight: '800', color: '#5f6f69' },
  dash: { color: '#b7c2bd', fontSize: 18, fontWeight: '700' },
  setRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 7, marginBottom: 5, borderWidth: 1, borderColor: '#d9e8e1' },
  chipPending: { borderStyle: 'dashed', borderColor: AMBER, backgroundColor: '#FFF9EE' },
  badgeSet: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeSetText: { fontSize: 12.5, fontWeight: '800' },
  liftText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  pendNote: { fontSize: 11, color: AMBER, fontWeight: '600', marginTop: 1 },
  pencil: { color: '#a7b4ae', fontSize: 14, paddingLeft: 6 },
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
  pendSet: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 5, borderWidth: 1, borderColor: '#f0e2bd' },
  pendBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: '#e6d6b0' },
  pillText: { fontSize: 13.5, fontWeight: '700', color: '#1a1a1a' },
  pillOn: { backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  pillOnText: { fontSize: 13.5, fontWeight: '800', color: '#fff' },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end' },
  editCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, maxHeight: '86%', flexGrow: 0 },
  editTitle: { fontSize: 19, fontWeight: '800', color: '#1a1a1a' },
  editSub: { marginTop: 2, fontSize: 14, color: '#6f7f79', fontWeight: '600' },
  legacy: { marginTop: 10, fontSize: 12.5, color: AMBER, fontWeight: '600', backgroundColor: '#FFF6E5', borderRadius: 10, padding: 10 },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  kindChip: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: '#cfe3da' },
  kindChipText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  dangerBtn: { marginTop: 6, paddingVertical: 12, alignItems: 'center' },
  dangerText: { fontSize: 15, fontWeight: '800', color: DANGER },
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
  lastLine: { marginTop: 5, fontSize: 14, fontWeight: '700', color: '#1a1a1a', lineHeight: 20 },
  lastHint: { marginTop: 6, fontSize: 13, color: '#6f7f79', fontWeight: '600' },
  setLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  colHead: { fontSize: 11.5, fontWeight: '800', color: '#8a9a94', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' },
  mini: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef3f0', borderRadius: 12, height: 42 },
  miniBtn: { width: 28, height: 42, alignItems: 'center', justifyContent: 'center' },
  miniBtnText: { fontSize: 18, fontWeight: '800', color: DEEP },
  miniInput: { flex: 1, height: 36, backgroundColor: '#fff', borderRadius: 9, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#1a1a1a', paddingVertical: 0, paddingHorizontal: 0, minWidth: 30 },
  x: { color: '#b7c2bd', fontSize: 15 },
  kindHint: { fontSize: 12, color: '#8a9a94', marginTop: 2, marginBottom: 4 },
  addSetBtn: { marginTop: 8, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: GREEN, borderStyle: 'dashed' },
  addSetText: { fontSize: 15, fontWeight: '800', color: GREEN },
  totalCard: { marginTop: 12, backgroundColor: MINT, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  totalText: { fontSize: 14, fontWeight: '800', color: DEEP },
  totalSub: { marginTop: 2, fontSize: 12.5, fontWeight: '700', color: '#5f6f69' },
  stepLabel: { fontSize: 12.5, fontWeight: '800', color: '#5f6f69', marginBottom: 6 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 44, height: 46, borderRadius: 13, backgroundColor: '#eef3f0', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 22, fontWeight: '800', color: DEEP },
  stepInput: { flex: 1, height: 46, backgroundColor: '#fff', borderRadius: 13, textAlign: 'center', fontSize: 18, fontWeight: '800', borderWidth: 1, borderColor: '#d9e8e1', color: '#1a1a1a', paddingVertical: 0 },
  saveBtn: { marginTop: 16, backgroundColor: GREEN, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  flashBar: { backgroundColor: MINT, borderRadius: 14, paddingVertical: 12, marginTop: 4 },
  flash: { textAlign: 'center', fontSize: 15, fontWeight: '800', color: DEEP },
  doneBtn: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  doneText: { fontSize: 15, fontWeight: '800', color: '#6f7f79' },
})
