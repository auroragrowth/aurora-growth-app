export const dynamic = 'force-dynamic'
import InvestmentsClient from './InvestmentsClient'

export default function InvestmentsPage() {
  return <InvestmentsClient key={Date.now()} />
}
