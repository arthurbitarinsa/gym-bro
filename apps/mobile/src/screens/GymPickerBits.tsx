import { useEffect, useRef, ReactNode } from 'react'
import { Animated, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'

const GREEN = '#1D9E75'
const MINT = '#f0faf6'

// Horizontal city chips: tap one to jump straight to that city instead of scrolling.
export function CityChips({ cities, counts, selected, onSelect, allLabel }: {
  cities: string[]
  counts: Record<string, number>
  selected: string
  onSelect: (city: string) => void
  allLabel: string
}) {
  if (cities.length < 2) return null
  const chip = (key: string, label: string, on: boolean, onPress: () => void) => (
    <TouchableOpacity key={key} onPress={onPress} activeOpacity={0.8} style={[cs.chip, on && cs.chipOn]}>
      <Text style={[cs.chipText, on && cs.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  )
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      style={{ marginHorizontal: -28, marginBottom: 8 }} contentContainerStyle={{ paddingHorizontal: 28, gap: 8 }}>
      {chip('__all', allLabel, selected === '', () => onSelect(''))}
      {cities.map(c => chip(c, `${c} · ${counts[c] || 0}`, selected === c, () => onSelect(selected === c ? '' : c)))}
    </ScrollView>
  )
}

// Slides up from the bottom as soon as something is selected, so Continue is always in reach.
export function SelectionDock({ visible, icon, title, subtitle, onClear, ctaLabel, onCta, busy, children }: {
  visible: boolean
  icon: string
  title: string
  subtitle?: string
  onClear: () => void
  ctaLabel: string
  onCta: () => void
  busy?: boolean
  children?: ReactNode
}) {
  const y = useRef(new Animated.Value(300)).current
  useEffect(() => {
    Animated.spring(y, { toValue: visible ? 0 : 300, friction: 9, tension: 60, useNativeDriver: true }).start()
  }, [visible])

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      pointerEvents={visible ? 'box-none' : 'none'}
      style={ds.wrap}
    >
      <Animated.View style={[ds.card, { transform: [{ translateY: y }] }]}>
        <View style={ds.row}>
          <View style={ds.icon}><Text style={{ fontSize: 22 }}>{icon}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={ds.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={ds.sub} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={ds.clear}>
            <Text style={ds.clearText}>✕</Text>
          </TouchableOpacity>
        </View>
        {children}
        <TouchableOpacity style={[ds.cta, busy && { opacity: 0.6 }]} onPress={onCta} disabled={busy} activeOpacity={0.85}>
          <Text style={ds.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const cs = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: '#e3ebe7', backgroundColor: '#fff' },
  chipOn: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 13.5, fontWeight: '600', color: '#4b5a54' },
  chipTextOn: { color: '#fff' },
})

const ds = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  card: {
    backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22,
    borderTopWidth: 1, borderColor: '#e3f2ec',
    shadowColor: '#0E6B4F', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: -6 }, elevation: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  icon: { width: 46, height: 46, borderRadius: 15, backgroundColor: MINT, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 16.5, fontWeight: '800', color: '#1a1a1a' },
  sub: { fontSize: 13, color: '#8a9a94', marginTop: 2 },
  clear: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f2f5f4', justifyContent: 'center', alignItems: 'center' },
  clearText: { fontSize: 13, color: '#6b7a74', fontWeight: '700' },
  cta: { backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
})
