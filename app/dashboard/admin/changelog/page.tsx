export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChangelogClient from './ChangelogClient'

export default async function ChangelogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  const { data: changelog } = await supabase
    .from('changelog')
    .select('*')
    .eq('is_published', true)
    .order('released_at', { ascending: false })

  return <ChangelogClient changelog={changelog || []} />
}
