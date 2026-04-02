'use client'

import { useState, ReactNode } from 'react'

export default function Tooltip({
  text,
  children,
}: {
  text: string
  children: ReactNode
}) {
  const [show, setShow] = useState(false)

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="w-4 h-4 rounded-full bg-white/10 text-white/40 text-[10px]
        flex items-center justify-center cursor-help select-none">
        ?
      </span>
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-3 py-2 rounded-lg bg-black/90 border border-white/10
          text-white/80 text-xs whitespace-nowrap z-50 max-w-xs
          pointer-events-none">
          {text}
        </span>
      )}
    </span>
  )
}
