import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom SVG marker icons (avoids bundling Leaflet's PNG assets)
const userIcon = L.divIcon({
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#3b82f6;border:2.5px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const targetIcon = L.divIcon({
  html: `<svg viewBox="0 0 24 32" width="24" height="32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2 C6,2 2,7 2,12 C2,19 12,30 12,30 C12,30 22,19 22,12 C22,7 18,2 12,2 Z"
      fill="rgba(235,245,224,0.92)" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="rgba(0,0,0,0.25)"/>
  </svg>`,
  className: '',
  iconSize: [24, 32],
  iconAnchor: [12, 30],
})

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

export default function MapTab() {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const targetMarkerRef = useRef<L.Marker | null>(null)
  const lineRef = useRef<L.Polyline | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const [distance, setDistance] = useState<number | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [hasLocation, setHasLocation] = useState(false)

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return

    const map = L.map(mapDivRef.current, {
      center: [37.7749, -122.4194],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    })

    // Satellite imagery
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 },
    ).addTo(map)

    // Minimal attribution
    L.control.attribution({ position: 'bottomleft', prefix: '' }).addTo(map)
    map.attributionControl?.addAttribution('© Esri')

    // Scale bar
    L.control.scale({ imperial: true, metric: true, position: 'bottomright' }).addTo(map)

    // Tap to place target
    map.on('click', (e) => {
      const { lat, lng } = e.latlng

      if (targetMarkerRef.current) {
        targetMarkerRef.current.setLatLng([lat, lng])
      } else {
        targetMarkerRef.current = L.marker([lat, lng], { icon: targetIcon }).addTo(map)
      }

      if (userMarkerRef.current) {
        const uLatLng = userMarkerRef.current.getLatLng()
        const dist = map.distance(uLatLng, [lat, lng])
        setDistance(dist)

        if (lineRef.current) {
          lineRef.current.setLatLngs([uLatLng, [lat, lng]])
        } else {
          lineRef.current = L.polyline([uLatLng, [lat, lng]], {
            color: 'rgba(235,245,224,0.75)',
            weight: 2,
            dashArray: '6 8',
          }).addTo(map)
        }
      }
    })

    mapRef.current = map

    // Geolocation
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by this browser.')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setHasLocation(true)
        setLocationError(null)

        const latLng: L.LatLngTuple = [lat, lng]

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(latLng)
        } else {
          userMarkerRef.current = L.marker(latLng, { icon: userIcon }).addTo(map)
          map.setView(latLng, 17)
        }

        if (targetMarkerRef.current) {
          const tLatLng = targetMarkerRef.current.getLatLng()
          const dist = map.distance(latLng, tLatLng)
          setDistance(dist)
          lineRef.current?.setLatLngs([latLng, tLatLng])
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

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      map.remove()
      mapRef.current = null
      userMarkerRef.current = null
      targetMarkerRef.current = null
      lineRef.current = null
    }
  }, [])

  const centerOnUser = useCallback(() => {
    if (mapRef.current && userMarkerRef.current) {
      mapRef.current.setView(userMarkerRef.current.getLatLng(), 17, { animate: true })
    }
  }, [])

  const clearTarget = useCallback(() => {
    targetMarkerRef.current?.remove()
    targetMarkerRef.current = null
    lineRef.current?.remove()
    lineRef.current = null
    setDistance(null)
  }, [])

  return (
    <div className="flex-1 relative overflow-hidden">
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* Distance panel */}
      {distance !== null && (
        <div
          className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(8,12,8,0.80)',
            backdropFilter: 'blur(12px)',
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

      {/* Location error banner */}
      {locationError && (
        <div
          className="absolute top-4 left-4 right-14 px-4 py-3 rounded-2xl text-sm"
          style={{
            background: 'rgba(8,12,8,0.80)',
            backdropFilter: 'blur(12px)',
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
          background: 'rgba(8,12,8,0.75)',
          backdropFilter: 'blur(12px)',
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

      {/* Hint (shown when no target placed yet) */}
      {distance === null && !locationError && (
        <div
          className="absolute top-4 left-4 right-14 px-3 py-2.5 rounded-xl text-xs"
          style={{
            background: 'rgba(8,12,8,0.75)',
            backdropFilter: 'blur(12px)',
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
