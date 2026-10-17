import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Image, Modal, Vibration, StyleSheet, Platform } from 'react-native'
import { supabase } from '../lib/supabase'
import { callStrings } from '../lib/callStrings'
import { NEEDED_MESSAGES, type CallRow } from '../lib/calls'
import { LiveKit, voiceAvailable, voiceStrings } from '../lib/voice'

const GREEN = '#1D9E75'
const DEEP = '#0E6B4F'
const RED = '#E5484D'

function Face({ peer, size }: { peer: any, size: number }) {
  const name = peer?.full_name || peer?.username || '?'
  if (peer?.avatar_url) return <Image source={{ uri: peer.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)' }} />
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: GREEN, fontSize: size * 0.4, fontWeight: '800' }}>{name[0].toUpperCase()}</Text>
    </View>
  )
}

function Rings() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center' }]}>
      {[120, 180, 250, 330].map((r, i) => (
        <View key={r} style={{
          position: 'absolute', top: 210 - r, width: r * 2, height: r * 2, borderRadius: r,
          borderWidth: 1.5, borderColor: `rgba(255,255,255,${0.22 - i * 0.04})`,
        }} />
      ))}
    </View>
  )
}

// Mute / speaker buttons. Must live inside <LiveKitRoom>.
function VoiceControls({ lang }: { lang: string }) {
  const v = voiceStrings(lang)
  const { localParticipant, isMicrophoneEnabled } = LiveKit.useLocalParticipant()
  const [speaker, setSpeaker] = useState(false)

  async function toggleSpeaker() {
    const next = !speaker
    setSpeaker(next)
    try {
      const id = Platform.OS === 'ios' ? (next ? 'force_speaker' : 'default') : (next ? 'speaker' : 'earpiece')
      await LiveKit.AudioSession.selectAudioOutput(id)
    } catch (e) { setSpeaker(!next) }
  }

  const muted = !isMicrophoneEnabled
  return (
    <View style={st.row}>
      <View style={st.btnWrap}>
        <TouchableOpacity style={[st.small, muted && { backgroundColor: '#fff' }]} onPress={() => localParticipant.setMicrophoneEnabled(muted)} activeOpacity={0.85}>
          <Text style={{ fontSize: 24 }}>{muted ? '🔇' : '🎙️'}</Text>
        </TouchableOpacity>
        <Text style={st.label}>{muted ? v.unmute : v.mute}</Text>
      </View>
      <View style={st.btnWrap}>
        <TouchableOpacity style={[st.small, speaker && { backgroundColor: '#fff' }]} onPress={toggleSpeaker} activeOpacity={0.85}>
          <Text style={{ fontSize: 24 }}>🔊</Text>
        </TouchableOpacity>
        <Text style={st.label}>{v.speaker}</Text>
      </View>
    </View>
  )
}

// Fetches a LiveKit token for this call and joins the audio room.
function VoiceSession({ callId, lang }: { callId: string, lang: string }) {
  const v = voiceStrings(lang)
  const [conn, setConn] = useState<{ url: string, token: string } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    LiveKit.AudioSession.startAudioSession().catch(() => {})
    ;(async () => {
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase.functions.invoke('livekit-token', { body: { call_id: callId } })
        if (data?.token && data?.url) { if (alive) setConn({ url: data.url, token: data.token }); return }
        await new Promise(r => setTimeout(r, 1200))
      }
      if (alive) setFailed(true)
    })()
    return () => { alive = false; LiveKit.AudioSession.stopAudioSession().catch(() => {}) }
  }, [callId])

  if (failed) return <Text style={st.soon}>{v.err_voice}</Text>
  if (!conn) return <Text style={st.soon}>{v.connecting}</Text>
  return (
    <LiveKit.LiveKitRoom serverUrl={conn.url} token={conn.token} connect={true} audio={true} video={false}>
      <VoiceControls lang={lang} />
    </LiveKit.LiveKitRoom>
  )
}

