import { useState, useEffect, useRef, ComponentType, ReactNode } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, Animated, StyleSheet } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { inboxStrings } from '../lib/inboxStrings'
import type { Conversation } from '../lib/inbox'

const GREEN = '#1D9E75'
const DEEP = '#0E6B4F'
const MINT = '#f0faf6'

const AVATAR = 96
const BAND = 92

// Concentric rings around the avatar, like a barbell plate seen end-on.
const RINGS = [
  { r: 70, line: 'rgba(255,255,255,0.28)' },
  { r: 104, line: 'rgba(255,255,255,0.18)' },
  { r: 142, line: 'rgba(255,255,255,0.11)' },
  { r: 184, line: 'rgba(255,255,255,0.06)' },
]

const LEVELS = ['beginner', 'intermediate', 'advanced']
const GOAL_EMOJI: Record<string, string> = { strength: '🏋️', hypertrophy: '💪', cardio: '🏃', sport: '⚽', general: '✨' }

// Fades + slides a section in, staggered by `delay`.
function Reveal({ delay = 0, children }: { delay?: number, children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 480, delay, useNativeDriver: true }).start()
  }, [])
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      {children}
    </Animated.View>
  )
}

type Props = {
  t: Record<string, string>
  lang: string
  connections: Conversation[]
  onFindPartner: () => void
  onOpenConnections: () => void
  onOpenMembers: () => void
  onOpenProfile: (user: any) => void
  profile: any
  onOpenSettings: () => void
  onProfileUpdate: () => void
  uploadAvatar: (userId: string, uri: string) => Promise<string | null>
  TempGymPicker: ComponentType<{ t: Record<string, string>, profile: any, onClose: () => void, onSaved: () => void }>
}

