import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { getHiddenIds } from './safety'

export type LastMessage = { id: string, content: string, created_at: string, sender_id: string }
export type Conversation = {
  matchId: string
  other: any
  matchedAt: string
  last: LastMessage | null
  unread: number
}
export type Banner = { key: string, matchId: string, other: any, content: string }

const STORE = 'ironmate_lastread_v1'
const EPOCH = '1970-01-01T00:00:00.000Z'

// Everything the Chats tab, the unread badge and the in-app message banner need.
// "Read" state is kept on this device (AsyncStorage), so no database change is required.
export function useInbox(userId: string | undefined, activeChatId: string | null) {
  const [all, setAll] = useState<Conversation[]>([])
  const [banner, setBanner] = useState<Banner | null>(null)

  const allRef = useRef<Conversation[]>([])
  const readRef = useRef<Record<string, string>>({})
  const storeLoaded = useRef(false)
  const activeRef = useRef<string | null>(activeChatId)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  activeRef.current = activeChatId

  function commit(next: Conversation[]) {
    allRef.current = next
    setAll(next)
  }

  function persist() {
    AsyncStorage.setItem(STORE, JSON.stringify(readRef.current)).catch(() => {})
  }

  async function loadStore() {
    if (storeLoaded.current) return
    try {
      const raw = await AsyncStorage.getItem(STORE)
      readRef.current = raw ? JSON.parse(raw) : {}
    } catch {
      readRef.current = {}
    }
    storeLoaded.current = true
  }

  const refresh = useCallback(async () => {
    if (!userId) return
    await loadStore()

    const { data: matches } = await supabase
      .from('matches')
      .select('*, user_a_profile:profiles!matches_user_a_fkey(*), user_b_profile:profiles!matches_user_b_fkey(*)')
      .eq('status', 'accepted')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('created_at', { ascending: false })
    if (!matches) return

    const hidden = await getHiddenIds()
    const mine = matches.filter(m => !hidden.includes(m.user_a === userId ? m.user_b : m.user_a))
    const ids = mine.map(m => m.id)

    let msgs: any[] = []
    if (ids.length > 0) {
      const { data } = await supabase
        .from('messages')
        .select('id, match_id, sender_id, content, created_at')
        .in('match_id', ids)
        .order('created_at', { ascending: false })
        .limit(500)
      msgs = data || []
    }

    const byMatch: Record<string, any[]> = {}
    for (const m of msgs) {
      if (!byMatch[m.match_id]) byMatch[m.match_id] = []
      byMatch[m.match_id].push(m)
    }

    // First run on this device: everything that already exists counts as read.
    if (readRef.current.__init === undefined) {
      const now = new Date().toISOString()
      for (const id of ids) {
        const newest = byMatch[id]?.[0]?.created_at
        readRef.current[id] = newest || now
      }
      readRef.current.__init = now
      persist()
    }

    const next: Conversation[] = mine.map(m => {
      const list = byMatch[m.id] || []
      const readAt = new Date(readRef.current[m.id] || EPOCH).getTime()
      const unread = list.filter(x => x.sender_id !== userId && new Date(x.created_at).getTime() > readAt).length
      const last = list[0]
        ? { id: list[0].id, content: list[0].content, created_at: list[0].created_at, sender_id: list[0].sender_id }
        : null
      return {
        matchId: m.id,
        other: m.user_a === userId ? m.user_b_profile : m.user_a_profile,
        matchedAt: m.created_at,
        last,
        unread,
      }
    })
    commit(next)
  }, [userId])

  const markRead = useCallback((matchId: string) => {
    const conv = allRef.current.find(c => c.matchId === matchId)
    const lastTime = conv?.last ? new Date(conv.last.created_at).getTime() : 0
    readRef.current[matchId] = new Date(Math.max(Date.now(), lastTime)).toISOString()
    persist()
    commit(allRef.current.map(c => (c.matchId === matchId ? { ...c, unread: 0 } : c)))
  }, [])

  const dismissBanner = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setBanner(null)
  }, [])

  function showBanner(conv: Conversation, content: string, key: string) {
    if (timer.current) clearTimeout(timer.current)
    setBanner({ key, matchId: conv.matchId, other: conv.other, content })
    timer.current = setTimeout(() => setBanner(null), 5000)
  }

  useEffect(() => {
    if (!userId) return
    refresh()

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m: any = payload.new
        if (!m || m.sender_id === userId) return
        const conv = allRef.current.find(c => c.matchId === m.match_id)
        if (!conv) { refresh(); return }

        const isOpen = activeRef.current === m.match_id
        const last: LastMessage = { id: m.id, content: m.content, created_at: m.created_at, sender_id: m.sender_id }
        commit(allRef.current.map(c => (c.matchId === m.match_id ? { ...c, last, unread: isOpen ? 0 : c.unread + 1 } : c)))

        if (isOpen) {
          readRef.current[m.match_id] = new Date(Math.max(Date.now(), new Date(m.created_at).getTime())).toISOString()
          persist()
        } else {
          showBanner(conv, m.content, String(m.id))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => { refresh() })
      .subscribe()

    const sub = AppState.addEventListener('change', state => { if (state === 'active') refresh() })

    return () => {
      supabase.removeChannel(channel)
      sub.remove()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [userId])

  const unreadTotal = all.reduce((sum, c) => sum + c.unread, 0)

  return { all, unreadTotal, refresh, markRead, banner, dismissBanner }
}
