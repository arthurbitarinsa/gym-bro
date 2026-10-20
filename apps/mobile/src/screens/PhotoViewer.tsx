import { useEffect, useRef } from 'react'
import { Modal, View, Text, Image, Animated, PanResponder, TouchableOpacity, Dimensions, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const MAX_ZOOM = 5

// Full-screen photo viewer: pinch to zoom, drag to move when zoomed, double-tap to zoom in/out,
// drag down (not zoomed) or tap ✕ to close. Pure JS, so it behaves the same on iPhone and Android.
export default function PhotoViewer({ uri, name, onClose }: { uri: string, name?: string, onClose: () => void }) {
  const { width: W, height: H } = Dimensions.get('window')
  const insets = useSafeAreaInsets()

  const scale = useRef(new Animated.Value(1)).current
  const tx = useRef(new Animated.Value(0)).current
  const ty = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(1)).current

  const cur = useRef({ s: 1, x: 0, y: 0 }).current                       // current transform
  const g0 = useRef({ n: 0, max: 0, dist: 1, cx: 0, cy: 0, s: 1, x: 0, y: 0, px: 0, py: 0 }).current
  const disp = useRef({ w: W, h: W }).current                             // size the photo is drawn at (fit inside the screen)
  const lastTap = useRef(0)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    Image.getSize(uri, (w, h) => {
      if (!w || !h) return
      const r = Math.min(W / w, H / h)
      disp.w = w * r; disp.h = h * r
    }, () => {})
  }, [uri])

  const limit = (s: number) => ({
    x: Math.max(0, (disp.w * s - W) / 2),
    y: Math.max(0, (disp.h * s - H) / 2),
  })
  const apply = () => { scale.setValue(cur.s); tx.setValue(cur.x); ty.setValue(cur.y) }
  const animateTo = (s: number, x: number, y: number) => {
    const l = limit(s)
    cur.s = s
    cur.x = Math.max(-l.x, Math.min(l.x, x))
    cur.y = Math.max(-l.y, Math.min(l.y, y))
    Animated.parallel([
      Animated.spring(scale, { toValue: cur.s, useNativeDriver: true, bounciness: 0 }),
      Animated.spring(tx, { toValue: cur.x, useNativeDriver: true, bounciness: 0 }),
      Animated.spring(ty, { toValue: cur.y, useNativeDriver: true, bounciness: 0 }),
      Animated.spring(fade, { toValue: 1, useNativeDriver: true, bounciness: 0 }),
    ]).start()
  }

  const distance = (t: any[]) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY)
  const rebase = (touches: any[], g: any) => {
    g0.n = touches.length
    g0.max = Math.max(g0.max, touches.length)
    g0.s = cur.s; g0.x = cur.x; g0.y = cur.y
    g0.px = g.dx; g0.py = g.dy
    if (touches.length >= 2) {
      g0.dist = Math.max(distance(touches), 1)
      g0.cx = (touches[0].pageX + touches[1].pageX) / 2
      g0.cy = (touches[0].pageY + touches[1].pageY) / 2
    }
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e, g) => { g0.max = 0; rebase(e.nativeEvent.touches as any[], g) },
    onPanResponderMove: (e, g) => {
      const t = e.nativeEvent.touches as any[]
      if (t.length !== g0.n) rebase(t, g)
      if (t.length >= 2) {
        const cx = (t[0].pageX + t[1].pageX) / 2
        const cy = (t[0].pageY + t[1].pageY) / 2
        cur.s = Math.max(0.7, Math.min(MAX_ZOOM + 0.5, g0.s * (distance(t) / g0.dist)))
        cur.x = g0.x + (cx - g0.cx)
        cur.y = g0.y + (cy - g0.cy)
      } else if (cur.s > 1.02) {
        cur.x = g0.x + (g.dx - g0.px)
        cur.y = g0.y + (g.dy - g0.py)
      } else {
        cur.x = 0
        cur.y = g.dy - g0.py
        fade.setValue(1 - Math.min(Math.abs(cur.y) / (H / 2), 0.8))
      }
      apply()
    },
    onPanResponderRelease: (e, g) => finish(e, g),
    onPanResponderTerminate: (e, g) => finish(e, g),
  })).current

  function finish(e: any, g: any) {
    const wasTap = Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8 && g0.max < 2
    if (wasTap) {
      const now = Date.now()
      if (now - lastTap.current < 300) {
        lastTap.current = 0
        if (cur.s > 1.05) animateTo(1, 0, 0)
        else {
          const s = 2.5
          const px = e.nativeEvent.pageX - W / 2
          const py = e.nativeEvent.pageY - H / 2
          animateTo(s, -px * (s - 1), -py * (s - 1))
        }
      } else lastTap.current = now
      return
    }
    if (cur.s <= 1.05) {
      if (g0.max < 2 && (Math.abs(cur.y) > 110 || Math.abs(g.vy) > 1.3)) { closeRef.current(); return }
      animateTo(1, 0, 0)
    } else {
      animateTo(Math.min(cur.s, MAX_ZOOM), cur.x, cur.y)
    }
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: fade }]} />
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
          <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', transform: [{ translateX: tx }, { translateY: ty }, { scale }] }}>
            <Image source={{ uri }} style={{ width: W, height: H }} resizeMode="contain" />
          </Animated.View>
        </View>
        <View pointerEvents="box-none" style={[st.top, { paddingTop: insets.top + 10 }]}>
          <Text style={st.name} numberOfLines={1}>{name || ''}</Text>
          <TouchableOpacity onPress={onClose} style={st.close} activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={st.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const st = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 10 },
  name: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 12 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
