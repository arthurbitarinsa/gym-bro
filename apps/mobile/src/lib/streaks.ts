import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

export type Title = { key: string, count: number, goal: number, earned: boolean }
export type Overview = {
  streak: number, best: number, done_this_week: boolean, days_left: number,
  weeks: boolean[], total_weeks: number, me: Title[], other: Title[],
}

export const TITLE_EMOJI: Record<string, string> = {
  iron_duo: '🤝', leg_day: '🦵', early_bird: '🌅', night_owl: '🦉', pr_hunter: '🏆', centurion: '💯',
}

// Loads the duo streak and both people's titles. Reloads when `refreshKey` changes (a set was
// saved or confirmed). Titles you have just earned are returned once in `fresh`, so the app can
// celebrate them. The first load on a phone only records what you already had, so nothing old pops up.
export function usePairOverview(matchId: string, myId: string, refreshKey: number) {
  const [ov, setOv] = useState<Overview | null>(null)
  const [fresh, setFresh] = useState<string[]>([])

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data, error } = await supabase.rpc('pair_overview', { p_match: matchId })
      if (!live || error || !data) return
      const o = data as Overview
      setOv(o)
      try {
        const k = `titles_seen:${myId}`
        const raw = await AsyncStorage.getItem(k)
        const earned = o.me.filter(t => t.earned).map(t => t.key)
        if (raw == null) {
          await AsyncStorage.setItem(k, JSON.stringify(earned))
        } else {
          const seen: string[] = JSON.parse(raw)
          const nw = earned.filter(x => !seen.includes(x))
          if (nw.length) {
            await AsyncStorage.setItem(k, JSON.stringify(Array.from(new Set([...seen, ...earned]))))
            if (live) setFresh(nw)
          }
        }
      } catch { /* storage is optional */ }
    })()
    return () => { live = false }
  }, [matchId, myId, refreshKey])

  return { ov, fresh, clearFresh: () => setFresh([]) }
}
