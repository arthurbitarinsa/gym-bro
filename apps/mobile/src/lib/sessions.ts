import { useState, useEffect, useCallback } from 'react'
import { AppState } from 'react-native'
import { supabase } from './supabase'

export type SessionRow = {
  id: string
  match_id: string
  proposer_id: string
  invitee_id: string
  awaiting_id: string | null
  starts_at: string
  focus: string
  status: 'proposed' | 'confirmed' | 'done' | 'declined' | 'cancelled' | 'missed'
  my_confirmed: boolean
  other_id: string
  other_name: string | null
  other_avatar: string | null
  gym_name: string | null
}

export type SessionsApi = {
  list: SessionRow[]
  upcoming: SessionRow[]
  refresh: () => Promise<void>
  propose: (matchId: string, startsAt: string, focus: string) => Promise<string | null>   // error code or null
  respond: (id: string, action: string, startsAt?: string) => Promise<string | null>
}

function code(msg: string): string {
  for (const c of ['no_gym', 'already_active', 'bad_time', 'invalid_state']) if (msg.includes(c)) return c
  return 'generic'
}

export function useSessions(userId: string | undefined): SessionsApi {
  const [list, setList] = useState<SessionRow[]>([])

  const refresh = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.rpc('list_my_sessions')
    setList(Array.isArray(data) ? (data as SessionRow[]) : [])
  }, [userId])

  useEffect(() => {
    if (!userId) return
    refresh()
    const channel = supabase.channel(`sessions:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => { refresh() })
      .subscribe()
    const sub = AppState.addEventListener('change', st => { if (st === 'active') refresh() })
    return () => { supabase.removeChannel(channel); sub.remove() }
  }, [userId])

  const propose = useCallback(async (matchId: string, startsAt: string, focus: string) => {
    const { error } = await supabase.rpc('propose_session', { p_match: matchId, p_starts: startsAt, p_focus: focus })
    await refresh()
    return error ? code(error.message || '') : null
  }, [refresh])

  const respond = useCallback(async (id: string, action: string, startsAt?: string) => {
    const { error } = await supabase.rpc('respond_session', { p_session: id, p_action: action, p_starts: startsAt ?? null })
    await refresh()
    return error ? code(error.message || '') : null
  }, [refresh])

  const upcoming = list.filter(x => x.status === 'proposed' || x.status === 'confirmed')
  return { list, upcoming, refresh, propose, respond }
}
