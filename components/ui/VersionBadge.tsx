export default function VersionBadge() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.7.0'
  const env = process.env.NEXT_PUBLIC_APP_ENV || 'live'
  const isDev = env === 'dev'

  return (
    <div style={{ textAlign: 'center', marginTop: 16 }}>
      <span style={{
        fontSize: 11,
        color: isDev ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.25)',
        fontFamily: 'monospace',
        background: isDev ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.05)',
        padding: '3px 10px',
        borderRadius: 999,
        border: `1px solid ${isDev ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.08)'}`,
      }}>
        Aurora Growth v{version}{isDev ? ' · DEV' : ''}
      </span>
    </div>
  )
}
