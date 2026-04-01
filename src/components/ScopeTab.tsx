import { useEffect, useRef, useState, useCallback } from 'react'

// Range distances in yards
const DISTANCES = [50, 100, 150, 200, 250, 300]
// Height of a 5′9″ person in metres
const PERSON_HEIGHT_M = 1.7526
const YARDS_TO_METERS = 0.9144
// Default camera FOV (horizontal, which maps to vertical in portrait via resizeAspectFill)
const DEFAULT_FOV_DEG = 65.0
const MIN_ZOOM = 1.0
const MAX_ZOOM = 8.0

/** Returns how many CSS pixels tall a 5′9″ person appears at `distYards` yards. */
function lineHeightPx(distYards: number, containerH: number, fovDeg: number, zoom: number): number {
  const vFovRad = (fovDeg * Math.PI) / 180
  const distM = distYards * YARDS_TO_METERS
  const fraction = PERSON_HEIGHT_M / (distM * 2 * Math.tan(vFovRad / 2))
  return Math.max(4, fraction * containerH * zoom)
}

type Permission = 'prompt' | 'granted' | 'denied'

function PermissionCard({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div
      className="flex flex-col gap-4 p-6 rounded-[28px]"
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span className="text-xl font-bold text-white">{title}</span>
      <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.76)' }}>{body}</span>
      {action && (
        <button
          className="py-3.5 rounded-[18px] text-base font-bold text-black"
          style={{ background: 'rgb(227,237,230)' }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default function ScopeTab({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [permission, setPermission] = useState<Permission>('prompt')
  const [zoom, setZoom] = useState(2.0)
  const [containerH, setContainerH] = useState(600)

  // Pinch gesture state
  const pinchStartDist = useRef<number | null>(null)
  const zoomAtPinchStart = useRef(2.0)

  // ── Update container height ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height
      if (h) setContainerH(h)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Camera lifecycle ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      setPermission('granted')
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setPermission('denied')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (active) {
      startCamera()
    } else {
      stopCamera()
    }
    return stopCamera
  }, [active, startCamera, stopCamera])

  // Attach stream to video when permission granted and video mounts
  useEffect(() => {
    if (permission === 'granted' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [permission])

  // ── Pinch-to-zoom ────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchStartDist.current = Math.sqrt(dx * dx + dy * dy)
      zoomAtPinchStart.current = zoom
    }
  }, [zoom])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || pinchStartDist.current === null) return
    e.preventDefault()
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const newDist = Math.sqrt(dx * dx + dy * dy)
    const scale = newDist / pinchStartDist.current
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomAtPinchStart.current * scale)))
  }, [])

  const onTouchEnd = useCallback(() => {
    pinchStartDist.current = null
  }, [])

  // ── Render: permission screens ───────────────────────────────────────────────
  const bg = 'linear-gradient(135deg,rgb(8,13,13),rgb(36,44,36))'

  if (permission === 'denied') {
    return (
      <div className="flex-1 flex items-center justify-center p-5" style={{ background: bg }}>
        <PermissionCard
          title="Camera Unavailable"
          body="Camera access is denied or restricted. Enable it in your browser settings to use the Scope."
        />
      </div>
    )
  }

  if (permission === 'prompt') {
    return (
      <div className="flex-1 flex items-center justify-center p-5" style={{ background: bg }}>
        <PermissionCard
          title="Camera Access"
          body="The Scope screen needs the rear camera to show a live view with range-line overlay."
          action={{ label: 'Enable Camera', onClick: startCamera }}
        />
      </div>
    )
  }

  // ── Render: live scope ───────────────────────────────────────────────────────
  const tallest = lineHeightPx(DISTANCES[0], containerH, DEFAULT_FOV_DEG, zoom)
  const reticleRowH = tallest + 28 // line + label

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-black"
      style={{ touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Camera feed — CSS zoom via scale so reticle can overlay at native coords */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      />

      {/* Subtle frame border */}
      <div className="absolute inset-0 pointer-events-none" style={{ border: '1px solid rgba(255,255,255,0.14)' }} />

      {/* Reticle overlay */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Top spacer ~14% of height */}
        <div style={{ height: containerH * 0.14, flexShrink: 0 }} />

        {/* Range lines row — centred, max 320 px wide */}
        <div
          className="flex items-end mx-auto"
          style={{ width: Math.min(320, containerH * 0.55), height: reticleRowH }}
        >
          {DISTANCES.map(dist => {
            const h = lineHeightPx(dist, containerH, DEFAULT_FOV_DEG, zoom)
            return (
              <div
                key={dist}
                className="flex-1 flex flex-col items-center"
                style={{ height: reticleRowH }}
              >
                {/* Push line to bottom */}
                <div style={{ flex: 1 }} />
                <div
                  style={{
                    width: 3,
                    height: h,
                    borderRadius: 2,
                    background: 'rgba(220,30,30,0.92)',
                    boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    marginTop: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.9)',
                    textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  {dist}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Zoom badge */}
      <div
        className="absolute top-4 left-4 px-2.5 py-1 rounded-lg text-xs font-bold"
        style={{
          background: 'rgba(0,0,0,0.55)',
          color: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {zoom.toFixed(1)}×
      </div>

      {/* Pinch hint (visible until user pinches) */}
      <div
        className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none"
      >
        <span
          className="px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{
            background: 'rgba(0,0,0,0.45)',
            color: 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(6px)',
          }}
        >
          Pinch to zoom
        </span>
      </div>
    </div>
  )
}
