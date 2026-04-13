'use client'
import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      onClick={toggle}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className="flex items-center gap-2 transition-all duration-200
        hover:opacity-80 active:scale-95 select-none"
      style={{ padding: '6px 10px', borderRadius: '12px',
        background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {/* Track */}
      <div style={{
        position: 'relative', width: '40px', height: '22px',
        borderRadius: '11px', transition: 'background 0.3s',
        background: isLight
          ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
          : 'linear-gradient(90deg, #1e1b4b, #4338ca)',
      }}>
        {/* Thumb */}
        <div style={{
          position: 'absolute', top: '3px', width: '16px', height: '16px',
          borderRadius: '50%', background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          transition: 'left 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          left: isLight ? '21px' : '3px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px',
        }}>
          {isLight ? '☀️' : '🌙'}
        </div>
      </div>

      {/* Label */}
      <span style={{
        fontSize: '12px', fontWeight: 700,
        color: isLight ? '#374151' : 'rgba(255,255,255,0.45)',
        display: 'none',
      }}
        className="sm:block hidden"
      >
        {isLight ? 'Light' : 'Dark'}
      </span>
    </button>
  )
}
