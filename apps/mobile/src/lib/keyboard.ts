import { createElement, useEffect, useState, type ReactNode } from 'react'
import { Keyboard, Platform, View } from 'react-native'

// Android draws edge to edge, so the keyboard slides OVER the app instead of pushing it up.
// Returns the keyboard height there (0 when hidden, and always 0 on iOS, which already handles it).
export function useKeyboardHeight(): number {
  const [h, setH] = useState(0)
  useEffect(() => {
    if (Platform.OS !== 'android') return
    const show = Keyboard.addListener('keyboardDidShow', e => setH(e.endCoordinates.height))
    const hide = Keyboard.addListener('keyboardDidHide', () => setH(0))
    return () => { show.remove(); hide.remove() }
  }, [])
  return h
}

// Wrap the whole app once: on Android every screen (onboarding, chat, settings...) is lifted above the keyboard.
export function KeyboardRoot({ children }: { children: ReactNode }) {
  const kb = useKeyboardHeight()
  return createElement(View, { style: { flex: 1, paddingBottom: kb } }, children)
}
