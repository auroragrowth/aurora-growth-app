/**
 * PageContainer — shared wrapper for all Aurora dashboard pages.
 * Ensures every page has identical max-width, padding and spacing.
 */
export default function PageContainer({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 ${className}`}>
      {children}
    </div>
  )
}
