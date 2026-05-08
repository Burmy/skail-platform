import 'server-only'

export type GeocodeResult = {
  address: string
  lat: number
  lng: number
  provider: 'osm'
}

type CacheEntry = {
  result: GeocodeResult | null
  expiresAt: number
}

// In-memory cache with 24h TTL.
// Note: per Next.js dev/prod isolation this resets on cold start.
const cache = new Map<string, CacheEntry>()
const TTL_MS = 24 * 60 * 60 * 1000
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

let lastRequestAt = 0

async function throttle() {
  const now = Date.now()
  const wait = Math.max(0, lastRequestAt + 1000 - now)
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequestAt = Date.now()
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = address.trim().toLowerCase()
  if (key.length === 0) return null
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.result

  await throttle()

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`
  let result: GeocodeResult | null = null
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SKAIL Platform (geocode proxy)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (response.ok) {
      const json = (await response.json()) as Array<{
        lat: string
        lon: string
        display_name: string
      }>
      const first = json[0]
      if (first) {
        const lat = Number(first.lat)
        const lng = Number(first.lon)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          result = {
            address: first.display_name || address,
            lat,
            lng,
            provider: 'osm',
          }
        }
      }
    }
  } catch {
    result = null
  }

  cache.set(key, { result, expiresAt: Date.now() + TTL_MS })
  return result
}
