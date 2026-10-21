import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from './supabase'
import { haptic } from './haptics'

// Rest timer shared by the two lifters. Both phones count down on their own clock from the moment
// the message arrives, so a little network delay never matters. It travels over a Realtime broadcast
// channel (nothing is stored). If you leave the app while a rest runs, a local notification tells you
// when it is over.
type Msg = { action: 'start' | 'stop', dur?: number, by: string }
export type Rest = { endsAt: number, total: number, by: string } | null

export function useRestTimer(matchId: string, myId: string, note: { title: string, body: string }) {
  const [rest, setRest] = useState<Rest>(null)
  const [left, setLeft] = useState(0)
  const [done, setDone] = useState(false)
  const chan = useRef<any>(null)
  const notif = useRef<string | null>(null)
  const restRef = useRef<Rest>(null)
  const noteRef = useRef(note)
  restRef.current = rest
  noteRef.current = note

  function cancelNotif() {
    if (notif.current) {
      Notifications.cancelScheduledNotificationAsync(notif.current).catch(() => {})
      notif.current = null
    }
  }

  function apply(m: Msg) {
    if (!m || typeof m !== 'object') return
    if (m.action === 'stop') { setRest(null); setDone(false); cancelNotif(); return }
    if (m.action === 'start') {
      const dur = Math.round(Number(m.dur))
      if (!(dur >= 10 && dur <= 600)) return
      setDone(false)
      cancelNotif()
      setRest({ endsAt: Date.now() + dur * 1000, total: dur, by: String(m.by) })
      setLeft(dur)
    }
  }

  function send(m: Msg) {
    try { chan.current?.send({ type: 'broadcast', event: 'rest', payload: m }) } catch { /* offline: local timer still works */ }
  }

  useEffect(() => {
    const ch = supabase.channel(`rest:${matchId}`, { config: { broadcast: { self: false } } })
    ch.on('broadcast', { event: 'rest' }, (m: any) => apply(m?.payload as Msg)).subscribe()
    chan.current = ch
    return () => { supabase.removeChannel(ch); chan.current = null; cancelNotif() }
  }, [matchId])

  useEffect(() => {
    if (!rest) return
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((rest.endsAt - Date.now()) / 1000))
      setLeft(l)
      if (l <= 0) {
        clearInterval(id)
        setRest(null)
        setDone(true)
        cancelNotif()
        // Sound: only if the end just happened while the app is open (otherwise the scheduled notification already rang)
        if (Date.now() - rest.endsAt < 3000) {
          haptic.pr()
          if (AppState.currentState === 'active') {
            Notifications.scheduleNotificationAsync({
              content: { title: noteRef.current.title, body: noteRef.current.body, sound: true, data: { type: 'rest' } } as any,
              trigger: null,
            }).catch(() => {})
          }
        }
        setTimeout(() => setDone(false), 6000)
      }
    }, 250)
    return () => clearInterval(id)
  }, [rest])

  useEffect(() => {
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active') { cancelNotif(); return }
      const r = restRef.current
      if (!r) return
      const secs = Math.ceil((r.endsAt - Date.now()) / 1000)
      if (secs < 2) return
      try {
        const p: any = await Notifications.getPermissionsAsync()
        if (p.status !== 'granted') return
        const type = (Notifications as any).SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval'
        cancelNotif()
        notif.current = await Notifications.scheduleNotificationAsync({
          content: { title: noteRef.current.title, body: noteRef.current.body, sound: true } as any,
          trigger: { type, seconds: secs, repeats: false } as any,
        })
      } catch { /* no permission or unsupported: skip */ }
    })
    return () => sub.remove()
  }, [])

  function start(dur: number) {
    const m: Msg = { action: 'start', dur, by: myId }
    apply(m); send(m); haptic.tap()
  }
  function stop() {
    const m: Msg = { action: 'stop', by: myId }
    apply(m); send(m)
  }
  function addTime(s: number) {
    const r = restRef.current
    if (!r) return
    start(Math.min(600, Math.max(10, Math.ceil((r.endsAt - Date.now()) / 1000) + s)))
  }

  return { rest, left, done, start, stop, addTime, dismissDone: () => setDone(false) }
}
