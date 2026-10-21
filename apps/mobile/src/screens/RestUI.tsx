import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { restStrings } from '../lib/restStrings'

const GREEN = '#1D9E75'
const DEEP = '#0E6B4F'
const MINT = '#EAF6F1'
const PRESETS = [60, 90, 120, 180]

function mmss(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r < 10 ? '0' : ''}${r}`
}

// The running countdown / "Go!" banner. Pinned under the Logbook header, so it stays visible
// on every screen of the Logbook (including while you add a lift).
export function RestLive({ lang, t, myId, first }: { lang: string, t: any, myId: string, first: string }) {
  const R = restStrings(lang)

  if (t.done) {
    return (
      <TouchableOpacity style={[st.box, st.go]} activeOpacity={0.85} onPress={t.dismissDone}>
        <Text style={st.goText}>{R.go}</Text>
      </TouchableOpacity>
    )
  }
  if (!t.rest) return null

  const mine = t.rest.by === myId
  const pct = Math.max(0, Math.min(1, t.left / t.rest.total))
  return (
    <View style={[st.box, { backgroundColor: MINT }]}>
      <View style={st.row}>
        <Text style={st.time}>{mmss(t.left)}</Text>
        <Text style={st.who} numberOfLines={2}>{(mine ? R.rest_me : R.rest_other).replace('{name}', first)}</Text>
        <TouchableOpacity style={st.pill} onPress={() => t.addTime(15)} activeOpacity={0.8}><Text style={st.pillText}>{R.plus15}</Text></TouchableOpacity>
        <TouchableOpacity style={[st.pill, st.pillStop]} onPress={t.stop} activeOpacity={0.8}><Text style={[st.pillText, { color: '#B23B3B' }]}>{R.stop}</Text></TouchableOpacity>
      </View>
      <View style={st.bar}><View style={[st.barFill, { width: `${Math.round(pct * 100)}%` }]} /></View>
    </View>
  )
}

// The "Rest together" button and its presets, shown above Add lift while nothing is running.
export function RestIdle({ lang, t }: { lang: string, t: any }) {
  const R = restStrings(lang)
  const [open, setOpen] = useState(false)
  if (t.rest || t.done) return null

  if (!open) {
    return (
      <TouchableOpacity style={st.idle} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={st.idleText}>⏱ {R.rest_btn}</Text>
      </TouchableOpacity>
    )
  }
  return (
    <View style={[st.box, { backgroundColor: MINT }]}>
      <View style={st.row}>
        <Text style={st.idleText}>⏱</Text>
        <View style={[st.row, { flex: 1, gap: 8, justifyContent: 'center' }]}>
          {PRESETS.map(s => (
            <TouchableOpacity key={s} style={st.preset} onPress={() => { setOpen(false); t.start(s) }} activeOpacity={0.8}>
              <Text style={st.presetText}>{mmss(s)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={st.x}>✕</Text></TouchableOpacity>
      </View>
    </View>
  )
}

const st = StyleSheet.create({
  box: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { fontSize: 26, fontWeight: '800', color: DEEP, minWidth: 64, fontVariant: ['tabular-nums'] },
  who: { flex: 1, fontSize: 12, color: '#4E5C56' },
  pill: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: '#cfe3da' },
  pillStop: { borderColor: '#efc9c9' },
  pillText: { fontSize: 13, fontWeight: '700', color: DEEP },
  bar: { height: 4, borderRadius: 2, backgroundColor: '#cfe3da', marginTop: 8, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: GREEN },
  go: { backgroundColor: GREEN, alignItems: 'center', paddingVertical: 14 },
  goText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  idle: { alignSelf: 'flex-start', marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#cfe3da', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8 },
  idleText: { fontSize: 14, fontWeight: '700', color: DEEP },
  preset: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#cfe3da' },
  presetText: { fontSize: 14, fontWeight: '700', color: DEEP },
  x: { fontSize: 16, color: '#7A8680' },
})
