import { useEffect, useRef } from 'react'
import { Animated, View, Text, TouchableOpacity, Image, SafeAreaView, StyleSheet } from 'react-native'
import type { Banner } from '../lib/inbox'

const GREEN = '#1D9E75'

// Slides in from the top when a message arrives while the app is open.
export default function MessageBanner({ banner, onOpen, onDismiss }: {
  banner: Banner
  onOpen: () => void
  onDismiss: () => void
}) {
  const y = useRef(new Animated.Value(-140)).current

  useEffect(() => {
    y.setValue(-140)
    Animated.spring(y, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }).start()
  }, [banner.key])

  const name: string = banner.other?.full_name || banner.other?.username || ''
  const avatar: string | undefined = banner.other?.avatar_url

  return (
    <SafeAreaView pointerEvents="box-none" style={st.overlay}>
      <Animated.View style={[st.card, { transform: [{ translateY: y }] }]}>
        <TouchableOpacity style={st.body} onPress={onOpen} activeOpacity={0.85}>
          {avatar
            ? <Image source={{ uri: avatar }} style={st.avatar} />
            : <View style={[st.avatar, st.avatarFallback]}><Text style={st.avatarText}>{(name[0] || '?').toUpperCase()}</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={st.name} numberOfLines={1}>{name}</Text>
            <Text style={st.msg} numberOfLines={2}>{banner.content}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={st.close}>
          <Text style={st.closeText}>×</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, elevation: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginTop: 8,
    backgroundColor: '#fff', borderRadius: 20, borderLeftWidth: 5, borderLeftColor: GREEN,
    shadowColor: '#0E6B4F', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  name: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  msg: { fontSize: 14, color: '#5f6f69', marginTop: 1 },
  close: { paddingHorizontal: 14, paddingVertical: 8 },
  closeText: { fontSize: 24, color: '#b5bfba', fontWeight: '600' },
})
