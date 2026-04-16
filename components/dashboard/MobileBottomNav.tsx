'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MOBILE_NAV = [
  { href: '/dashboard',                        icon: '⌂',  label: 'Home' },
  { href: '/dashboard/market-scanner',          icon: '📡', label: 'Scanner' },
  { href: '/dashboard/watchlist',               icon: '⭐', label: 'Watchlist' },
  { href: '/dashboard/investments/calculator',  icon: '🪜', label: 'Calculator' },
  { href: '/dashboard/investments',             icon: '💰', label: 'Investments' },
  { href: '/dashboard/account',                 icon: '👤', label: 'Account' },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center
        justify-around px-1"
      style={{
        background: 'linear-gradient(180deg, rgba(4,14,30,0.98), rgba(5,18,39,0.98))',
        borderTop: '1px solid rgba(34,211,238,0.1)',
        height: 64,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {MOBILE_NAV.map(item => {
        const isActive = item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-0.5
              flex-1 py-2 rounded-xl transition-all"
            style={{
              color: isActive ? '#38d9f5' : 'rgba(255,255,255,0.45)',
              background: isActive ? 'rgba(56,217,245,0.08)' : 'transparent',
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              paddingLeft: 2,
              paddingRight: 2,
            }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
