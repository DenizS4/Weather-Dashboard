import { type NextRequest, NextResponse } from "next/server"

const BASE_URL = "https://api.open-meteo.com/v1"

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

const getLocationName = async (lat: string, lon: string) => {
  try {
    console.log(" Attempting reverse geocoding for:", lat, lon)

    // Use OpenStreetMap Nominatim API (more reliable and free)
    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
    console.log("Geocoding URL:", geocodeUrl)

    const response = await fetch(geocodeUrl, {
      headers: {
        "User-Agent": "WeatherDashboard/1.0",
      },
    })
    console.log("Geocoding response status:", response.status)

    if (response.ok) {
      const data = await response.json()
      console.log("Geocoding data:", data)

      // Extract location components from Nominatim response
      const address = data.address || {}
      const district = address.suburb || address.neighbourhood || address.quarter
      const city = address.city || address.town || address.village || address.municipality
      const state = address.state || address.province
      const country = address.country

      // Build location string with available data
      const locationParts = []
      if (district && district !== city) locationParts.push(district)
      if (city) locationParts.push(city)
      if (state && locationParts.length > 0) locationParts.push(state)

      const locationName = locationParts.join(", ")
      console.log("Generated location name:", locationName)

      if (locationName) {
        return locationName
      }
    } else {
      console.log("Geocoding API error:", response.status, response.statusText)
    }

    // Fallback to coordinates if geocoding fails
    console.log("Falling back to coordinates")
    return `${Number.parseFloat(lat).toFixed(2)}, ${Number.parseFloat(lon).toFixed(2)}`
  } catch (error) {
    console.log("Geocoding error:", error)
    return "Current Location"
  }
}

const geocodeCity = async (cityName: string) => {
  try {
    console.log("Geocoding city:", cityName)

    // Use OpenStreetMap Nominatim API for geocoding
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`
    console.log("Geocoding URL:", geocodeUrl)

    const response = await fetch(geocodeUrl, {
      headers: {
        "User-Agent": "WeatherDashboard/1.0",
      },
    })
    console.log("Geocoding response status:", response.status)

    if (response.ok) {
      const data = await response.json()
      console.log("Geocoding data:", data)

      if (data && data.length > 0) {
        const location = data[0]
        return {
          lat: location.lat,
          lon: location.lon,
          name: location.display_name,
        }
      }
    }

    throw new Error("City not found")
  } catch (error) {
    console.log("Geocoding error:", error)
    throw new Error("Failed to find city")
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")
  const city = searchParams.get("city")

  let finalLat: string
  let finalLon: string

  if (city) {
    try {
      const geocodedLocation = await geocodeCity(city)
      finalLat = geocodedLocation.lat
      finalLon = geocodedLocation.lon
      console.log("Geocoded coordinates:", finalLat, finalLon)
    } catch (error) {
      console.log("City geocoding failed:", error)
      return NextResponse.json({ error: "City not found" }, { status: 404 })
    }
  } else if (lat && lon) {
    finalLat = lat
    finalLon = lon
  } else {
    return NextResponse.json({ error: "Latitude and longitude or city name required" }, { status: 400 })
  }

  try {
    const weatherUrl = `${BASE_URL}/forecast?latitude=${finalLat}&longitude=${finalLon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure,visibility&hourly=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max&timezone=auto&forecast_days=10&wind_speed_unit=kmh`

    const weatherResponse = await fetch(weatherUrl)

    if (!weatherResponse.ok) {
      throw new Error("Failed to fetch weather data")
    }

    const weatherData = await weatherResponse.json()

    const current = weatherData.current
    const daily = weatherData.daily
    const hourly = weatherData.hourly

    const locationName = await getLocationName(finalLat, finalLon)

    const currentWeather = {
      name: locationName,
      main: {
        temp: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        pressure: Math.round(current.surface_pressure),
      },
      weather: [getWeatherCondition(current.weather_code)],
      wind: {
        speed: Math.round(current.wind_speed_10m),
      },
      visibility: current.visibility || 10000,
      coord: {
        lat: Number.parseFloat(finalLat),
        lon: Number.parseFloat(finalLon),
      },
    }

    const forecastList = daily.time.slice(0, 10).map((date: string, index: number) => ({
      dt: new Date(date).getTime() / 1000,
      dt_txt: date,
      main: {
        temp: Math.round((daily.temperature_2m_max[index] + daily.temperature_2m_min[index]) / 2),
        temp_max: Math.round(daily.temperature_2m_max[index]),
        temp_min: Math.round(daily.temperature_2m_min[index]),
      },
      weather: [getWeatherCondition(daily.weather_code[index])],
      wind: {
        speed: Math.round(daily.wind_speed_10m_max[index]),
      },
    }))

    const hourlyForecast = hourly.time.slice(0, 48).map((time: string, index: number) => ({
      dt: new Date(time).getTime() / 1000,
      dt_txt: time,
      main: {
        temp: Math.round(hourly.temperature_2m[index]),
      },
      weather: [getWeatherCondition(hourly.weather_code[index])],
      wind: {
        speed: Math.round(hourly.wind_speed_10m[index]),
      },
    }))

    return NextResponse.json({
      current: currentWeather,
      forecast: {
        list: forecastList,
      },
      hourly: {
        list: hourlyForecast,
      },
    })
  } catch (error) {
    console.error("Weather API error:", error)
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 })
  }
}
