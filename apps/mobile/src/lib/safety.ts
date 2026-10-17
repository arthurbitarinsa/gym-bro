import { supabase } from './supabase'

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'unsafe' | 'other'

// People I blocked + people who blocked me. Fails open (empty list) so the app still works
// if the safety SQL has not been run yet.
export async function getHiddenIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('hidden_user_ids')
    if (error || !Array.isArray(data)) return []
    return data as string[]
  } catch {
    return []
  }
}

export async function blockUser(blockedId: string, name: string): Promise<boolean> {
  const { error } = await supabase.from('user_blocks').insert({ blocked_id: blockedId, blocked_name: name })
  return !error || error.code === '23505' // already blocked counts as success
}

export async function unblockUser(blockedId: string): Promise<boolean> {
  const { error } = await supabase.from('user_blocks').delete().eq('blocked_id', blockedId)
  return !error
}

export async function getBlockedUsers(): Promise<{ blocked_id: string, blocked_name: string | null }[]> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id, blocked_name')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as { blocked_id: string, blocked_name: string | null }[]
}

export async function reportUser(p: {
  reportedId: string
  name: string
  reason: ReportReason
  details?: string
  context?: string
}): Promise<boolean> {
  const { error } = await supabase.from('reports').insert({
    reported_id: p.reportedId,
    reported_name: p.name,
    reason: p.reason,
    details: p.details?.trim() ? p.details.trim().slice(0, 1000) : null,
    context: p.context ? p.context.slice(0, 4000) : null,
  })
  return !error
}