export default function ProfileTab({ t, lang, connections, onFindPartner, onOpenConnections, onOpenMembers, onOpenProfile, profile, onOpenSettings, onProfileUpdate, uploadAvatar, TempGymPicker }: Props) {
  const [showTempGymPicker, setShowTempGymPicker] = useState(false)
  const [members, setMembers] = useState<number | null>(null)
  const x = inboxStrings(lang)

  // Same people the gym screen lists: regulars + anyone visiting right now, minus you.
  const activeGym = (profile?.temp_gym_id && profile?.temp_gym_expires_at && new Date(profile.temp_gym_expires_at) > new Date())
    ? profile.temp_gym_id : profile?.gym_id
  useEffect(() => {
    if (!activeGym || !profile?.id) return
    const now = new Date().toISOString()
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .neq('id', profile.id)
      .or(`gym_id.eq.${activeGym},and(temp_gym_id.eq.${activeGym},temp_gym_expires_at.gt.${now})`)
      .then(({ count }) => { if (count !== null) setMembers(count) })
  }, [activeGym, profile?.id])

  const checks = [
    { ok: !!profile?.avatar_url, tip: x.tip_photo },
    { ok: !!(profile?.bio && profile.bio.trim()), tip: x.tip_bio },
    { ok: !!profile?.training_goal, tip: x.tip_goal },
    { ok: !!profile?.experience_level, tip: x.tip_level },
    { ok: !!profile?.gym_id, tip: x.tip_gym },
  ]
  const done = checks.filter(c => c.ok).length
  const missing = checks.filter(c => !c.ok)
  const joined = profile?.created_at ? new Date(profile.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' }) : '—'

  const name = profile?.full_name || profile?.username || '?'
  const tempActive = !!(profile?.temp_gym_id && profile?.temp_gym_expires_at && new Date(profile.temp_gym_expires_at) > new Date())
  const levelIdx = LEVELS.indexOf(profile?.experience_level) + 1
  const goal: string = profile?.training_goal || ''

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 })
    if (!result.canceled && profile?.id) {
      const url = await uploadAvatar(profile.id, result.assets[0].uri)
      if (url) {
        await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
        onProfileUpdate()
      }
    }
  }

  async function clearTempGym() {
    await supabase.from('profiles').update({ temp_gym_id: null, temp_gym_expires_at: null }).eq('id', profile.id)
    onProfileUpdate()
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.band}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {RINGS.map(ring => (
                <View
                  key={ring.r}
                  style={{
                    position: 'absolute', left: '50%', marginLeft: -ring.r, top: BAND - ring.r,
                    width: ring.r * 2, height: ring.r * 2, borderRadius: ring.r,
                    borderWidth: 1.5, borderColor: ring.line,
                  }}
                />
              ))}
            </View>
            <TouchableOpacity style={s.gear} onPress={onOpenSettings} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.9} style={s.avatarWrap}>
            {profile?.avatar_url
              ? <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} />
              : (
                <View style={[s.avatarImg, { backgroundColor: MINT, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: GREEN, fontSize: 38, fontWeight: '800' }}>{name[0].toUpperCase()}</Text>
                </View>
              )}
            <View style={s.camBadge}>
              <Text style={{ fontSize: 13 }}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={s.name} numberOfLines={1}>{profile?.full_name || profile?.username}</Text>
          <View style={s.userPill}>
            <Text style={s.userPillText}>@{profile?.username}</Text>
          </View>
          {profile?.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}
        </View>

        {/* ── Stats ────────────────────────────────────────── */}
        <Reveal delay={60}>
          <View style={s.stats}>
            <TouchableOpacity style={s.stat} onPress={onOpenConnections} activeOpacity={0.6}><Text style={s.statNum}>{connections.length}</Text><Text style={s.statLabel}>{x.stat_connections} ›</Text></TouchableOpacity>
            <View style={s.statDivider} />
            <TouchableOpacity style={s.stat} onPress={onOpenMembers} activeOpacity={0.6}><Text style={s.statNum}>{members !== null ? members : '—'}</Text><Text style={s.statLabel}>{x.stat_members} ›</Text></TouchableOpacity>
            <View style={s.statDivider} />
            <View style={s.stat}><Text style={s.statNum}>{joined}</Text><Text style={s.statLabel}>{x.stat_joined}</Text></View>
          </View>
        </Reveal>

        {/* ── Profile strength ─────────────────────────────── */}
        <Reveal delay={140}>
          <View style={s.strength}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={s.strengthTitle}>{x.strength}</Text>
              <Text style={s.strengthPct}>{Math.round((done / checks.length) * 100)}%</Text>
            </View>
            <View style={s.segments}>
              {checks.map((c, i) => <View key={i} style={[s.segment, c.ok && { backgroundColor: GREEN }]} />)}
            </View>
            {missing.length === 0
              ? <Text style={s.strengthDone}>✓ {x.strength_done}</Text>
              : (
                <View style={s.tips}>
                  {missing.map(m => <View key={m.tip} style={s.tip}><Text style={s.tipText}>+ {m.tip}</Text></View>)}
                </View>
              )}
          </View>
        </Reveal>

        {/* ── Home gym ─────────────────────────────────────── */}
        <View style={s.gymCard}>
          <View style={s.gymIcon}>
            <Text style={{ fontSize: 22 }}>🏋️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.smallLabel}>{t.home_gym}</Text>
            <Text style={s.gymName} numberOfLines={1}>{profile?.gyms?.name || '—'}</Text>
            {profile?.gyms?.city ? <Text style={s.gymCity}>{profile.gyms.city}</Text> : null}
          </View>
        </View>

        {/* ── Goal + level ─────────────────────────────────── */}
        <View style={s.row}>
          <View style={s.tile}>
            <View style={s.goalBubble}>
              <Text style={{ fontSize: 20 }}>{GOAL_EMOJI[goal] || '✨'}</Text>
            </View>
            <Text style={s.smallLabel}>{t.primary_goal}</Text>
            <Text style={s.tileValue} numberOfLines={1}>{t[`goal_${goal}`] || '—'}</Text>
          </View>

          <View style={s.tile}>
            <View style={s.plates}>
              {[10, 16, 22].map((h, i) => (
                <View key={i} style={[s.plate, { height: h }, i < levelIdx && { backgroundColor: GREEN }]} />
              ))}
            </View>
            <Text style={s.smallLabel}>{t.experience_level}</Text>
            <Text style={s.tileValue} numberOfLines={1}>{t[`level_${profile?.experience_level}`] || '—'}</Text>
          </View>
        </View>

        {/* ── Training elsewhere ───────────────────────────── */}
        <Reveal delay={220}>
        {tempActive ? (
          <View style={s.passActive}>
            <Text style={s.passActiveLabel}>{t.training_elsewhere}</Text>
            <Text style={s.passActiveTitle}>{t.currently_at} {profile?.temp_gym?.name}</Text>
            <Text style={s.passActiveSub}>{t.until} {new Date(profile.temp_gym_expires_at).toLocaleDateString()}</Text>
            <TouchableOpacity style={s.passClear} onPress={clearTempGym} activeOpacity={0.8}>
              <Text style={s.passClearText}>{t.clear_temp_gym}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.passIdle} onPress={() => setShowTempGymPicker(true)} activeOpacity={0.8}>
            <Text style={{ fontSize: 22 }}>✈️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.passIdleTitle}>{t.training_elsewhere}</Text>
              <Text style={s.passIdleSub}>{t.training_elsewhere_sub}</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        )}
        </Reveal>

        {/* ── Gym circle ───────────────────────────────────── */}
        <Reveal delay={300}>
          <View style={{ marginTop: 22 }}>
            <Text style={s.circleTitle}>{x.circle}</Text>
            {connections.length === 0 ? (
              <View style={s.circleEmpty}>
                <Text style={s.circleEmptyText}>{x.circle_empty}</Text>
                <TouchableOpacity style={s.circleBtn} onPress={onFindPartner} activeOpacity={0.85}>
                  <Text style={s.circleBtnText}>{x.find_partner}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingTop: 12 }}>
                {connections.map(c => {
                  const nm = c.other?.full_name || c.other?.username || '?'
                  return (
                    <TouchableOpacity key={c.matchId} activeOpacity={0.7} onPress={() => onOpenProfile(c.other)} style={{ alignItems: 'center', width: 64 }}>
                      {c.other?.avatar_url
                        ? <Image source={{ uri: c.other.avatar_url }} style={s.circleAvatar} />
                        : <View style={[s.circleAvatar, { backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>{nm[0].toUpperCase()}</Text></View>}
                      <Text style={s.circleName} numberOfLines={1}>{nm.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}
          </View>
        </Reveal>
      </ScrollView>

      {showTempGymPicker && (
        <TempGymPicker
          t={t}
          profile={profile}
          onClose={() => setShowTempGymPicker(false)}
          onSaved={() => { setShowTempGymPicker(false); onProfileUpdate() }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  hero: { alignItems: 'center' },
  band: { width: '100%', height: BAND, backgroundColor: GREEN, borderRadius: 28, overflow: 'hidden' },
  gear: {
    position: 'absolute', top: 12, right: 12,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarWrap: { width: AVATAR, height: AVATAR, marginTop: -AVATAR / 2 },
  avatarImg: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, borderWidth: 4, borderColor: '#fff' },
  camBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 2.5, borderColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
  },
  name: { marginTop: 12, fontSize: 26, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.6, maxWidth: '100%' },
  userPill: { marginTop: 6, backgroundColor: MINT, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  userPillText: { color: GREEN, fontSize: 14, fontWeight: '700' },
  bio: { marginTop: 12, color: '#5f6f69', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 300 },

  gymCard: {
    marginTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: '#e3f2ec',
    shadowColor: DEEP, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  gymIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: MINT, justifyContent: 'center', alignItems: 'center' },
  smallLabel: { fontSize: 12, color: '#8a9a94', fontWeight: '500' },
  gymName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  gymCity: { fontSize: 13, color: '#8a9a94', marginTop: 1 },

  stats: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 22, paddingVertical: 16,
    borderWidth: 1, borderColor: '#e3f2ec',
    shadowColor: DEEP, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: DEEP },
  statLabel: { fontSize: 11.5, color: '#8a9a94', marginTop: 3, fontWeight: '500' },
  statDivider: { width: 1, height: 30, backgroundColor: '#e3f2ec' },

  strength: { marginTop: 12, backgroundColor: MINT, borderRadius: 22, padding: 18 },
  strengthTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  strengthPct: { fontSize: 15, fontWeight: '800', color: GREEN },
  segments: { flexDirection: 'row', gap: 6, marginTop: 12 },
  segment: { flex: 1, height: 9, borderRadius: 5, backgroundColor: '#d3e6de' },
  strengthDone: { marginTop: 12, fontSize: 13.5, color: DEEP, fontWeight: '600' },
  tips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tip: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#cfe6dc' },
  tipText: { fontSize: 13, color: DEEP, fontWeight: '600' },

  circleTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  circleAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, borderColor: GREEN },
  circleName: { marginTop: 6, fontSize: 12.5, fontWeight: '600', color: '#1a1a1a', maxWidth: 64 },
  circleEmpty: { marginTop: 10, backgroundColor: MINT, borderRadius: 20, padding: 18, alignItems: 'center' },
  circleEmptyText: { fontSize: 14, color: '#5f6f69', textAlign: 'center', lineHeight: 20 },
  circleBtn: { marginTop: 14, backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 11 },
  circleBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  tile: { flex: 1, backgroundColor: MINT, borderRadius: 22, padding: 16, minHeight: 124, justifyContent: 'flex-end' },
  goalBubble: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  tileValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  plates: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 40, marginBottom: 14 },
  plate: { width: 11, borderRadius: 4, backgroundColor: '#d3e6de' },

  passIdle: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: GREEN, borderRadius: 22, padding: 16,
  },
  passIdleTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  passIdleSub: { fontSize: 13, color: '#8a9a94', marginTop: 2 },
  chevron: { fontSize: 24, color: GREEN },

  passActive: { marginTop: 12, backgroundColor: DEEP, borderRadius: 22, padding: 18 },
  passActiveLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  passActiveTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 4 },
  passActiveSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2, marginBottom: 16 },
  passClear: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 13, alignItems: 'center' },
  passClearText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
