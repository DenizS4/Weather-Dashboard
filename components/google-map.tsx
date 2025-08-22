"use client"

import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps"
import { useState, useRef } from "react"
import { MapPin, AlertCircle } from "lucide-react"

interface GoogleMapProps {
  lat: number
  lon: number
  apiKey: string
}

export default function GoogleMap({ lat, lon, apiKey }: GoogleMapProps) {
  const [mapError, setMapError] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)
  const center = { lat, lng: lon }


  if (!apiKey || apiKey.trim() === "") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-green-200 to-green-300 rounded-xl flex flex-col items-center justify-center gap-2">
        <MapPin className="h-8 w-8 text-gray-600" />
        <p className="text-gray-600 text-sm text-center">Map API key not configured</p>
      </div>
    )
  }

  if (mapError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex flex-col items-center justify-center gap-2">
        <AlertCircle className="h-8 w-8 text-red-600" />
        <p className="text-red-600 text-sm text-center">Map failed to load</p>
        <p className="text-red-500 text-xs text-center">Check API key configuration</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden">
      <APIProvider apiKey={apiKey} onLoad={() => console.log("Google Maps API loaded successfully")}>
        <Map
          center={center} // Use center instead of defaultCenter for reactive updates
          zoom={10} // Use zoom instead of defaultZoom for reactive updates
          className="w-full h-full"
          mapId="weather-map"
          onLoad={(map) => {
            console.log("[Map component loaded")
            mapRef.current = map
          }}
          onError={(error) => {
            console.error("Google Maps error:", error)
            setMapError(true)
          }}
        >
          <Marker position={center} />
        </Map>
      </APIProvider>
    </div>
  )
}
