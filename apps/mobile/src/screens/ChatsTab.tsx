import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native'
import type { Conversation } from '../lib/inbox'
import { inboxStrings } from '../lib/inboxStrings'
import type { SessionRow } from '../lib/sessions'
import { UpcomingStrip } from './SessionUI'

const GREEN = '#1D9E75'
const DEEP = '#0E6B4F'
const MINT = '#f0faf6'

function Face({ url, name, size }: { url?: string | null, name?: string, size: number }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{(name || '?')[0].toUpperCase()}</Text>
    </View>
  )
}

function when(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export default function ChatsTab({ lang, conversations, myId, onOpenChat, onOpenProfile, upcoming = [] }: {
  upcoming?: SessionRow[]
  lang: string
  conversations: Conversation[]
  myId: string | undefined
  onOpenChat: (matchId: string, other: any) => void
  onOpenProfile: (user: any) => void
}) {
  const s = inboxStrings(lang)
  const fresh = conversations.filter(c => !c.last)
  const talking = conversations
    .filter(c => !!c.last)
    .sort((a, b) => new Date(b.last!.created_at).getTime() - new Date(a.last!.created_at).getTime())

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Text style={st.title}>{s.chats}</Text>

      <UpcomingStrip lang={lang} items={upcoming} myId={myId} onOpen={(matchId) => { const c = conversations.find(x => x.matchId === matchId); if (c) onOpenChat(c.matchId, c.other) }} />

      {fresh.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <Text style={st.section}>{s.new_connections}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
            {fresh.map(c => (
              <TouchableOpacity key={c.matchId} style={st.fresh} onPress={() => onOpenChat(c.matchId, c.other)} activeOpacity={0.8}>
                <View style={st.ring}><Face url={c.other?.avatar_url} name={c.other?.full_name || c.other?.username} size={58} /></View>
                <Text style={st.freshName} numberOfLines={1}>{(c.other?.full_name || c.other?.username || '').split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {conversations.length === 0 && (
        <View style={st.empty}>
          <Text style={{ fontSize: 48, marginBottom: 14 }}>💬</Text>
          <Text style={st.emptyTitle}>{s.no_chats}</Text>
          <Text style={st.emptySub}>{s.no_chats_sub}</Text>
        </View>
      )}

      {talking.length > 0 && (
        <View style={{ marginTop: 22, paddingHorizontal: 20 }}>
          {talking.map(c => {
            const mine = c.last!.sender_id === myId
            const unread = c.unread > 0
            return (
              <TouchableOpacity key={c.matchId} style={st.row} onPress={() => onOpenChat(c.matchId, c.other)} activeOpacity={0.7}>
                <TouchableOpacity onPress={() => onOpenProfile(c.other)} activeOpacity={0.8}>
                  <Face url={c.other?.avatar_url} name={c.other?.full_name || c.other?.username} size={54} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[st.name, unread && { color: '#000' }]} numberOfLines={1}>{c.other?.full_name || c.other?.username}</Text>
                    <Text style={[st.time, unread && { color: GREEN, fontWeight: '700' }]}>{when(c.last!.created_at)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
                    <Text style={[st.preview, unread && { color: '#1a1a1a', fontWeight: '600' }]} numberOfLines={1}>
                      {mine ? s.you : ''}{c.last!.content}
                    </Text>
                    {unread && (
                      <View style={st.badge}><Text style={st.badgeText}>{c.unread > 9 ? '9+' : c.unread}</Text></View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const st = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.8, paddingHorizontal: 20 },
  section: { fontSize: 13, fontWeight: '700', color: '#8a9a94', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 12 },
  fresh: { alignItems: 'center', width: 70 },
  ring: { padding: 3, borderRadius: 40, borderWidth: 2.5, borderColor: GREEN },
  freshName: { marginTop: 6, fontSize: 13, fontWeight: '600', color: '#1a1a1a', maxWidth: 70 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f5f4' },
  name: { flex: 1, fontSize: 16.5, fontWeight: '700', color: '#2a2a2a', marginRight: 8 },
  time: { fontSize: 12.5, color: '#9aa8a2' },
  preview: { flex: 1, fontSize: 14.5, color: '#8a9a94' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: GREEN, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: '#1a1a1a' },
  emptySub: { marginTop: 8, fontSize: 14.5, color: '#8a9a94', textAlign: 'center', lineHeight: 21 },
})
