import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// Flip to true once the voice engine (LiveKit) is wired in.
export const VOICE_READY = false
export const NEEDED_MESSAGES = 5

export type CallRow = {
  id: string
  match_id: string
  caller_id: string
  callee_id: string
  status: 'ringing' | 'active' | 'declined' | 'missed' | 'cancelled' | 'ended'
  created_at: string
  answered_at: string | null
  ended_at: string | null
}

export type CallsApi = {
  current: CallRow | null
  peer: any
  start: (matchId: string, other: any) => Promise<string | null> // returns an error code or null
  respond: (action: 'accept' | 'decline' | 'cancel' | 'missed' | 'end') => Promise<void>
}

const RING_MS = 45000

function fresh(c: CallRow) {
  return c.status !== 'ringing' || Date.now() - new Date(c.created_at).getTime() < 60000
}

export function useCalls(userId: string | undefined): CallsApi {
  const [current, setCurrent] = useState<CallRow | null>(null)
  const [peer, setPeer] = useState<any>(null)
  const currentRef = useRef<CallRow | null>(null)
  currentRef.current = current

  const loadPeer = useCallback(async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (data) setPeer(data)
  }, [])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data } = await supabase.from('calls').select('*')
        .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
        .in('status', ['ringing', 'active'])
        .order('created_at', { ascending: false }).limit(1)
      const row = data?.[0] as CallRow | undefined
      if (row && fresh(row)) {
        setCurrent(row)
        loadPeer(row.caller_id === userId ? row.callee_id : row.caller_id)
      }
    })()

    const channel = supabase.channel(`calls:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, (payload) => {
        const row = payload.new as CallRow
        if (!row || (row.caller_id !== userId && row.callee_id !== userId)) return
        if (row.status === 'ringing' || row.status === 'active') {
          if (!fresh(row)) return
          setCurrent(row)
          if (!currentRef.current || currentRef.current.id !== row.id) {
            loadPeer(row.caller_id === userId ? row.callee_id : row.caller_id)
          }
        } else if (currentRef.current?.id === row.id) {
          setCurrent(null)
          setPeer(null)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // caller gives up after 45 s; callee's screen drops itself after 60 s
  useEffect(() => {
    if (!current || current.status !== 'ringing') return
    const age = Date.now() - new Date(current.created_at).getTime()
    const iAmCaller = current.caller_id === userId
    const t = setTimeout(async () => {
      if (iAmCaller) await supabase.rpc('respond_call', { p_call: current.id, p_action: 'missed' })
      setCurrent(c => (c && c.id === current.id && c.status === 'ringing' ? null : c))
    }, Math.max((iAmCaller ? RING_MS : 60000) - age, 500))
    return () => clearTimeout(t)
  }, [current?.id, current?.status])

  const start = useCallback(async (matchId: string, other: any) => {
    const { data, error } = await supabase.rpc('start_call', { p_match: matchId })
    if (error) {
      const m = error.message || ''
      return m.includes('locked') ? 'locked' : m.includes('busy') ? 'busy' : 'generic'
    }
    setPeer(other)
    setCurrent(data as CallRow)
    return null
  }, [])

  const respond = useCallback(async (action: 'accept' | 'decline' | 'cancel' | 'missed' | 'end') => {
    const c = currentRef.current
    if (!c) return
    const { data } = await supabase.rpc('respond_call', { p_call: c.id, p_action: action })
    const row = data as CallRow | null
    if (!row || row.status === 'ringing' || row.status === 'active') { if (row) setCurrent(row) }
    else { setCurrent(null); setPeer(null) }
  }, [])

  return { current, peer, start, respond }
}
