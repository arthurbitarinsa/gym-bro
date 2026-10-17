import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState } from 'react-native'
import { supabase } from './supabase'

export type SpotterReq = {
  id: string
  requester_id: string
  lift: string
  note: string | null
  status: 'open' | 'claimed' | 'done' | 'cancelled' | 'expired'
  helper_id: string | null
  created_at: string
  expires_at: string
  requester_name?: string | null
  requester_avatar?: string | null
}

export type SpotterApi = {
  open: SpotterReq[]            // other people's open requests at my gym
  mine: SpotterReq | null       // my own active request
  helperName: string | null
  alertsOn: boolean
  refresh: () => Promise<void>
  create: (lift: string, note: string) => Promise<string | null>   // error code or null
  respond: (id: string, action: 'help' | 'cancel' | 'done') => Promise<string | null>
  setAlerts: (on: boolean) => Promise<void>
}

function code(msg: string): string {
  for (const c of ['no_gym', 'already_open', 'too_soon', 'taken', 'expired']) if (msg.includes(c)) return c
  return 'generic'
}

export function useSpotter(userId: string | undefined, hasGym: boolean): SpotterApi {
  const [open, setOpen] = useState<SpotterReq[]>([])
  const [mine, setMine] = useState<SpotterReq | null>(null)
  const [helperName, setHelperName] = useState<string | null>(null)
  const [alertsOn, setAlertsOn] = useState(true)
  const helperFor = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    if (!userId || !hasGym) { setOpen([]); setMine(null); return }
    const { data } = await supabase.rpc('list_spotter_requests')
    setOpen(Array.isArray(data) ? (data as SpotterReq[]) : [])
    const { data: m } = await supabase.from('spotter_requests').select('*')
      .eq('requester_id', userId).in('status', ['open', 'claimed'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(1)
    const row = (m?.[0] as SpotterReq | undefined) ?? null
    setMine(row)
    if (row?.helper_id && helperFor.current !== row.helper_id) {
      helperFor.current = row.helper_id
      const { data: p } = await supabase.from('profiles').select('full_name,username').eq('id', row.helper_id).maybeSingle()
      setHelperName(p?.full_name || p?.username || null)
    }
    if (!row?.helper_id) { helperFor.current = null; setHelperName(null) }
  }, [userId, hasGym])

  useEffect(() => {
    if (!userId) return
    refresh()
    supabase.from('profiles').select('spotter_alerts').eq('id', userId).maybeSingle()
      .then(({ data }) => { if (data && typeof data.spotter_alerts === 'boolean') setAlertsOn(data.spotter_alerts) })
    const channel = supabase.channel(`spotter:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spotter_requests' }, () => { refresh() })
      .subscribe()
    const sub = AppState.addEventListener('change', st => { if (st === 'active') refresh() })
    return () => { supabase.removeChannel(channel); sub.remove() }
  }, [userId, hasGym])

  const create = useCallback(async (lift: string, note: string) => {
    const { error } = await supabase.rpc('create_spotter_request', { p_lift: lift, p_note: note })
    await refresh()
    return error ? code(error.message || '') : null
  }, [refresh])

  const respond = useCallback(async (id: string, action: 'help' | 'cancel' | 'done') => {
    const { error } = await supabase.rpc('respond_spotter', { p_request: id, p_action: action })
    await refresh()
    return error ? code(error.message || '') : null
  }, [refresh])

  const setAlerts = useCallback(async (on: boolean) => {
    setAlertsOn(on)
    if (userId) await supabase.from('profiles').update({ spotter_alerts: on }).eq('id', userId)
  }, [userId])

  return { open, mine, helperName, alertsOn, refresh, create, respond, setAlerts }
}
