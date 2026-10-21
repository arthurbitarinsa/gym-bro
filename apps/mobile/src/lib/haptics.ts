import { Platform, Vibration } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Small, polite vibrations built on React Native's own Vibration API (no extra native module).
// On iPhone the system ignores patterns, so only the "big moments" vibrate there.
let enabled = true
AsyncStorage.getItem('haptics_off').then(v => { if (v === '1') enabled = false }).catch(() => {})

export function hapticsEnabled() { return enabled }
export function setHapticsEnabled(on: boolean) {
  enabled = on
  AsyncStorage.setItem('haptics_off', on ? '0' : '1').catch(() => {})
}

function go(pattern: number | number[]) {
  if (!enabled) return
  try { Vibration.vibrate(pattern as any) } catch { /* ignore */ }
}

const android = Platform.OS === 'android'

export const haptic = {
  tap: () => { if (android) go(8) },                                  // sending a request, tapping a chip
  success: () => go(android ? [0, 16, 45, 16] : 1),                   // set saved, request accepted
  pr: () => go(android ? [0, 28, 55, 28, 55, 28, 70, 110] : 1),       // personal record, new title
  warn: () => { if (android) go([0, 40]) },
}
