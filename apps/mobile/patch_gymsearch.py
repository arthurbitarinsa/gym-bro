#!/usr/bin/env python3
"""Gym pickers search the database as you type instead of loading everything (1000-row cap).
Usage: python3 patch_gymsearch.py <mobile dir>   Needs src/lib/gymSearch.ts. Aborts without changes on mismatch."""
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
        if c != 1: sys.exit(f'ABORT ({name}): expected 1 match, found {c} for:\n{o[:170]}')
        s = s.replace(o, n)
    return s
if not os.path.exists(P('src/lib/gymSearch.ts')): sys.exit('ABORT: create src/lib/gymSearch.ts first')
ac, app = load(P('App.tsx')); sc, se = load(P('src/screens/SettingsScreen.tsx'))
if 'useGymSearch' in app: sys.exit('Already patched - nothing to do.')
LOAD = "  useEffect(() => {\n    supabase.from('gyms').select('id, name, city').order('city').then(({ data }) => { if (data) setGyms(data) })\n  }, [])\n"
GT = "  const [gyms, setGyms] = useState<{ id: string, name: string, city: string }[]>([])\n"
FILT = "  const filteredGyms = search.length > 0\n    ? gyms.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.city.toLowerCase().includes(search.toLowerCase()))\n    : gyms\n"

app = apply(app, [
 ("import { supabase } from './src/lib/supabase'\n",
  "import { supabase } from './src/lib/supabase'\nimport { useGymSearch } from './src/lib/gymSearch'\n"),
 # OnboardingGym
 ("  const [selectedGymId, setSelectedGymId] = useState('')\n" + GT + "  const [search, setSearch] = useState('')\n  const [customGym",
  "  const [selectedGymId, setSelectedGymId] = useState('')\n  const [search, setSearch] = useState('')\n  const [customGym"),
 ("  const [loading, setLoading] = useState(false)\n\n" + LOAD + "\n  const isOther",
  "  const [loading, setLoading] = useState(false)\n  const { gyms, busy: gymsBusy } = useGymSearch(search, selectedGymId)\n\n  const isOther"),
 ("  const searched = search.length > 0 ? gyms.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.city.toLowerCase().includes(search.toLowerCase())) : gyms\n",
  "  const searched = gyms\n"),
 ("        {gyms.length === 0 && <ActivityIndicator color=\"#1D9E75\" style={{ marginTop: 20 }} />}\n",
  "        {gymsBusy && <ActivityIndicator color=\"#1D9E75\" style={{ marginTop: 20 }} />}\n"),
 # TempGymPickerModal
 (GT + "  const [search, setSearch] = useState('')\n  const [selectedGymId, setSelectedGymId] = useState('')\n  const [duration",
  "  const [search, setSearch] = useState('')\n  const [selectedGymId, setSelectedGymId] = useState('')\n  const { gyms } = useGymSearch(search, selectedGymId)\n  const [duration"),
 ("  const [saving, setSaving] = useState(false)\n\n" + LOAD + "\n" + FILT + "\n  async function handleSave() {\n    if (!selectedGymId)",
  "  const [saving, setSaving] = useState(false)\n\n  const filteredGyms = gyms\n\n  async function handleSave() {\n    if (!selectedGymId)"),
], 'App.tsx')

se = apply(se, [
 ("import { supabase } from '../lib/supabase'\n",
  "import { supabase } from '../lib/supabase'\nimport { useGymSearch } from '../lib/gymSearch'\n"),
 (GT + "  const [pickingGym, setPickingGym] = useState(false)\n  const [search, setSearch] = useState('')\n  const [saving, setSaving] = useState(false)\n\n" + LOAD + "\n" + FILT + "\n  async function handleSave() {\n    const cleanName",
  "  const [pickingGym, setPickingGym] = useState(false)\n  const [search, setSearch] = useState('')\n  const { gyms } = useGymSearch(search, gymId)\n  const [saving, setSaving] = useState(false)\n\n  const filteredGyms = gyms\n\n  async function handleSave() {\n    const cleanName"),
], 'SettingsScreen.tsx')
save(P('App.tsx'), app, ac); save(P('src/screens/SettingsScreen.tsx'), se, sc)
print('Done: gym pickers now search the database as you type.')
