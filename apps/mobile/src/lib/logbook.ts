import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export type LogEntry = {
  id: string, workout_id: string, user_id: string, logged_by: string | null,
  exercise: string, exercise_key: string | null, sets: number, reps: number, weight_kg: number,
  status: 'confirmed' | 'pending', is_pr: boolean, created_at: string,
}
export type WorkoutDay = { id: string, day: string, entries: LogEntry[] }
export type LastSet = { user_id: string, day: string, sets: number, reps: number, weight_kg: number }

const COLS = 'id, workout_id, user_id, logged_by, exercise, exercise_key, sets, reps, weight_kg, status, is_pr, created_at'

// "Today" is decided on the server in Belgian time, so the app uses the same clock.
export function todayBrussels(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())
  } catch {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

export function errorKey(message: string | undefined): 'err_not_allowed' | 'err_bad' | 'err_many' | 'err_generic' {
  const m = message || ''
  if (m.includes('not_allowed')) return 'err_not_allowed'
  if (m.includes('bad_input')) return 'err_bad'
  if (m.includes('too_many')) return 'err_many'
  return 'err_generic'
}

export function useLogbook(matchId: string) {
  const [days, setDays] = useState<WorkoutDay[]>([])
  const [volume, setVolume] = useState(0)
  const [loading, setLoading] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const { data: ws } = await supabase.from('workouts').select('id, day').eq('match_id', matchId).order('day', { ascending: false }).limit(40)
    const list = (ws || []) as { id: string, day: string }[]
    let entries: LogEntry[] = []
    if (list.length) {
      const { data: es } = await supabase.from('workout_entries').select(COLS).in('workout_id', list.map(w => w.id)).order('created_at', { ascending: true })
      entries = ((es || []) as any[]).map(e => ({ ...e, weight_kg: Number(e.weight_kg) }))
    }
    setDays(list.map(w => ({ id: w.id, day: w.day, entries: entries.filter(e => e.workout_id === w.id) })))
    const { data: v } = await supabase.rpc('pair_volume', { p_match: matchId })
    setVolume(Number(v) || 0)
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    const later = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(load, 250) }
    load()
    const ch = supabase.channel(`logbook:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_entries' }, later)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workouts' }, later)
      .subscribe()
    return () => { supabase.removeChannel(ch); if (timer.current) clearTimeout(timer.current) }
  }, [matchId, load])

  // returns null on success, or the strings key of the error to show
  async function logSet(forOther: boolean, key: string, sets: number, reps: number, kg: number) {
    const { data, error } = await supabase.rpc('log_set', { p_match: matchId, p_for_other: forOther, p_key: key, p_sets: sets, p_reps: reps, p_kg: kg })
    if (error) return { error: errorKey(error.message), isPr: false }
    await load()
    const row: any = Array.isArray(data) ? data[0] : data
    return { error: null as string | null, isPr: !!row?.is_pr }
  }

  async function respond(entryId: string, action: 'accept' | 'edit' | 'delete', vals?: { sets: number, reps: number, kg: number }) {
    const { error } = await supabase.rpc('respond_entry', {
      p_entry: entryId, p_action: action, p_sets: vals?.sets ?? null, p_reps: vals?.reps ?? null, p_kg: vals?.kg ?? null,
    })
    if (error) return errorKey(error.message)
    await load()
    return null
  }

  async function lastTime(key: string): Promise<LastSet[]> {
    const { data } = await supabase.rpc('last_time', { p_match: matchId, p_key: key })
    return ((data || []) as any[]).map(r => ({ ...r, weight_kg: Number(r.weight_kg) }))
  }

  return { days, volume, loading, logSet, respond, lastTime, refresh: load }
}

// Small badge for the chat: how many lifts is my partner waiting on me to confirm?
export function usePendingCount(matchId: string, myId: string) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    const load = async () => {
      const { count } = await supabase.from('workout_entries')
        .select('id, workouts!inner(match_id)', { count: 'exact', head: true })
        .eq('status', 'pending').eq('user_id', myId).eq('workouts.match_id', matchId)
      if (live) setN(count || 0)
    }
    load()
    const ch = supabase.channel(`logbook-badge:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_entries' }, () => { load() })
      .subscribe()
    return () => { live = false; supabase.removeChannel(ch) }
  }, [matchId, myId])
  return n
}
