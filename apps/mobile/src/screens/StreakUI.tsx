import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { usePairOverview, TITLE_EMOJI, type Title } from '../lib/streaks'
import { streakStrings } from '../lib/streakStrings'
import { haptic } from '../lib/haptics'

const GREEN = '#1D9E75'
const DEEP = '#0E6B4F'
const MINT = '#EAF6F1'
const AMBER = '#E8960C'

// Duo streak + titles, shown at the top of the Logbook.
export function StreakCard({ lang, matchId, myId, first, refreshKey }: {
  lang: string, matchId: string, myId: string, first: string, refreshKey: number
}) {
  const S = streakStrings(lang)
  const { ov, fresh, clearFresh } = usePairOverview(matchId, myId, refreshKey)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!fresh.length) return
    haptic.pr()
    Alert.alert(S.unlocked, fresh.map(k => `${TITLE_EMOJI[k] || '🏅'} ${S[`t_${k}`] || k}`).join('\n'))
    clearFresh()
  }, [fresh])

  if (!ov) return null

  const n = ov.streak
  const status = ov.done_this_week ? S.done : n === 0 ? S.start : ov.days_left === 0 ? S.last : S.keep
  const statusColor = ov.done_this_week ? GREEN : n === 0 ? '#8A948F' : AMBER
  const mine = ov.me.filter(t => t.earned)
  const theirs = ov.other.filter(t => t.earned)

  return (
    <TouchableOpacity style={st.card} activeOpacity={0.9} onPress={() => { haptic.tap(); setOpen(o => !o) }}>
      <View style={st.top}>
        <Text style={st.flame}>{n > 0 ? '🔥' : '💤'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={st.big}>{n} {n === 1 ? S.weeks_one : S.weeks_many}</Text>
          <Text style={st.small}>{S.duo_streak}{ov.best > n ? `  ·  ${S.best.replace('{n}', String(ov.best))}` : ''}</Text>
        </View>
        <View style={st.dots}>
          {ov.weeks.map((on, i) => {
            const current = i === ov.weeks.length - 1
            return <View key={i} style={[st.dot, on && st.dotOn, current && !on && st.dotNow]} />
          })}
        </View>
      </View>
      <Text style={[st.status, { color: statusColor }]}>{status}</Text>

      {(mine.length > 0 || theirs.length > 0) && (
        <View style={st.badges}>
          {mine.length > 0 && <Text style={st.badgeLine}>{S.you} {mine.map(t => TITLE_EMOJI[t.key]).join(' ')}</Text>}
          {theirs.length > 0 && <Text style={st.badgeLine}>{first} {theirs.map(t => TITLE_EMOJI[t.key]).join(' ')}</Text>}
        </View>
      )}

      {open && (
        <View style={st.list}>
          <Text style={st.listHead}>{S.titles}</Text>
          {ov.me.map((t, i) => <TitleRow key={t.key} S={S} first={first} mine={t} theirs={ov.other[i]} />)}
        </View>
      )}
    </TouchableOpacity>
  )
}

function TitleRow({ S, first, mine, theirs }: { S: Record<string, string>, first: string, mine: Title, theirs?: Title }) {
  const pct = Math.min(1, mine.count / mine.goal)
  return (
    <View style={st.row}>
      <Text style={[st.rowEmoji, !mine.earned && { opacity: 0.35 }]}>{TITLE_EMOJI[mine.key] || '🏅'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={st.rowName}>{S[`t_${mine.key}`] || mine.key}</Text>
        <Text style={st.rowDesc}>{S[`d_${mine.key}`] || ''}</Text>
        <View style={st.bar}><View style={[st.barFill, { width: `${Math.round(pct * 100)}%` }, mine.earned && { backgroundColor: GREEN }]} /></View>
      </View>
      <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
        <Text style={[st.rowCount, mine.earned && { color: GREEN }]}>{mine.earned ? '✓' : `${Math.min(mine.count, mine.goal)}/${mine.goal}`}</Text>
        {theirs ? <Text style={st.rowOther}>{first} {theirs.earned ? '✓' : `${Math.min(theirs.count, theirs.goal)}/${theirs.goal}`}</Text> : null}
      </View>
    </View>
  )
}

const st = StyleSheet.create({
  card: { backgroundColor: MINT, borderRadius: 18, padding: 14, marginBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flame: { fontSize: 30 },
  big: { fontSize: 20, fontWeight: '800', color: DEEP },
  small: { fontSize: 12, color: '#5E6B66', marginTop: 1 },
  dots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#D3DDD8' },
  dotOn: { backgroundColor: GREEN },
  dotNow: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: AMBER },
  status: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  badgeLine: { fontSize: 14, color: '#2B3A34' },
  list: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#C9D8D1', paddingTop: 10 },
  listHead: { fontSize: 12, fontWeight: '700', color: '#5E6B66', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  rowEmoji: { fontSize: 26, width: 34, textAlign: 'center' },
  rowName: { fontSize: 14, fontWeight: '700', color: '#1E2B26' },
  rowDesc: { fontSize: 12, color: '#66726D', marginTop: 1 },
  bar: { height: 5, borderRadius: 3, backgroundColor: '#D3DDD8', marginTop: 6, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3, backgroundColor: '#8FC9B2' },
  rowCount: { fontSize: 13, fontWeight: '700', color: '#44514B' },
  rowOther: { fontSize: 11, color: '#7A8680', marginTop: 2 },
})
