import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export type GymLite = { id: string, name: string, city: string }

const OTHER = 'Other / My gym is not listed'
const LIMIT = 60

// Searches the gyms table on the server as you type (name or city), 60 results at most.
// The "not listed" option and the gym you already picked are always kept in the list.
export function useGymSearch(search: string, selectedId: string) {
  const [rows, setRows] = useState<GymLite[]>([])
  const [busy, setBusy] = useState(true)
  const known = useRef<Map<string, GymLite>>(new Map())
  const other = useRef<GymLite | null>(null)

  useEffect(() => {
    let live = true
    const q = search.trim().replace(/[%,()*\\]/g, ' ').trim()
    setBusy(true)
    const timer = setTimeout(async () => {
      let req = supabase.from('gyms').select('id, name, city').neq('name', OTHER)
      if (q) req = req.or(`name.ilike.%${q}%,city.ilike.%${q}%`)
      const { data } = await req.order('city').order('name').limit(LIMIT)
      if (!other.current) {
        const { data: o } = await supabase.from('gyms').select('id, name, city').eq('name', OTHER).limit(1)
        if (o && o[0]) other.current = o[0] as GymLite
      }
      if (!live) return
      const list = (data || []) as GymLite[]
      list.forEach(g => known.current.set(g.id, g))
      if (other.current) known.current.set(other.current.id, other.current)
      setRows(list)
      setBusy(false)
    }, q ? 250 : 0)
    return () => { live = false; clearTimeout(timer) }
  }, [search])

  const gyms = [...rows]
  const o = other.current
  if (o && !gyms.some(g => g.id === o.id)) gyms.push(o)
  const sel = selectedId ? known.current.get(selectedId) : undefined
  if (sel && !gyms.some(g => g.id === sel.id)) gyms.push(sel)
  return { gyms, busy }
}
