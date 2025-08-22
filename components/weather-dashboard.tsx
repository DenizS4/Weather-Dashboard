"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {Search, Bell, Droplets, Wind, Eye, Gauge, Upload, X, MapPin, LucideImagePlus} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import GoogleMap from "./google-map"
import WeatherIcon from "./weather-icon"
import {date} from "zod";

interface WeatherData {
  current: {
    name: string
    main: {
      temp: number
      humidity: number
      pressure: number
    }
    weather: Array<{
      main: string
      description: string
      icon: string
    }>
    wind: {
      speed: number
    }
    visibility: number
    coord: {
      lat: number
      lon: number
    }
  }
  forecast: {
    list: Array<{
      dt: number
      main: {
        temp: number
        temp_min: number
        temp_max: number
      }
      weather: Array<{
        main: string
        description: string
        icon: string
      }>
      wind: {
        speed: number
      }
      dt_txt: string
    }>
  }
  hourly: {
    list: Array<{
      dt: number
      main: {
        temp: number
      }
      weather: Array<{
        main: string
        description: string
        icon: string
      }>
      wind: {
        speed: number
      }
    }>
  }
}

interface PopularCity {
  name: string
  temp: string
  condition: string
  description: string
  icon: string
}

export default function WeatherDashboard() {
  const [selectedTab, setSelectedTab] = useState("summary")
  const [viewMode, setViewMode] = useState("weekly")
  const [selectedDay, setSelectedDay] = useState(null)
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [popularCities, setPopularCities] = useState<PopularCity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)

  const [backgroundImage, setBackgroundImage] = useState("")
  const [customBackgrounds, setCustomBackgrounds] = useState<string[]>([])

  // Preset background images
  const presetBackgrounds = [
    {
      name: "Tropical Beach",
      url: "https://muralsyourway.vtexassets.com/arquivos/ids/236286/Tropical-Beach-At-Sunset-Mural-Wallpaper.jpg?v=638164405127130000",
    },
    {
      name: "Ocean View",
      url: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&h=1080&fit=crop",
    },
    {
      name: "Mountain Top",
      url: "https://upload.wikimedia.org/wikipedia/commons/6/60/Matterhorn_from_Domh%C3%BCtte_-_2.jpg",
    },
    {
      name: "Mountain Lake",
      url: "https://www.rockymountaineer.com/sites/default/files/bp_summary_image/Emerald%20Lake%20-%20Credit%20Suran%20Gaw%2C%20Adobe%20Stock_1_0.jpeg",
    },
    {
      name: "Desert Sunset",
      url: "https://www.mosaicnorthafrica.com/wp-content/uploads/2023/08/sunset-in-moroccan-sahara-desert.jpg",
    },
    {
      name: "City Skyline",
      url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&h=1080&fit=crop",
    },
    {
      name: "Aurora Borealis",
      url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&h=1080&fit=crop",
    },
    {
      name: "Lavender Field",
      url: "https://offloadmedia.feverup.com/secretldn.com/wp-content/uploads/2020/07/15045913/shutterstock_1175295904.jpg",
    },
  ]

  const handleBackgroundChange = (url: string) => {
    setBackgroundImage(url)
    localStorage.setItem("weather-dashboard-background", url)
  }

  const handleCustomBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const url = reader.result as string
        setCustomBackgrounds((prev) => [...prev, url])
        localStorage.setItem("weather-dashboard-custom-backgrounds", JSON.stringify([...customBackgrounds, url]))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeCustomBackground = (index: number) => {
    const newCustomBackgrounds = customBackgrounds.filter((_, i) => i !== index)
    setCustomBackgrounds(newCustomBackgrounds)
    localStorage.setItem("weather-dashboard-custom-backgrounds", JSON.stringify(newCustomBackgrounds))
  }

  useEffect(() => {
    const savedBackground = localStorage.getItem("weather-dashboard-background")
    const savedCustomBackgrounds = localStorage.getItem("weather-dashboard-custom-backgrounds")

    if (savedBackground) {
      setBackgroundImage(savedBackground)
    } else {
      setBackgroundImage(presetBackgrounds[0].url)
    }

    if (savedCustomBackgrounds) {
      setCustomBackgrounds(JSON.parse(savedCustomBackgrounds))
    }

    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lon: longitude })
          fetchWeatherData(latitude, longitude)
        },
        (error) => {
          console.error("Geolocation error:", error)
          // Fallback to Delhi coordinates
          setUserLocation({ lat: 28.6139, lon: 77.209 })
          fetchWeatherData(28.6139, 77.209)
        },
      )
    } else {
      // Fallback to Delhi coordinates
      setUserLocation({ lat: 28.6139, lon: 77.209 })
      fetchWeatherData(28.6139, 77.209)
    }

    // Fetch popular cities data
    fetchPopularCities()
  }, [])

  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      if (!response.ok) throw new Error("Failed to fetch weather data")

      const data = await response.json()
      setWeatherData(data)
      setError(null)
    } catch (err) {
      setError("Failed to load weather data")
      console.error("Weather fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPopularCities = async () => {
    try {
      const url = userLocation
        ? `/api/popular-cities?lat=${userLocation.lat}&lon=${userLocation.lon}`
        : "/api/popular-cities"
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch cities data")

      const cities = await response.json()
      setPopularCities(cities)
    } catch (err) {
      console.error("Cities fetch error:", err)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      const response = await fetch(`/api/weather?city=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) throw new Error("City not found")

      const data = await response.json()
      setWeatherData(data)
      setUserLocation({ lat: data.current.coord.lat, lon: data.current.coord.lon })
      setError(null)
    } catch (err) {
      setError("City not found")
    } finally {
      setLoading(false)
    }
  }

  const handleCitySelect = async (cityName: string) => {
    setSearchQuery(cityName)

    try {
      setLoading(true)
      const response = await fetch(`/api/weather?city=${encodeURIComponent(cityName)}`)
      if (!response.ok) throw new Error("City not found")

      const data = await response.json()
      setWeatherData(data)
      setUserLocation({ lat: data.current.coord.lat, lon: data.current.coord.lon })
      setError(null)
    } catch (err) {
      setError("City not found")
    } finally {
      setLoading(false)
    }
  }
  function pickHourlyRange(
      data: any[],
      start = 7,
      end = 23,
      step = 2,
      snapToleranceHours = 1
  ) {
    const toDate = (d: any) => {
      const raw = d.dt ?? d.time ?? d.timestamp ?? d.dt_txt;
      if (typeof raw === "number") {
        const ms = raw < 1e12 ? raw * 1000 : raw;
        return new Date(ms);
      }
      return new Date(raw);
    };

    const today = new Date();
    const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const rows = data
        .map(r => ({ ...r, _dt: toDate(r) }))
        .filter(r => Number.isFinite(r?.main?.temp) && !isNaN(r._dt.getTime()))
        .sort((a,b) => +a._dt - +b._dt);

    // keep only today's rows first
    const todayRows = rows.filter(r => sameDay(r._dt, today));

    // try to hit the targets 7,9,...,23
    const targets: number[] = [];
    for (let h = start; h <= end; h += step) targets.push(h);

    const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true });

    const useRows = todayRows.length ? todayRows : rows; // fallback to whatever we have
    const used = new Set<number>();
    const picked = targets.map(h => {
      let best = -1, bestDelta = Infinity;
      for (let i = 0; i < useRows.length; i++) {
        if (used.has(i)) continue;
        const delta = Math.abs(useRows[i]._dt.getHours() - h);
        if (delta < bestDelta) { bestDelta = delta; best = i; }
      }
      if (best >= 0 && bestDelta <= snapToleranceHours) {
        used.add(best);
        const r = useRows[best];
        return { ...r, timeLabel: fmt.format(new Date(r._dt.setHours(h,0,0,0))) };
      }
      return null;
    }).filter(Boolean) as any[];

    // final fallback: if still empty, take the first 8 hours we have
    return picked.length ? picked : useRows.slice(0, 8).map(r => ({
      ...r,
      timeLabel: fmt.format(r._dt),
    }));
  }
  const getProcessedForecastData = () => {
    const forecastList = weatherData?.forecast?.list || []
    const hourlyList = weatherData?.hourly?.list || [];
    const picked = pickHourlyRange(hourlyList, 7, 23, 2); // returns rows with _dt (Date) + timeLabel

    const hourlyData = picked.map((item: any) => {
      // _dt is a Date added by pickHourlyRange; fall back to raw dt if needed
      const dt =
          item._dt instanceof Date
              ? item._dt
              : typeof item.dt === "number"
                  ? new Date(item.dt < 1e12 ? item.dt * 1000 : item.dt)
                  : new Date(item.dt || item.timestamp || item.time || item.dt_txt);

      const hour = isNaN(dt.getTime()) ? undefined : dt.getHours();

      return {
        time: item.timeLabel,                              // e.g., "7 AM"
        timeShort: hour !== undefined ? String(hour) : "", // e.g., "7"
        temp: Math.round(item.main?.temp ?? 0),
        wind: Math.round(item.wind?.speed ?? 0),
        condition: (item.weather?.[0]?.condition || "Clear").toLowerCase(),
      };
    });
    console.log(hourlyList);
    const today = new Date()

    // Weekly data (from daily forecast)
    const weeklyData = forecastList
      .slice(0, 10)
      .map((item, index) => {
        if (!item.dt || isNaN(item.dt)) return null

        const date = new Date(item.dt * 1000)
        if (isNaN(date.getTime())) return null

        return {
          day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          dayShort: String(date.getDate()),
          temp: Math.round(item.main?.temp || 0),
          tempMax: Math.round(item.main?.temp_max || 0),
          tempMin: Math.round(item.main?.temp_min || 0),
          wind: Math.round(item.wind?.speed || 0),
          condition: (item.weather?.[0]?.condition || "Clear").toLowerCase(),
        }
      })
      .filter(Boolean)


      console.log(hourlyData);
      return { weeklyData, hourlyData }
  }


  const { weeklyData, hourlyData } = getProcessedForecastData()
  const currentData = viewMode === "weekly" ? weeklyData : hourlyData
  const dataLabel = viewMode === "weekly" ? "day" : "time"

  if (loading && !weatherData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
        <div className="text-white text-xl">Loading weather data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : "linear-gradient(to br, #60a5fa, #3b82f6, #2563eb)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="relative z-10 flex items-center justify-between p-6">
        <div></div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 relative"
            onClick={() => setShowBackgroundSelector(true)}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
              <LucideImagePlus className="h-4 w-4" />
            </div>
          </Button>
        </div>
      </div>

      {showBackgroundSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBackgroundSelector(false)}
          />
          <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">Choose Background</h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setShowBackgroundSelector(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Preset Backgrounds */}
            <div className="mb-8">
              <h3 className="text-white/80 text-lg mb-4">Preset Backgrounds</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {presetBackgrounds.map((bg, index) => (
                  <div
                    key={index}
                    className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 ${
                      backgroundImage === bg.url ? "border-white" : "border-white/20"
                    }`}
                    onClick={() => {
                      handleBackgroundChange(bg.url)
                      setShowBackgroundSelector(false)
                    }}
                  >
                    <img src={bg.url || "/placeholder.svg"} alt={bg.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end">
                      <p className="text-white text-sm font-medium p-2">{bg.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Backgrounds */}
            <div className="mb-6">
              <h3 className="text-white/80 text-lg mb-4">Custom Backgrounds</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Upload Button */}
                <label className="relative aspect-video rounded-lg border-2 border-dashed border-white/40 cursor-pointer hover:border-white/60 transition-colors flex flex-col items-center justify-center bg-white/5 hover:bg-white/10">
                  <Upload className="h-8 w-8 text-white/60 mb-2" />
                  <p className="text-white/60 text-sm">Upload Image</p>
                  <input type="file" accept="image/*" onChange={handleCustomBackgroundUpload} className="hidden" />
                </label>

                {/* Custom Background Images */}
                {customBackgrounds.map((bg, index) => (
                  <div
                    key={index}
                    className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 group ${
                      backgroundImage === bg ? "border-white" : "border-white/20"
                    }`}
                    onClick={() => {
                      handleBackgroundChange(bg)
                      setShowBackgroundSelector(false)
                    }}
                  >
                    <img
                      src={bg || "/placeholder.svg"}
                      alt={`Custom ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-red-500/80 w-6 h-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCustomBackground(index)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="absolute inset-0 bg-black/20 flex items-end">
                      <p className="text-white text-sm font-medium p-2">Custom {index + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-[calc(100vh-120px)] lg:min-h-0 lg:auto-rows-[10rem]">
        {/* Search & Current Weather */}
        <div className="lg:col-span-3 lg:row-span-2 lg:max-h-[350px] lg:min-h-[350px] bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 p-6 flex flex-col min-h-[280px] lg:min-h-0">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
            <Input
              placeholder="Search for location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 rounded-lg"
            />
          </form>

          {error && <div className="mb-2 text-red-300 text-xs">{error}</div>}

          {/* Current Weather */}
          <div className="flex-1">
            <h3 className="text-white/80 text-sm mb-1">Current Weather</h3>
            <p className="text-white/60 text-sm mb-3">{weatherData?.current.name || "Loading..."}</p>

            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
                <WeatherIcon condition={weatherData?.current.weather[0].condition || "Clear"} size="lg" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-light text-white">
                  {weatherData ? Math.round(weatherData.current.main.temp) : "--"}
                  <span className="text-lg">°C</span>
                </div>
                <p className="text-white/80 text-sm">{weatherData?.current.weather[0].description || "Loading..."}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2 text-center">
              <div className="flex flex-col items-center">
                <Droplets className="h-4 w-4 text-white/60 mb-1" />
                <p className="text-white text-xs font-medium">Pressure</p>
                <p className="text-white text-xs font-medium">{weatherData?.current.main.pressure || "--"}</p>
              </div>
              <div className="flex flex-col items-center">
                <Gauge className="h-4 w-4 text-white/60 mb-1"/>
                <p className="text-white text-xs font-medium">Humidity</p>
                <p className="text-white text-xs font-medium">{weatherData?.current.main.humidity || "--"}%</p>
              </div>
              <div className="flex flex-col items-center">
                <Wind className="h-4 w-4 text-white/60 mb-1"/>
                <p className="text-white text-xs font-medium">Wind</p>
                <p className="text-white text-xs font-medium">
                  {weatherData ? Math.round(weatherData.current.wind.speed) : "--"}km/h
                </p>
              </div>
              <div className="flex flex-col items-center">
                <Eye className="h-4 w-4 text-white/60 mb-1"/>
                <p className="text-white text-xs font-medium">Eye Sight</p>
                <p className="text-white text-xs font-medium">
                  {weatherData ? Math.round(weatherData.current.visibility / 1000) : "--"}km
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-6 lg:row-span-2 lg:max-h-[350px] lg:min-h-[350px] bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 p-4 min-h-[200px] lg:min-h-0">
          {userLocation ? (
            <GoogleMap
              lat={userLocation.lat}
              lon={userLocation.lon}
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-200 to-blue-300 rounded-xl flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <MapPin className="h-8 w-8 text-gray-600" />
                <p className="text-gray-600 text-sm">Getting your location...</p>
              </div>
            </div>
          )}
        </div>

        {/* Popular Cities */}
        <div className="lg:col-span-3 lg:row-span-2 lg:max-h-[350px] lg:min-h-[350px] bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 p-6 min-h-[200px] lg:min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-lg font-medium">Popular Cities</h3>
            <Button variant="ghost" className="text-white/60 text-sm hover:text-white">
              View more
            </Button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[calc(100%-60px)] pr-2">
            {popularCities.slice(0, 5).map((city, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-white/10 rounded-lg hover:bg-white/15 transition-colors border border-white/10 cursor-pointer"
                onClick={() => handleCitySelect(city.name)}
              >
                <div className="flex items-center gap-2">
                  <WeatherIcon condition={city.condition} size="sm" />
                  <div>
                    <p className="text-white font-medium text-sm">{city.name}</p>
                    <p className="text-white/60 text-xs">{city.description}</p>
                  </div>
                </div>
                <p className="text-white font-medium text-sm">{city.temp}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Forecast */}
        <div className="lg:col-span-3 lg:row-span-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 p-4 lg:max-h-[450px] lg:min-h-[450px]">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-white text-sm font-medium">Forecast</h3>
            <div className="flex gap-1 ml-auto">
              <Button size="sm" className="bg-white/20 text-white text-xs px-3 py-1 h-6 rounded-md">
                10 Days
              </Button>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100%-60px)] pr-2">
            {weeklyData.map((day, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/15 transition-all cursor-pointer border border-transparent hover:border-white/20"
                onClick={() => setSelectedDay(day)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                    <WeatherIcon condition={day?.condition} size="sm" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">
                      {day?.tempMax}°/{day?.tempMin}°C
                    </p>
                  </div>
                </div>
                <p className="text-white/60 text-xs">{day?.day}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Graph */}
        <div className="lg:col-span-9 lg:row-span-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 p-6 lg:max-h-[450px] lg:min-h-[450px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white text-lg font-medium">Summary</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                className={`px-3 py-1 h-7 rounded-md text-xs ${viewMode === "weekly" ? "bg-white/25 text-white" : "bg-transparent text-white/60 hover:bg-white/10"}`}
                onClick={() => setViewMode("weekly")}
              >
                Weekly
              </Button>
              <Button
                size="sm"
                className={`px-3 py-1 h-7 rounded-md text-xs ${viewMode === "hourly" ? "bg-white/25 text-white" : "bg-transparent text-white/60 hover:bg-white/10"}`}
                onClick={() => setViewMode("hourly")}
              >
                Hourly
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-white/70 text-sm">
              <span>{viewMode === "weekly" ? "This Week" : "Today"}</span>
              <span>
                {viewMode === "weekly"
                  ? (() => {
                      const today = new Date()
                      const endDate = new Date(today)
                      endDate.setDate(today.getDate() + 9)
                      return `${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    })()
                  : new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
              </span>
            </div>
            <div className="relative h-56 sm:h-72 bg-white/5 rounded-xl p-4 overflow-hidden">
              {(() => {
              const spanPct = 76;
              const leftEdge = (100 - spanPct) / 2;

              const x = (i: number) => {
              const n = currentData.length - 1;
              if (n <= 0) return 50;
              return leftEdge + (i / n) * spanPct;
            };

              // collect finite temps
              const points = currentData
              .map((d, i) => {
              const t = Number(d?.temp);
              if (!Number.isFinite(t)) return null;
              return { i, t };
            })
              .filter(Boolean) as { i: number; t: number }[];

              if (points.length === 0) {
              return null; // or render a small placeholder
            }

              // y scale from valid temps
              const vals = points.map(p => p.t);
              const dMin = Math.min(...vals), dMax = Math.max(...vals);
              const pad = 1.5;
              const min = dMin - pad, max = dMax + pad;
              const top = 2, bottom = 22;
              const y = (t: number) => {
              const pct = (t - min) / Math.max(max - min, 1e-6);
              return bottom - pct * (bottom - top);
            };

              const plot = points.map(p => ({ x: x(p.i), y: y(p.t), temp: Math.round(p.t) }));
              if (plot.length < 1) return null;

              const pathD = "M " + plot.map(p => `${p.x} ${p.y}`).join(" L ");

                return (
                    <>
                      {" "}
                      {/* ---- temperature values above points ---- */}
                      {/* ---- line + dots ---- */}
                      <div className="absolute top-8 sm:top-8 md:top-10 left-4 right-4 h-20 sm:h-24 z-0">
                        <div className="relative w-full h-full">
                          {/* --- the line stays in the SVG --- */}
                          <svg
                              className="absolute inset-0 w-full h-full"
                              viewBox="0 0 100 24"
                              preserveAspectRatio="none"             // keep filling the area
                              shapeRendering="geometricPrecision"
                          >
                            <path
                                d={pathD}
                                stroke="white"
                                strokeWidth="1.8"
                                fill="none"
                                vectorEffect="non-scaling-stroke"    // line width stays crisp
                            />
                          </svg>

                          {/* --- HTML overlay: dots + temperatures (no stretch) --- */}
                          {currentData.map((d, i) => {
                            const xi = x(i);              // 0..100 (already in % space)
                            const yi = y(d.temp);         // 0..24 (SVG units)
                            const yPct = (yi / 24) * 100; // convert to container %
                            return (
                                <div
                                    key={i}
                                    className="absolute pointer-events-none"
                                    style={{left: `${xi}%`, top: `${yPct}%`, transform: "translate(-50%, -50%)"}}
                                >
                                  {/* dot */}
                                  <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_0_2px_rgba(0,0,0,0.25)]"/>
                                  {/* temperature above the dot */}
                                  <div
                                      className="absolute left-1/2 -translate-x-1/2 -top-6 sm:-top-7 text-white font-medium text-[11px] sm:text-[12px]">
                                    {d.temp}°
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                      </div>
                      <div
                          className="absolute inset-x-3 bottom-24 sm:bottom-14 md:bottom-16 lg:bottom-20 z-20 pointer-events-none">
                        {currentData.map((d, i) => (
                            <div
                                key={`meta-${i}`}
                                className="absolute -translate-x-1/2 flex flex-col items-center"
                                style={{left: `${x(i)}%`}}
                            >
                              {/* icon + wind */}
                              <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                                {/* icon: smaller on mobile */}
                                <div className="scale-[0.6] sm:scale-90 md:scale-100">
                                  <WeatherIcon condition={d.condition} size="sm"/>
                                </div>

                                <div
                                    className="flex flex-col items-center sm:flex-row sm:items-center text-white/80 leading-none whitespace-nowrap">
                                  <Wind className="h-3 w-3 sm:h-3.5 sm:w-3.5"/>
                                  <span className="mt-0.5 sm:mt-0 sm:ml-1 text-[9px] sm:text-xs">{d.wind}

                                    <span className="hidden sm:inline">&nbsp;km/h</span>
                                      <span className="sm:hidden">km</span>
                                    </span>
                                </div>
                              </div>

                              {/* day/time: number-only on mobile, full on ≥sm */}
                              <div className="mt-1 text-white/60 leading-none text-[10px] sm:text-xs whitespace-nowrap">
                                {viewMode === "weekly" ? (
                                    <>
                                      <span className="sm:hidden">{d.dayShort}</span>
                                      <span className="hidden sm:inline">{d.day}</span>
                                    </>
                                ) : (
                                    <>
                                      <span className="sm:hidden">{d.timeShort ?? d.time}</span>
                                      <span className="hidden sm:inline">{d.time}</span>
                                    </>
                                )}
                              </div>
                            </div>
                        ))}
                      </div>
                    </>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
