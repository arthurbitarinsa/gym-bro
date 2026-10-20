#!/usr/bin/env python3
"""Wire the Logbook into the chat. Usage: python3 patch_logbook.py <mobile dir>
Needs src/screens/LogbookUI.tsx, src/lib/logbook.ts, logbookStrings.ts, exercises.ts. Aborts without changes on any mismatch."""
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
for f in ('src/screens/LogbookUI.tsx', 'src/lib/logbook.ts', 'src/lib/logbookStrings.ts', 'src/lib/exercises.ts'):
    if not os.path.exists(P(f)): sys.exit(f'ABORT: create {f} first')
sc, ses = load(P('src/screens/SessionUI.tsx'))
if 'LogbookUI' in ses: sys.exit('Already patched - nothing to do.')

ses = apply(ses, [
 ("import type { SessionRow, SessionsApi } from '../lib/sessions'\n",
  "import type { SessionRow, SessionsApi } from '../lib/sessions'\nimport Logbook, { LogbookRow } from './LogbookUI'\n"),
 ("      {log && cur && <LogSheet lang={lang} session={cur} myId={myId} otherName={otherName} onClose={() => setLog(false)} />}\n",
  "      {log && <Logbook lang={lang} matchId={matchId} myId={myId} otherName={otherName} onClose={() => setLog(false)} />}\n"),
 ("      <View style={[st.bar, cur?.status === 'proposed' && cur.awaiting_id === myId && { backgroundColor: '#FFF6E5' }]}>{body}</View>\n",
  "      <View style={[st.bar, cur?.status === 'proposed' && cur.awaiting_id === myId && { backgroundColor: '#FFF6E5' }]}>{body}</View>\n"
  "      <LogbookRow lang={lang} matchId={matchId} myId={myId} onPress={() => setLog(true)} />\n"),
], 'SessionUI.tsx')
save(P('src/screens/SessionUI.tsx'), ses, sc)
print('Done: Logbook wired into the chat (SessionUI.tsx).')
