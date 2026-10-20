#!/usr/bin/env python3
"""Cancel a sent connection request (Requests tab, Discover, gym members, profile).
Usage: python3 patch_cancel.py <mobile dir>   Needs src/lib/cancelRequest.ts. Aborts without changes on any mismatch."""
import sys, os
base = sys.argv[1]
def P(rel): return os.path.join(base, rel)
def load(p):
    raw = open(p, encoding='utf-8', newline='').read()
    return '\r\n' in raw, raw.replace('\r\n', '\n')
def save(p, s, crlf):
    open(p, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
def apply(s, edits, name):
    for o, n in edits:
        c = s.count(o)
        if c != 1: sys.exit(f'ABORT ({name}): expected 1 match, found {c} for:\n{o[:160]}')
        s = s.replace(o, n)
    return s
if not os.path.exists(P('src/lib/cancelRequest.ts')): sys.exit('ABORT: create src/lib/cancelRequest.ts first')
ac, app = load(P('App.tsx')); uc, up = load(P('src/screens/UserProfile.tsx')); gc, gm = load(P('src/screens/GymMembers.tsx'))
if 'cancelRequest' in app: sys.exit('Already patched - nothing to do.')

app = apply(app, [
 ("import { inboxStrings } from './src/lib/inboxStrings'\n",
  "import { inboxStrings } from './src/lib/inboxStrings'\nimport { askCancel, cancelStrings } from './src/lib/cancelRequest'\n"),

 # --- Discover ---
 ("  const [sentRequests, setSentRequests] = useState<string[]>([])\n  const [actionsFor, setActionsFor]",
  "  const [sentRequests, setSentRequests] = useState<string[]>([])\n  const cx = cancelStrings(lang)\n  const [actionsFor, setActionsFor]"),
 ("  useEffect(() => { loadBros() }, [activeGymId])\n",
  "  useEffect(() => { loadBros(); loadSent() }, [activeGymId])\n\n"
  "  // Remember which requests are still pending, so the button is right after a reload.\n"
  "  async function loadSent() {\n"
  "    const me = session?.user.id\n"
  "    if (!me) return\n"
  "    const { data } = await supabase.from('matches').select('user_a, user_b').eq('initiated_by', me).eq('status', 'pending')\n"
  "    if (data) setSentRequests(data.map((m: any) => (m.user_a === me ? m.user_b : m.user_a)))\n"
  "  }\n\n"
  "  function cancelSent(bro: any) {\n"
  "    askCancel(lang, bro.full_name || bro.username, bro.id, r => {\n"
  "      if (r === 'cancelled') setSentRequests(prev => prev.filter(x => x !== bro.id))\n"
  "    })\n"
  "  }\n"),
 ("            <TouchableOpacity style={[styles.connectBtn, sent && styles.connectBtnSent]} onPress={() => !sent && sendRequest(bro.id)} activeOpacity={0.8}>\n"
  "              <Text style={[styles.connectBtnText, sent && styles.connectBtnTextSent]}>{sent ? t.request_sent : t.connect}</Text>\n"
  "            </TouchableOpacity>\n",
  "            <View style={{ flexDirection: 'row', gap: 10 }}>\n"
  "              <TouchableOpacity style={[styles.connectBtn, { flex: 1 }, sent && styles.connectBtnSent]} onPress={() => !sent && sendRequest(bro.id)} activeOpacity={sent ? 1 : 0.8}>\n"
  "                <Text style={[styles.connectBtnText, sent && styles.connectBtnTextSent]}>{sent ? t.request_sent : t.connect}</Text>\n"
  "              </TouchableOpacity>\n"
  "              {sent && (\n"
  "                <TouchableOpacity style={styles.cancelReqBtn} onPress={() => cancelSent(bro)} activeOpacity={0.7}>\n"
  "                  <Text style={styles.cancelReqText}>{cx.cancel_short}</Text>\n"
  "                </TouchableOpacity>\n"
  "              )}\n"
  "            </View>\n"),

 # --- Requests tab ---
 ("  const ix = inboxStrings(lang)\n  const [matches, setMatches] = useState<any[]>([])\n",
  "  const ix = inboxStrings(lang)\n  const cx = cancelStrings(lang)\n  const [matches, setMatches] = useState<any[]>([])\n"),
 ("  useEffect(() => { loadMatches() }, [])\n",
  "  useEffect(() => {\n"
  "    loadMatches()\n"
  "    // Live: a request sent to me can be withdrawn while this list is open.\n"
  "    const ch = supabase.channel(`requests:${session?.user.id}`)\n"
  "      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => { loadMatches() })\n"
  "      .subscribe()\n"
  "    return () => { supabase.removeChannel(ch) }\n"
  "  }, [])\n"),
 ("  async function acceptMatch(matchId: string) {\n",
  "  function cancelOutgoing(other: any, matchId: string) {\n"
  "    if (!other?.id) return\n"
  "    askCancel(lang, other.full_name || other.username || '', other.id, r => {\n"
  "      if (r === 'cancelled') setMatches(prev => prev.filter(m => m.id !== matchId))\n"
  "      else if (r === 'accepted') loadMatches()\n"
  "      if (r !== 'error') onChanged()\n"
  "    })\n"
  "  }\n\n"
  "  async function acceptMatch(matchId: string) {\n"),
 ("            {isAccepted && <Text style={{ fontSize: 20, color: '#ccc' }}>›</Text>}\n",
  "            {isPending && !isIncoming && (\n"
  "              <TouchableOpacity style={styles.cancelReqBtn} onPress={() => cancelOutgoing(other, match.id)} activeOpacity={0.7}>\n"
  "                <Text style={styles.cancelReqText}>{cx.cancel_short}</Text>\n"
  "              </TouchableOpacity>\n"
  "            )}\n"
  "            {isAccepted && <Text style={{ fontSize: 20, color: '#ccc' }}>›</Text>}\n"),
 ("  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },\n",
  "  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },\n"
  "  cancelReqBtn: { borderWidth: 1, borderColor: '#d9d9d9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },\n"
  "  cancelReqText: { color: '#666', fontSize: 13, fontWeight: '600' },\n"),
], 'App.tsx')

up = apply(up, [
 ("import UserActionsSheet from './SafetySheet'\n",
  "import UserActionsSheet from './SafetySheet'\nimport { askCancel, cancelStrings } from '../lib/cancelRequest'\n"),
 ("  const x = inboxStrings(lang)\n  const [p, setP]",
  "  const x = inboxStrings(lang)\n  const cx = cancelStrings(lang)\n  const [p, setP]"),
 ("  async function accept() {\n",
  "  function cancel() {\n"
  "    if (!p?.id) return\n"
  "    askCancel(lang, name, p.id, r => {\n"
  "      if (r === 'cancelled') { setMatch(null); onChanged() }\n"
  "      else if (r === 'accepted') { setMatch(m => (m ? { ...m, status: 'accepted' } : m)); onChanged() }\n"
  "    })\n"
  "  }\n\n"
  "  async function accept() {\n"),
 ("        {state === 'out' && (\n"
  "          <View style={[st.cta, st.ctaSent]}><Text style={[st.ctaText, { color: GREEN }]}>{t.request_sent}</Text></View>\n"
  "        )}\n",
  "        {state === 'out' && (\n"
  "          <View style={{ flexDirection: 'row', gap: 10 }}>\n"
  "            <View style={[st.cta, st.ctaSent, { flex: 1 }]}><Text style={[st.ctaText, { color: GREEN }]}>{t.request_sent}</Text></View>\n"
  "            <TouchableOpacity style={[st.cta, st.ctaCancel]} activeOpacity={0.7} onPress={cancel}>\n"
  "              <Text style={[st.ctaText, { color: '#666', fontSize: 15 }]}>{cx.cancel_short}</Text>\n"
  "            </TouchableOpacity>\n"
  "          </View>\n"
  "        )}\n"),
 ("  ctaSent: { backgroundColor: MINT },\n",
  "  ctaSent: { backgroundColor: MINT },\n  ctaCancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 22 },\n"),
], 'UserProfile.tsx')

gm = apply(gm, [
 ("import { inboxStrings } from '../lib/inboxStrings'\n",
  "import { inboxStrings } from '../lib/inboxStrings'\nimport { askCancel } from '../lib/cancelRequest'\n"),
 ("  function row(p: any, visiting: boolean) {\n",
  "  function cancelSent(p: any) {\n"
  "    askCancel(lang, p.full_name || p.username || '', p.id, r => {\n"
  "      if (r === 'cancelled') setRequested(prev => prev.filter(x => x !== p.id))\n"
  "    })\n"
  "  }\n\n"
  "  function row(p: any, visiting: boolean) {\n"),
 ("onPress={() => !sent && connect(p.id)} activeOpacity={0.8}>\n            <Text style={[st.btnText, sent && { color: GREEN }]}>{sent ? t.request_sent : t.connect}</Text>",
  "onPress={() => (sent ? cancelSent(p) : connect(p.id))} activeOpacity={0.8}>\n            <Text style={[st.btnText, sent && { color: GREEN }]}>{sent ? `${t.request_sent} ✕` : t.connect}</Text>"),
], 'GymMembers.tsx')

save(P('App.tsx'), app, ac); save(P('src/screens/UserProfile.tsx'), up, uc); save(P('src/screens/GymMembers.tsx'), gm, gc)
print('Done: cancel request added to App.tsx, UserProfile.tsx, GymMembers.tsx')
