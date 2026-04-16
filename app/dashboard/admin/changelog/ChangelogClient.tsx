'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Change {
  type: 'new' | 'improved' | 'fixed'
  text: string
}

interface ChangelogEntry {
  id: string
  version: string
  title: string
  description: string | null
  release_type: 'major' | 'minor' | 'patch'
  released_at: string
  is_published: boolean
  changes: Change[]
}

const TYPE_STYLES: Record<string, { label: string; colour: string; bg: string }> = {
  new:      { label: 'New',      colour: '#34d399', bg: 'rgba(52,211,153,0.10)'  },
  improved: { label: 'Improved', colour: '#38d9f5', bg: 'rgba(56,217,245,0.10)'  },
  fixed:    { label: 'Fixed',    colour: '#fbbf24', bg: 'rgba(251,191,36,0.10)'  },
}

const RELEASE_COLOURS: Record<string, string> = {
  major: '#f87171',
  minor: '#a78bfa',
  patch: '#38d9f5',
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', {
  day: '2-digit', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

export default function ChangelogClient({ changelog }: { changelog: ChangelogEntry[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    version: '',
    title: '',
    description: '',
    release_type: 'minor' as 'major' | 'minor' | 'patch',
    changes: [{ type: 'new' as 'new' | 'improved' | 'fixed', text: '' }],
  })
  const [entries, setEntries] = useState(changelog)

  const addChange = () => setForm(f => ({ ...f, changes: [...f.changes, { type: 'new', text: '' }] }))
  const removeChange = (i: number) => setForm(f => ({ ...f, changes: f.changes.filter((_, idx) => idx !== i) }))
  const updateChange = (i: number, field: string, val: string) =>
    setForm(f => ({ ...f, changes: f.changes.map((c, idx) => idx === i ? { ...c, [field]: val } : c) }))

  const save = async () => {
    if (!form.version || !form.title) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('changelog').insert({
      version: form.version,
      title: form.title,
      description: form.description || null,
      release_type: form.release_type,
      changes: form.changes.filter(c => c.text.trim()),
      is_published: true,
      released_at: new Date().toISOString(),
    }).select().single()

    if (!error && data) {
      setEntries(prev => [data, ...prev])
      setForm({ version: '', title: '', description: '', release_type: 'minor', changes: [{ type: 'new', text: '' }] })
      setShowAdd(false)
    }
    setSaving(false)
  }

  const inp = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    color: 'var(--text-1)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  } as const

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
            Changelog
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            Platform version history — {entries.length} releases
          </p>
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className="aurora-btn aurora-btn-primary aurora-btn-sm">
          + Add Release
        </button>
      </div>

      {/* Current version badge */}
      {entries[0] && (
        <div className="flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
          <span style={{ fontSize: 24 }}>🚀</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#a78bfa' }}>
              Current version
            </p>
            <p className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>
              v{entries[0].version} — {entries[0].title}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Released {fmtDate(entries[0].released_at)}
            </p>
          </div>
        </div>
      )}

      {/* Add release form */}
      {showAdd && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(56,217,245,0.2)' }}>
          <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>New Release</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-2)' }}>Version *</label>
              <input value={form.version} style={inp} placeholder="e.g. 1.8.0"
                onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-2)' }}>Release type</label>
              <select value={form.release_type} style={inp}
                onChange={e => setForm(f => ({ ...f, release_type: e.target.value as 'major' | 'minor' | 'patch' }))}>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="patch">Patch</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-2)' }}>Title *</label>
            <input value={form.title} style={inp} placeholder="Release title"
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-2)' }}>Description</label>
            <input value={form.description} style={inp} placeholder="Optional summary"
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Changes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold" style={{ color: 'var(--text-2)' }}>Changes</label>
              <button onClick={addChange} className="text-xs font-bold" style={{ color: '#38d9f5' }}>+ Add</button>
            </div>
            <div className="space-y-2">
              {form.changes.map((change, i) => (
                <div key={i} className="flex gap-2">
                  <select value={change.type} style={{ ...inp, width: 110, flexShrink: 0 }}
                    onChange={e => updateChange(i, 'type', e.target.value)}>
                    <option value="new">New</option>
                    <option value="improved">Improved</option>
                    <option value="fixed">Fixed</option>
                  </select>
                  <input value={change.text} style={inp} placeholder="Describe the change"
                    onChange={e => updateChange(i, 'text', e.target.value)} />
                  <button onClick={() => removeChange(i)}
                    style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving || !form.version || !form.title}
              className="aurora-btn aurora-btn-primary">
              {saving ? 'Saving...' : 'Publish Release'}
            </button>
            <button onClick={() => setShowAdd(false)} className="aurora-btn aurora-btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {/* Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3"
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                {/* Version badge */}
                <span className="font-bold font-mono text-lg px-3 py-1 rounded-xl"
                  style={{
                    background: `${RELEASE_COLOURS[entry.release_type]}15`,
                    border: `1px solid ${RELEASE_COLOURS[entry.release_type]}30`,
                    color: RELEASE_COLOURS[entry.release_type],
                  }}>
                  v{entry.version}
                </span>
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-1)' }}>{entry.title}</p>
                  {entry.description && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{entry.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {fmtDate(entry.released_at)}
                </p>
                <span className="text-xs font-bold capitalize"
                  style={{ color: RELEASE_COLOURS[entry.release_type] }}>
                  {entry.release_type}
                </span>
              </div>
            </div>

            {/* Changes */}
            {entry.changes?.length > 0 && (
              <div className="p-5 space-y-2">
                {entry.changes.map((change, i) => {
                  const s = TYPE_STYLES[change.type] || TYPE_STYLES.new
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ background: s.bg, color: s.colour }}>
                        {s.label}
                      </span>
                      <p className="text-sm" style={{ color: 'var(--text-2)' }}>{change.text}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