// Full-screen call UI: ringing (incoming / outgoing) and active.
export function CallLayer({ lang, call, peer, myId, onRespond }: {
  lang: string
  call: CallRow | null
  peer: any
  myId: string | undefined
  onRespond: (a: 'accept' | 'decline' | 'cancel' | 'end') => void
}) {
  const s = callStrings(lang)
  const [secs, setSecs] = useState(0)
  const incoming = !!call && call.status === 'ringing' && call.callee_id === myId
  const outgoing = !!call && call.status === 'ringing' && call.caller_id === myId
  const active = !!call && call.status === 'active'

  useEffect(() => {
    if (!incoming) return
    Vibration.vibrate([0, 700, 900], true)
    return () => Vibration.cancel()
  }, [incoming, call?.id])

  useEffect(() => {
    if (!active) { setSecs(0); return }
    const start = call!.answered_at ? new Date(call!.answered_at).getTime() : Date.now()
    const tick = () => setSecs(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [active, call?.id])

  if (!call || !peer) return null
  const name = peer.full_name || peer.username || ''
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const status = incoming ? s.incoming : outgoing ? s.calling : `${mm}:${ss}`

  return (
    <Modal visible animationType="slide" statusBarTranslucent>
      <View style={st.screen}>
        <Rings />
        <View style={st.top}>
          <Text style={st.kind}>{s.voice_call}</Text>
          <View style={{ marginTop: 40 }}><Face peer={peer} size={120} /></View>
          <Text style={st.name} numberOfLines={1}>{name}</Text>
          <Text style={st.status}>{status}</Text>
          {active && !voiceAvailable && <Text style={st.soon}>{s.voice_soon}</Text>}
        </View>

        <View style={st.bottom}>
          {active && voiceAvailable && <View style={{ marginBottom: 36 }}><VoiceSession callId={call!.id} lang={lang} /></View>}
          {incoming ? (
            <View style={st.row}>
              <View style={st.btnWrap}>
                <TouchableOpacity style={[st.round, { backgroundColor: RED }]} onPress={() => onRespond('decline')} activeOpacity={0.85}>
                  <Text style={st.icon}>✕</Text>
                </TouchableOpacity>
                <Text style={st.label}>{s.decline}</Text>
              </View>
              <View style={st.btnWrap}>
                <TouchableOpacity style={[st.round, { backgroundColor: '#fff' }]} onPress={() => onRespond('accept')} activeOpacity={0.85}>
                  <Text style={[st.icon, { color: GREEN }]}>📞</Text>
                </TouchableOpacity>
                <Text style={st.label}>{s.accept}</Text>
              </View>
            </View>
          ) : (
            <View style={st.btnWrap}>
              <TouchableOpacity style={[st.round, { backgroundColor: RED }]} onPress={() => onRespond(active ? 'end' : 'cancel')} activeOpacity={0.85}>
                <Text style={st.icon}>✕</Text>
              </TouchableOpacity>
              <Text style={st.label}>{s.end_call}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

// Shown when the Call button is still locked: progress towards 5 messages each.
export function CallLockedSheet({ lang, name, mine, theirs, onClose }: {
  lang: string, name: string, mine: number, theirs: number, onClose: () => void
}) {
  const s = callStrings(lang)
  const bar = (label: string, n: number) => (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={ls.who}>{label}</Text>
        <Text style={ls.count}>{Math.min(n, NEEDED_MESSAGES)}/{NEEDED_MESSAGES} {s.messages}</Text>
      </View>
      <View style={ls.segments}>
        {Array.from({ length: NEEDED_MESSAGES }).map((_, i) => <View key={i} style={[ls.seg, i < n && { backgroundColor: GREEN }]} />)}
      </View>
    </View>
  )
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={ls.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={ls.card}>
          <Text style={{ fontSize: 34, textAlign: 'center' }}>🔒</Text>
          <Text style={ls.title}>{s.locked_title}</Text>
          <Text style={ls.sub}>{s.locked_sub} {name}.</Text>
          {bar(s.you, mine)}
          {bar(name.split(' ')[0], theirs)}
          <TouchableOpacity style={ls.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={ls.btnText}>{s.ok}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DEEP, justifyContent: 'space-between', overflow: 'hidden' },
  top: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 24 },
  kind: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  name: { marginTop: 22, color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.6, maxWidth: '100%' },
  status: { marginTop: 8, color: 'rgba(255,255,255,0.85)', fontSize: 18, fontWeight: '600' },
  soon: { marginTop: 18, color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  bottom: { alignItems: 'center', paddingBottom: 70 },
  row: { flexDirection: 'row', gap: 70 },
  btnWrap: { alignItems: 'center', gap: 10 },
  small: { width: 62, height: 62, borderRadius: 31, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  round: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  icon: { color: '#fff', fontSize: 28, fontWeight: '700' },
  label: { color: 'rgba(255,255,255,0.85)', fontSize: 13.5, fontWeight: '600' },
})

const ls = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 26, padding: 24 },
  title: { marginTop: 10, fontSize: 19, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  sub: { marginTop: 8, fontSize: 14.5, color: '#5f6f69', textAlign: 'center', lineHeight: 21 },
  who: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  count: { fontSize: 13, color: '#8a9a94', fontWeight: '600' },
  segments: { flexDirection: 'row', gap: 6, marginTop: 8 },
  seg: { flex: 1, height: 9, borderRadius: 5, backgroundColor: '#d3e6de' },
  btn: { marginTop: 24, backgroundColor: GREEN, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
