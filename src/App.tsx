import { useState } from 'react'
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

export default function App() {
  const [tab, setTab] = useState<Tab>('aim')

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
