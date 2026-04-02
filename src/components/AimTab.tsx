import { useState, useRef, useCallback, useEffect } from 'react'
import { DISTANCES, OPTIC_HEIGHTS, ZERO_DISTANCES, getRecommendation } from '../data/ballistics'

// ── Persistence ────────────────────────────────────────────────────────────────
function loadSetup() {
  const d = parseFloat(localStorage.getItem('setup.distance') ?? '')
  const oh = parseFloat(localStorage.getItem('setup.opticHeight') ?? '')
  const zd = parseFloat(localStorage.getItem('setup.zeroDistance') ?? '')
  return {
    distance: isNaN(d) ? 50 : d,
    opticHeight: isNaN(oh) ? 1.93 : oh,
    zeroDistance: isNaN(zd) ? 25 : zd,
  }
}

function fmt(v: number): string {
  return v % 1 === 0 ? String(Math.round(v)) : v.toFixed(2)
}

// ── Segmented Picker ───────────────────────────────────────────────────────────
function SegmentedPicker({
  label, values, selected, onChange,
}: {
  label: string
  values: number[]
  selected: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.78)' }}>
        {label}
      </span>
      <div
        className="flex rounded-xl overflow-hidden p-0.5 gap-0.5"
        style={{ background: 'rgba(0,0,0,0.22)' }}
      >
        {values.map(v => (
          <button
            key={v}
            className="flex-1 py-1.5 text-xs font-semibold rounded-[10px] transition-all"
            style={{
              background: v === selected ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: v === selected ? '#fff' : 'rgba(255,255,255,0.5)',
            }}
            onClick={() => onChange(v)}
          >
            {fmt(v)}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── USPSA Target SVG ───────────────────────────────────────────────────────────
function USPSATarget({
  holdOffsetInches,
  aimOffset,
}: {
  holdOffsetInches: number
  aimOffset: { x: number; y: number }
}) {
  // Canvas logical size
  const W = 200
  const tH = 167          // target height
  const tW = tH * 0.56   // target width
  const tX = W / 2       // target center X
  const tTop = 18        // top padding

  const pixelsPerInch = tH / 30

  // Aim dot (red) — user-controlled via thumbpad
  const aimX = tX + aimOffset.x * (tW / 2 - 8)
  const aimY = tTop + tH * 0.54 + aimOffset.y * (tH * 0.38)

  // Hit dot (green) — move upward when the recommended hold is positive
  const hitX = aimX
  const hitY = aimY - holdOffsetInches * pixelsPerInch

  // Extra vertical space if dots go out of target area
  const minY = Math.min(aimY, hitY)
  const maxY = Math.max(aimY, hitY)
  const topPad = Math.max(0, tTop - minY + 8)
  const totalH = Math.max(tTop + tH + 16, maxY + 16) + topPad

  const offsetY = topPad
  const tl = tX - tW / 2
  const top = offsetY + tTop

  const pts = [
    `${tX},${top}`,
    `${tl + tW * 0.85},${top + tH * 0.1}`,
    `${tl + tW},${top + tH * 0.42}`,
    `${tl + tW * 0.82},${top + tH}`,
    `${tl + tW * 0.18},${top + tH}`,
    `${tl},${top + tH * 0.42}`,
    `${tl + tW * 0.15},${top + tH * 0.1}`,
  ].join(' ')

  const szW = tW * 0.42
  const szH = tH * 0.28
  const szCX = tX
  const szCY = top + tH * 0.54

  return (
    <svg
      viewBox={`0 0 ${W} ${totalH}`}
      className="w-full"
      style={{ maxHeight: 240, display: 'block' }}
    >
      <rect width={W} height={totalH} rx="16" fill="rgba(0,0,0,0.18)" />
      <polygon points={pts} fill="rgb(189,148,92)" />
      <rect
        x={szCX - szW / 2} y={szCY - szH / 2}
        width={szW} height={szH}
        rx={szW * 0.09}
        fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5"
      />
      {/* Hit dot (green) */}
      <circle cx={hitX} cy={hitY + offsetY} r="5" fill="#22c55e" />
      <circle cx={hitX} cy={hitY + offsetY} r="5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
      {/* Aim dot (red) */}
      <circle cx={aimX} cy={aimY + offsetY} r="5" fill="#ef4444" />
      <circle cx={aimX} cy={aimY + offsetY} r="5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
    </svg>
  )
}

// ── Remote Thumbpad ────────────────────────────────────────────────────────────
function Thumbpad({
  value,
  onChange,
}: {
  value: { x: number; y: number }
  onChange: (v: { x: number; y: number }) => void
}) {
  const MAX = 70
  const [active, setActive] = useState(false)
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zoomAtStart = useRef({ x: 0, y: 0 })

  function clamp(x: number, y: number) {
    const dist = Math.sqrt(x * x + y * y)
    if (dist > MAX) {
      const s = MAX / dist
      return { x: (x * s) / MAX, y: (y * s) / MAX }
    }
    return { x: x / MAX, y: y / MAX }
  }

  const startDrag = useCallback((cx: number, cy: number) => {
    startPos.current = { x: cx, y: cy }
    longPressTimer.current = setTimeout(() => {
      setActive(true)
      isDragging.current = true
    }, 380)
  }, [])

  const moveDrag = useCallback((cx: number, cy: number) => {
    if (!isDragging.current) return
    onChange(clamp(cx - startPos.current.x, cy - startPos.current.y))
  }, [onChange])

  const endDrag = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    isDragging.current = false
    setActive(false)
  }, [])

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    startDrag(t.clientX, t.clientY)
  }
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    const t = e.touches[0]
    moveDrag(t.clientX, t.clientY)
  }

  // Mouse events (for desktop testing)
  useEffect(() => {
    const onMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY)
    const onUp = () => endDrag()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [moveDrag, endDrag])

  const knobX = value.x * MAX
  const knobY = value.y * MAX

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-[22px]"
      style={{ background: 'rgba(0,0,0,0.16)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.82)' }}>
          Remote
        </span>
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.22)', color: 'rgba(255,255,255,0.85)' }}
          onClick={() => onChange({ x: 0, y: 0 })}
          title="Recenter"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>

      <div
        className="relative rounded-[20px] overflow-hidden touch-none cursor-pointer select-none"
        style={{
          height: 180,
          background: active
            ? 'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))'
            : 'linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))',
          border: active
            ? '1px solid rgba(74,222,128,0.4)'
            : '1px solid rgba(255,255,255,0.1)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={endDrag}
        onMouseDown={e => startDrag(e.clientX, e.clientY)}
      >
        {/* Crosshair guides */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute rounded-full" style={{ width: 2, height: 140, background: 'rgba(255,255,255,0.1)' }} />
          <div className="absolute rounded-full" style={{ height: 2, left: 0, right: 0, background: 'rgba(255,255,255,0.1)' }} />
          <div className="absolute rounded-[18px]" style={{ width: 128, height: 128, border: '1px solid rgba(255,255,255,0.12)' }} />
        </div>

        {/* Knob */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 52, height: 52,
            top: '50%', left: '50%',
            transform: `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`,
            background: 'rgb(227,238,230)',
            border: '1px solid rgba(0,0,0,0.18)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          }}
        />

        {!active && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}
          >
            HOLD & DRAG
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AimTab() {
  const setup = loadSetup()
  const [distance, setDistance] = useState(setup.distance)
  const [opticHeight, setOpticHeight] = useState(setup.opticHeight)
  const [zeroDistance, setZeroDistance] = useState(setup.zeroDistance)
  const [aimOffset, setAimOffset] = useState({ x: 0, y: 0 })

  useEffect(() => { localStorage.setItem('setup.distance', String(distance)) }, [distance])
  useEffect(() => { localStorage.setItem('setup.opticHeight', String(opticHeight)) }, [opticHeight])
  useEffect(() => { localStorage.setItem('setup.zeroDistance', String(zeroDistance)) }, [zeroDistance])

  const rec = getRecommendation(distance, opticHeight, zeroDistance)

  const card = {
    background: 'rgba(255,255,255,0.09)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 28,
    padding: 20,
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ background: 'linear-gradient(135deg,rgb(20,28,20),rgb(46,54,46))' }}
    >
      <div className="flex flex-col gap-5 p-5 pt-safe">
        {/* Setup card */}
        <div style={card} className="flex flex-col gap-4">
          <span className="text-base font-semibold text-white">Setup</span>
          <SegmentedPicker
            label="Distance to target (yd)"
            values={DISTANCES}
            selected={distance}
            onChange={setDistance}
          />
          <SegmentedPicker
            label='Optic riser height (")'
            values={OPTIC_HEIGHTS}
            selected={opticHeight}
            onChange={setOpticHeight}
          />
          <SegmentedPicker
            label="Zero distance (yd)"
            values={ZERO_DISTANCES}
            selected={zeroDistance}
            onChange={setZeroDistance}
          />
        </div>

        {/* Recommendation card */}
        <div style={card} className="flex flex-col gap-4">
          <span className="text-base font-semibold text-white">Recommendation</span>

          {/* Stat chips */}
          <div className="flex gap-3">
            {[
              { title: 'Impact offset', value: `${rec.impactOffsetInches.toFixed(1)} in` },
              { title: 'Suggested hold', value: `${rec.holdOffsetInches.toFixed(1)} in` },
            ].map(({ title, value }) => (
              <div
                key={title}
                className="flex-1 flex flex-col gap-1.5 p-3.5 rounded-[18px]"
                style={{ background: 'rgba(0,0,0,0.18)' }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {title}
                </span>
                <span className="text-base font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>

          <Thumbpad value={aimOffset} onChange={setAimOffset} />
          <USPSATarget holdOffsetInches={rec.holdOffsetInches} aimOffset={aimOffset} />

          {/* Legend */}
          <div className="flex gap-4">
            {[
              { color: '#22c55e', label: 'Green: Hit' },
              { color: '#ef4444', label: 'Red: Aim' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ammo info */}
        <div
          className="rounded-2xl px-4 py-3 text-center text-xs"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.38)' }}
        >
          .223 Rem 55gr FMJ · Federal Premium · 3,240 fps
        </div>
      </div>
    </div>
  )
}
