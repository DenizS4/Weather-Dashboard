import { Cloud, CloudRain, Sun, CloudSnow, Zap, CloudDrizzle, Eye } from "lucide-react"

interface WeatherIconProps {
  condition: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export default function WeatherIcon({ condition, size = "md", className = "" }: WeatherIconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }

  const iconClass = `${sizeClasses[size]} ${className}`

  switch (condition.toLowerCase()) {
    case "clear":
      return <Sun className={`${iconClass} text-yellow-400`} />
    case "rain":
      return <CloudRain className={`${iconClass} text-blue-400`} />
    case "clouds":
      return <Cloud className={`${iconClass} text-gray-300`} />
    case "snow":
      return <CloudSnow className={`${iconClass} text-white`} />
    case "thunderstorm":
      return <Zap className={`${iconClass} text-yellow-500`} />
    case "drizzle":
      return <CloudDrizzle className={`${iconClass} text-blue-300`} />
    case "fog":
      return <Eye className={`${iconClass} text-gray-400`} />
    default:
      return <Sun className={`${iconClass} text-yellow-400`} />
  }
}
