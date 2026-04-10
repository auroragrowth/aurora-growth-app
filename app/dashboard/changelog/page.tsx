import { createClient } from '@supabase/supabase-js'

async function getChangelog() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data } = await supabase
    .from('changelog')
    .select('*')
    .order('released_at', { ascending: false })
  return data || []
}

const TYPE_STYLES: Record<string, string> = {
  major: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
  minor: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300',
  patch: 'bg-green-500/20 border-green-500/30 text-green-300',
}

const TYPE_LABELS: Record<string, string> = {
  major: 'Major',
  minor: 'Feature',
  patch: 'Patch',
}

export default async function ChangelogPage() {
  const changelog = await getChangelog()
  const latest = changelog[0]

  return (
    <div className="p-6 mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Changelog</h1>
          <p className="text-white/50 text-sm mt-1">
            Aurora Growth Academy release history
          </p>
        </div>
        {latest && (
          <div className="text-right">
            <p className="text-white/30 text-xs uppercase tracking-wider">
              Current version
            </p>
            <p className="text-cyan-400 font-bold text-lg">
              v{latest.version}
            </p>
          </div>
        )}
      </div>

      {/* Version cards */}
      <div className="space-y-4">
        {changelog.map((entry: any, i: number) => {
          const changes = Array.isArray(entry.changes)
            ? entry.changes
            : typeof entry.changes === 'string'
              ? JSON.parse(entry.changes)
              : []

          return (
            <div
              key={entry.id || i}
              className={`rounded-2xl border p-6 ${
                i === 0
                  ? 'bg-white/5 border-cyan-400/20'
                  : 'bg-white/3 border-white/10'
              }`}
            >
              {/* Version header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-lg">
                      v{entry.version}
                    </span>
                    {i === 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs
                        font-bold bg-cyan-400/20 border border-cyan-400/30
                        text-cyan-300">
                        LATEST
                      </span>
                    )}
                  </div>
                  {entry.release_type && (
                    <span className={`px-2 py-0.5 rounded-full text-xs
                      font-bold border ${TYPE_STYLES[entry.release_type] || TYPE_STYLES.patch}`}>
                      {TYPE_LABELS[entry.release_type] || entry.release_type}
                    </span>
                  )}
                </div>
                <span className="text-white/30 text-sm">
                  {new Date(entry.released_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-white font-bold text-base mb-3">
                {entry.title}
              </h2>

              {/* Changes list */}
              {changes.length > 0 && (
                <ul className="space-y-1.5">
                  {changes.map((change: string, j: number) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-white/60">
                      <span className="text-cyan-400 mt-0.5 flex-shrink-0">✓</span>
                      {change}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-white/5">
        <p className="text-white/20 text-xs">
          Aurora Growth Academy · Built with care ·
          Questions? Use the Aurora Assistant chat
        </p>
      </div>
    </div>
  )
}
