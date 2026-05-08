'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { MapPinIcon } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { updateMapConfig } from '@/app/databases/actions'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type {
  CollectionRecordWithValues,
  LocationValue,
} from '@/lib/properties/types'
import type { Json } from '@/lib/supabase/database.types'
import type { SavedViewWithConfig } from '@/lib/views/types'

// react-leaflet must load on the client only.
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false })

import 'leaflet/dist/leaflet.css'

export type MapViewProps = {
  workspaceId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
  onOpenRecord: (recordId: string) => void
}

type Pin = {
  recordId: string
  title: string
  lat: number
  lng: number
}

function readLocation(value: Json | null | undefined): LocationValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const obj = value as Record<string, unknown>
  if ('value' in obj) return readLocation(obj.value as Json | null)
  if (
    typeof obj.address === 'string' &&
    typeof obj.lat === 'number' &&
    typeof obj.lng === 'number'
  ) {
    return {
      address: obj.address,
      lat: obj.lat,
      lng: obj.lng,
      provider: obj.provider === 'osm' ? 'osm' : undefined,
    }
  }
  return null
}

export function MapView(props: MapViewProps) {
  const { workspaceId, view, fields, records, onOpenRecord } = props
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [iconReady, setIconReady] = useState(false)

  const cfg = view.config.map
  const locationFieldId = cfg?.locationFieldId ?? null
  const locationFields = fields.filter((f) => f.field_type === 'location')

  const pins: Pin[] = useMemo(() => {
    if (!locationFieldId) return []
    return records.flatMap((record) => {
      const loc = readLocation(record.values[locationFieldId])
      if (!loc) return []
      return [
        {
          recordId: record.id,
          title: record.title ?? 'Untitled',
          lat: loc.lat,
          lng: loc.lng,
        },
      ]
    })
  }, [records, locationFieldId])

  const center = useMemo(() => {
    if (cfg?.defaultCenter) return cfg.defaultCenter
    if (pins.length > 0) return { lat: pins[0]!.lat, lng: pins[0]!.lng }
    return { lat: 39.5, lng: -98.35 } // continental US fallback
  }, [cfg?.defaultCenter, pins])

  // Configure default Leaflet marker icon URLs (Next.js can't bundle the default ones automatically).
  useEffect(() => {
    let active = true
    void import('leaflet').then((L) => {
      if (!active) return
      const proto = L.Icon.Default.prototype as { _getIconUrl?: () => string }
      delete proto._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setIconReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  function setLocationField(id: string | null) {
    startTransition(async () => {
      await updateMapConfig({
        workspaceId,
        viewId: view.id,
        locationFieldId: id,
        defaultZoom: cfg?.defaultZoom,
        clusterAtZoom: cfg?.clusterAtZoom,
      })
      router.refresh()
    })
  }

  if (!locationFieldId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Empty>
          <EmptyHeader>
            <MapPinIcon className="size-6 text-muted-foreground" />
            <EmptyTitle>Pick a location field</EmptyTitle>
            <EmptyDescription>
              Add a location property to records, then choose it here to plot pins.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        {locationFields.length > 0 ? (
          <Select onValueChange={setLocationField}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Location field…" />
            </SelectTrigger>
            <SelectContent>
              {locationFields.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-xs text-muted-foreground">Map</span>
        <Select value={locationFieldId} onValueChange={setLocationField}>
          <SelectTrigger className="h-7 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locationFields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        {iconReady ? (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={cfg?.defaultZoom ?? 4}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {pins.map((pin) => (
              <Marker key={pin.recordId} position={[pin.lat, pin.lng]}>
                <Popup>
                  <button
                    type="button"
                    onClick={() => onOpenRecord(pin.recordId)}
                    className="text-left text-sm font-medium hover:underline"
                  >
                    {pin.title}
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Loading map…
          </div>
        )}
      </div>
    </div>
  )
}
