/**
 * Unified Chat Page
 *
 * Main chat interface with two modes:
 * - Quick Query: Fast database queries with dynamic panels
 * - Deep Analysis: Comprehensive AI analysis with full reports
 */

import UnifiedChat from '../components/UnifiedChat'

export default function UnifiedChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <UnifiedChat />
    </div>
  )
}
