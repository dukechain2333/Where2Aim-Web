import { useEffect, useRef, useState, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

function metersToYards(m: number): number {
  return m / 0.9144
}

function formatDistance(meters: number): string {
  const yards = Math.round(metersToYards(meters))
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km · ${yards} yd`
  }
  return `${Math.round(meters)} m · ${yards} yd`
}

function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function MapTab() {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  // Use classic Marker — AdvancedMarkerElement requires a registered Cloud Map ID
  const userMarkerRef = useRef<google.maps.Marker | null>(null)
  const targetMarkerRef = useRef<google.maps.Marker | null>(null)
  const lineRef = useRef<google.maps.Polyline | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null)

  const [distance, setDistance] = useState<number | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [hasLocation, setHasLocation] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── Build or move the dashed line ──────────────────────────────────────────
  const updateLine = useCallback((
    map: google.maps.Map,
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ) => {
    const path = [from, to]
    if (lineRef.current) {
      lineRef.current.setPath(path)
    } else {
      lineRef.current = new google.maps.Polyline({
        path,
        map,
        strokeColor: 'rgba(235,245,224,0.85)',
        strokeOpacity: 0,
        icons: [{
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.85,
            strokeColor: '#ebf5e0',
            scale: 3,
          },
          offset: '0',
          repeat: '14px',
        }],
      })
    }
    setDistance(haversineMeters(from.lat, from.lng, to.lat, to.lng))
  }, [])

  // ── Place or move target marker ────────────────────────────────────────────
  const placeTarget = useCallback((
    map: google.maps.Map,
    latLng: google.maps.LatLng,
  ) => {
    const pos = { lat: latLng.lat(), lng: latLng.lng() }

    if (targetMarkerRef.current) {
      targetMarkerRef.current.setPosition(latLng)
    } else {
      targetMarkerRef.current = new google.maps.Marker({
        map,
        position: latLng,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg viewBox="0 0 24 32" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2 C6,2 2,7 2,12 C2,19 12,30 12,30 C12,30 22,19 22,12 C22,7 18,2 12,2 Z"
                fill="rgba(235,245,224,0.95)" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>
              <circle cx="12" cy="12" r="4" fill="rgba(0,0,0,0.25)"/>
            </svg>`)}`,
          scaledSize: new google.maps.Size(28, 36),
          anchor: new google.maps.Point(14, 34),
        },
        title: 'Target',
        cursor: 'pointer',
      })
    }

    if (userPosRef.current) {
      updateLine(map, userPosRef.current, pos)
    }
  }, [updateLine])

  // ── Load Google Maps and initialize ────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return

    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
      setLoadError('Add your Google Maps API key to .env.local → VITE_GOOGLE_MAPS_API_KEY')
      return
    }

    setOptions({ key: API_KEY, v: 'weekly' })

    Promise.all([
      importLibrary('core'),
      importLibrary('maps'),
    ]).then(([, mapsLib]) => {
      const { Map } = mapsLib as google.maps.MapsLibrary

      const map = new Map(mapDivRef.current!, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 16,
        mapTypeId: 'satellite',
        tilt: 0,
        disableDefaultUI: true,
        clickableIcons: false,
      })

      // Tap to place target
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) placeTarget(map, e.latLng)
      })

      mapRef.current = map

      // ── Geolocation ──────────────────────────────────────────────────────────
      if (!('geolocation' in navigator)) {
        setLocationError('Geolocation is not supported by this browser.')
        return
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          userPosRef.current = { lat, lng }
          setHasLocation(true)
          setLocationError(null)

          if (userMarkerRef.current) {
            userMarkerRef.current.setPosition({ lat, lng })
          } else {
            // Blue pulsing dot — classic Marker with SVG icon, no Map ID needed
            const svgDot = encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">'
              + '<circle cx="11" cy="11" r="8" fill="#3b82f6" stroke="#ffffff" stroke-width="2.5"/>'
              + '</svg>',
            )
            userMarkerRef.current = new google.maps.Marker({
              map,
              position: { lat, lng },
              icon: {
                url: `data:image/svg+xml,${svgDot}`,
                scaledSize: new google.maps.Size(22, 22),
                anchor: new google.maps.Point(11, 11),
              },
              title: 'You',
              zIndex: 10,
            })
            map.setCenter({ lat, lng })
            map.setZoom(17)
          }

          if (targetMarkerRef.current) {
            const tPos = targetMarkerRef.current.getPosition()
            if (tPos) updateLine(map, { lat, lng }, { lat: tPos.lat(), lng: tPos.lng() })
          }
        },
        (err) => {
          setLocationError(
            err.code === err.PERMISSION_DENIED
              ? 'Location access denied. Enable it in browser settings.'
              : 'Unable to get your location.',
          )
        },
        { enableHighAccuracy: true, maximumAge: 1500 },
      )
    }).catch(() => {
      setLoadError('Failed to load Google Maps. Check your API key and network.')
    })

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      lineRef.current?.setMap(null)
      lineRef.current = null
      userMarkerRef.current?.setMap(null)
      userMarkerRef.current = null
      targetMarkerRef.current?.setMap(null)
      targetMarkerRef.current = null
      mapRef.current = null
    }
  }, [placeTarget, updateLine])

  const centerOnUser = useCallback(() => {
    if (mapRef.current && userPosRef.current) {
      mapRef.current.panTo(userPosRef.current)
      mapRef.current.setZoom(17)
    }
  }, [])

  const clearTarget = useCallback(() => {
    targetMarkerRef.current?.setMap(null)
    targetMarkerRef.current = null
    lineRef.current?.setMap(null)
    lineRef.current = null
    setDistance(null)
  }, [])

  // ── Error screen ───────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg,rgb(20,28,20),rgb(46,54,46))' }}
      >
        <div
          className="rounded-[24px] p-6 flex flex-col gap-3"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span className="text-base font-bold text-white">Map Unavailable</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{loadError}</span>
          <code
            className="text-xs px-3 py-2 rounded-xl mt-1"
            style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(235,245,224,0.8)' }}
          >
            VITE_GOOGLE_MAPS_API_KEY=...
          </code>
        </div>
      </div>
    )
  }

  // ── Main map view ──────────────────────────────────────────────────────────
  return (
    <div className="flex-1 relative overflow-hidden">
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* Distance panel */}
      {distance !== null && (
        <div
          className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(8,12,8,0.82)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Distance to target
            </div>
            <div className="text-sm font-bold text-white mt-0.5">{formatDistance(distance)}</div>
          </div>
          <button
            onClick={clearTarget}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Location error */}
      {locationError && (
        <div
          className="absolute top-4 left-4 right-14 px-4 py-3 rounded-2xl text-sm"
          style={{
            background: 'rgba(8,12,8,0.82)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.78)',
          }}
        >
          {locationError}
        </div>
      )}

      {/* Center-on-user button */}
      <button
        onClick={centerOnUser}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(8,12,8,0.78)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: hasLocation ? 'rgba(235,245,224,0.9)' : 'rgba(255,255,255,0.4)',
        }}
        title="Center on my location"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      </button>

      {/* Tap hint */}
      {distance === null && !locationError && (
        <div
          className="absolute top-4 left-4 right-14 px-3 py-2.5 rounded-xl text-xs"
          style={{
            background: 'rgba(8,12,8,0.75)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          Tap the map to place a target and measure distance
        </div>
      )}
    </div>
  )
}
