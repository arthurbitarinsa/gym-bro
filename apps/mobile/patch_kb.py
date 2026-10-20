#!/usr/bin/env python3
"""Android keyboard covering inputs on every screen. Usage: python3 patch_kb.py <mobile dir>
Needs src/lib/keyboard.ts. Aborts without changes on any mismatch."""
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
        if c != 1: sys.exit(f'ABORT ({name}): expected 1 match, found {c} for:\n{o[:150]}')
        s = s.replace(o, n)
    return s
if not os.path.exists(P('src/lib/keyboard.ts')): sys.exit('ABORT: create src/lib/keyboard.ts first')
if 'KeyboardRoot' not in open(P('src/lib/keyboard.ts'), encoding='utf-8').read(): sys.exit('ABORT: src/lib/keyboard.ts is the old version, re-create it')
ac, app = load(P('App.tsx'))
if 'KeyboardRoot' in app: sys.exit('Already patched - nothing to do.')
app = apply(app, [
 ("import { StatusBar } from 'expo-status-bar'\n",
  "import { StatusBar } from 'expo-status-bar'\nimport { KeyboardRoot } from './src/lib/keyboard'\n"),
 ("      <AppInner />\n",
  "      <KeyboardRoot>\n        <AppInner />\n      </KeyboardRoot>\n"),
 ("    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>\n      <StatusBar style=\"light\" />",
  "    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>\n      <StatusBar style=\"light\" />"),
 ("      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>\n        <View style={styles.chatInputRow}>",
  "      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>\n        <View style={styles.chatInputRow}>"),
], 'App.tsx')
save(P('App.tsx'), app, ac)
print('Done: keyboard no longer covers inputs on Android (App.tsx).')
