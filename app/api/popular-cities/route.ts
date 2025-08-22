import { type NextRequest, NextResponse } from "next/server"

const BASE_URL = "https://api.open-meteo.com/v1"

const CITIES_BY_REGION = {
  // Default global cities
  global: [
    { name: "New York", lat: 40.7128, lon: -74.006 },
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
    { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  ],
  // India
  india: [
    { name: "Delhi", lat: 28.6139, lon: 77.209 },
    { name: "Mumbai", lat: 19.076, lon: 72.8777 },
    { name: "Bangalore", lat: 12.9716, lon: 77.5946 },
    { name: "Hyderabad", lat: 17.385, lon: 78.4867 },
    { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  ],
  // USA
  usa: [
    { name: "New York", lat: 40.7128, lon: -74.006 },
    { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
    { name: "Chicago", lat: 41.8781, lon: -87.6298 },
    { name: "Houston", lat: 29.7604, lon: -95.3698 },
    { name: "Miami", lat: 25.7617, lon: -80.1918 },
  ],
  // Europe
  europe: [
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
    { name: "Berlin", lat: 52.52, lon: 13.405 },
    { name: "Madrid", lat: 40.4168, lon: -3.7038 },
    { name: "Rome", lat: 41.9028, lon: 12.4964 },
  ],
}

const getRegionFromCoords = (lat: number, lon: number): keyof typeof CITIES_BY_REGION => {
  // India
  if (lat >= 6 && lat <= 37 && lon >= 68 && lon <= 97) return "india"
  // USA
  if (lat >= 24 && lat <= 49 && lon >= -125 && lon <= -66) return "usa"
  // Europe
  if (lat >= 35 && lat <= 71 && lon >= -10 && lon <= 40) return "europe"
  // Default to global
  return "global"
}

const getWeatherCondition = (weatherCode: number) => {
  if (weatherCode === 0) return { condition: "Clear", description: "Clear sky" }
  if (weatherCode <= 3) return { condition: "Clouds", description: "Partly cloudy" }
  if (weatherCode <= 48) return { condition: "Fog", description: "Foggy" }
  if (weatherCode <= 57) return { condition: "Drizzle", description: "Light drizzle" }
  if (weatherCode <= 67) return { condition: "Rain", description: "Rainy" }
  if (weatherCode <= 77) return { condition: "Snow", description: "Snowy" }
  if (weatherCode <= 82) return { condition: "Rain", description: "Heavy rain" }
  if (weatherCode <= 99) return { condition: "Thunderstorm", description: "Thunderstorm" }
  return { condition: "Clear", description: "Clear" }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userLat = searchParams.get("lat")
  const userLon = searchParams.get("lon")

  let cities = CITIES_BY_REGION.global
  if (userLat && userLon) {
    const region = getRegionFromCoords(Number.parseFloat(userLat), Number.parseFloat(userLon))
    cities = CITIES_BY_REGION[region]
  }

  try {
    const cityPromises = cities.map(async (city) => {
      const url = `${BASE_URL}/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code&timezone=auto`
      const response = await fetch(url)
      const data = await response.json()

      const weatherCondition = getWeatherCondition(data.current.weather_code)

      return {
        name: city.name,
        temp: `${Math.round(data.current.temperature_2m)}°`,
        condition: weatherCondition.condition,
        description: weatherCondition.description,
        icon: data.current.weather_code.toString(),
      }
    })

    const citiesData = await Promise.all(cityPromises)

    return NextResponse.json(citiesData)
  } catch (error) {
    console.error("Popular cities API error:", error)
    return NextResponse.json({ error: "Failed to fetch cities data" }, { status: 500 })
  }
}
