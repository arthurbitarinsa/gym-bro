import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { supabase } from './supabase'

export type PushTap = { type?: string, matchId?: string, requestId?: string, callId?: string }

// While the app is open, messages / calls / requests already show in-app, so no system banner.
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    // spotter alerts are urgent and have no in-app banner, so they still show while the app is open
    const show = (n.request.content.data as any)?.type === 'spotter'
    const rest = (n.request.content.data as any)?.type === 'rest' // rest timer over: sound only, no banner
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show || rest, shouldSetBadge: false }
  },
})

let currentToken: string | null = null

function projectId(): string | undefined {
  return (Constants as any).expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId
}

export async function registerPush(): Promise<void> {
  try {
    if (Platform.OS === 'web') return
    let status = ((await Notifications.getPermissionsAsync()) as any).status
    if (status !== 'granted') status = ((await Notifications.requestPermissionsAsync()) as any).status
    if (status !== 'granted') return
    const id = projectId()
    const tok = await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined)
    currentToken = tok.data
    await supabase.rpc('register_push_token', { p_token: tok.data, p_platform: Platform.OS })
  } catch (e) {
    // Expo Go / simulator / no permission: the app keeps working, just without push.
  }
}

export async function unregisterPush(): Promise<void> {
  try {
    if (currentToken) await supabase.rpc('unregister_push_token', { p_token: currentToken })
    currentToken = null
  } catch (e) {}
}

// Registers this phone for push, routes notification taps, mirrors unread count on the app icon.
export function usePush(userId: string | undefined, onTap: (d: PushTap) => void, badge: number) {
  const tapRef = useRef(onTap)
  tapRef.current = onTap
  const handled = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) return
    registerPush()
    const handle = (r: Notifications.NotificationResponse | null) => {
      if (!r) return
      const rid = r.notification.request.identifier
      if (handled.current === rid) return
      handled.current = rid
      tapRef.current((r.notification.request.content.data || {}) as PushTap)
    }
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {})
    const sub = Notifications.addNotificationResponseReceivedListener(handle)
    return () => sub.remove()
  }, [userId])

  useEffect(() => {
    Notifications.setBadgeCountAsync(badge).catch(() => {})
  }, [badge])
}
