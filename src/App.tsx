import { useState, useEffect } from 'react'
import AimTab from './components/AimTab'
import MapTab from './components/MapTab'
import ScopeTab from './components/ScopeTab'

type Tab = 'aim' | 'map' | 'scope'

function TargetIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} className="w-6 h-6">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} className="w-6 h-6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}

function ScopeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} className="w-6 h-6" strokeLinecap="round">
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="4" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="20" />
      <line x1="4" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="20" y2="12" />
    </svg>
  )
}

const ACTIVE_COLOR = 'rgb(235, 245, 224)'
const MOBILE_BREAKPOINT = 480

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

function NotMobileScreen() {
  return (
    <div
      className="h-full flex items-center justify-center p-8"
      style={{ background: 'linear-gradient(135deg,rgb(20,28,20),rgb(46,54,46))' }}
    >
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        {/* Phone icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(235,245,224,0.8)" strokeWidth="1.8" className="w-8 h-8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <circle cx="12" cy="17" r="1" fill="rgba(235,245,224,0.8)" stroke="none" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold text-white">Mobile Only</span>
          <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Where2Aim is designed for phones. Open it on your mobile device to get started.
          </span>
        </div>

        <div
          className="w-full px-4 py-3 rounded-2xl text-xs text-center"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
        >
          .223 Rem · Ballistics · Map · Scope
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<Tab>('aim')

  if (!isMobile) return <NotMobileScreen />

  const tabs: { id: Tab; label: string; Icon: typeof TargetIcon }[] = [
    { id: 'aim', label: 'Aim', Icon: TargetIcon },
    { id: 'map', label: 'Map', Icon: MapIcon },
    { id: 'scope', label: 'Scope', Icon: ScopeIcon },
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: '#141c14' }}>
      {/* Content area */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <div className={`${tab === 'aim' ? 'flex' : 'hidden'} flex-col h-full`}>
          <AimTab />
        </div>
        <div className={`${tab === 'map' ? 'flex' : 'hidden'} flex-col h-full`}>
          <MapTab />
        </div>
        <div className={`${tab === 'scope' ? 'flex' : 'hidden'} flex-col h-full`}>
          <ScopeTab active={tab === 'scope'} />
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex-shrink-0 flex pb-safe"
        style={{
          background: 'rgba(10,14,10,0.85)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {tabs.map(({ id, label, Icon }) => {
          const isActive = tab === id
          return (
            <button
              key={id}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-opacity active:opacity-60"
              style={{ color: isActive ? ACTIVE_COLOR : 'rgba(255,255,255,0.4)' }}
              onClick={() => setTab(id)}
            >
              <Icon active={isActive} />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
