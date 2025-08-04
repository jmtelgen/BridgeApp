import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export interface Theme {
  name: string
  colors: {
    background: string
    cardBackground: string
    tableBackground: string
    primary: string
    secondary: string
    accent: string
    text: string
    textMuted: string
    border: string
    cardBorder: string
    selectedCard: string
    currentPlayer: string
  }
}

export const themes: Theme[] = [
  {
    name: "Classic Green",
    colors: {
      background: "bg-emerald-50",
      cardBackground: "bg-white",
      tableBackground: "bg-emerald-200",
      primary: "bg-emerald-600 text-white",
      secondary: "bg-emerald-100 text-emerald-800",
      accent: "bg-emerald-500",
      text: "text-gray-900",
      textMuted: "text-gray-600",
      border: "border-emerald-300",
      cardBorder: "border-gray-300",
      selectedCard: "ring-emerald-500 bg-emerald-50",
      currentPlayer: "bg-emerald-600 text-white",
    },
  },
  {
    name: "Royal Blue",
    colors: {
      background: "bg-blue-50",
      cardBackground: "bg-white",
      tableBackground: "bg-blue-200",
      primary: "bg-blue-600 text-white",
      secondary: "bg-blue-100 text-blue-800",
      accent: "bg-blue-500",
      text: "text-gray-900",
      textMuted: "text-gray-600",
      border: "border-blue-300",
      cardBorder: "border-gray-300",
      selectedCard: "ring-blue-500 bg-blue-50",
      currentPlayer: "bg-blue-600 text-white",
    },
  },
  {
    name: "Burgundy Elegance",
    colors: {
      background: "bg-red-50",
      cardBackground: "bg-white",
      tableBackground: "bg-red-200",
      primary: "bg-red-700 text-white",
      secondary: "bg-red-100 text-red-800",
      accent: "bg-red-600",
      text: "text-gray-900",
      textMuted: "text-gray-600",
      border: "border-red-300",
      cardBorder: "border-gray-300",
      selectedCard: "ring-red-500 bg-red-50",
      currentPlayer: "bg-red-700 text-white",
    },
  },
  {
    name: "Forest Club",
    colors: {
      background: "bg-green-50",
      cardBackground: "bg-white",
      tableBackground: "bg-green-300",
      primary: "bg-green-700 text-white",
      secondary: "bg-green-100 text-green-800",
      accent: "bg-green-600",
      text: "text-gray-900",
      textMuted: "text-gray-600",
      border: "border-green-400",
      cardBorder: "border-gray-300",
      selectedCard: "ring-green-500 bg-green-50",
      currentPlayer: "bg-green-700 text-white",
    },
  },
  {
    name: "Midnight Navy",
    colors: {
      background: "bg-slate-100",
      cardBackground: "bg-white",
      tableBackground: "bg-slate-300",
      primary: "bg-slate-700 text-white",
      secondary: "bg-slate-200 text-slate-800",
      accent: "bg-slate-600",
      text: "text-gray-900",
      textMuted: "text-gray-600",
      border: "border-slate-400",
      cardBorder: "border-gray-300",
      selectedCard: "ring-slate-500 bg-slate-50",
      currentPlayer: "bg-slate-700 text-white",
    },
  },
  {
    name: "Golden Casino",
    colors: {
      background: "bg-amber-50",
      cardBackground: "bg-white",
      tableBackground: "bg-amber-200",
      primary: "bg-amber-600 text-white",
      secondary: "bg-amber-100 text-amber-800",
      accent: "bg-amber-500",
      text: "text-gray-900",
      textMuted: "text-gray-600",
      border: "border-amber-300",
      cardBorder: "border-gray-300",
      selectedCard: "ring-amber-500 bg-amber-50",
      currentPlayer: "bg-amber-600 text-white",
    },
  },
  {
    name: "Purple Majesty",
    colors: {
      background: "bg-purple-50",
      cardBackground: "bg-white",
      tableBackground: "bg-purple-200",
      primary: "bg-purple-600 text-white",
      secondary: "bg-purple-100 text-purple-800",
      accent: "bg-purple-500",
      text: "text-gray-900",
      textMuted: "text-gray-600",
      border: "border-purple-300",
      cardBorder: "border-gray-300",
      selectedCard: "ring-purple-500 bg-purple-50",
      currentPlayer: "bg-purple-600 text-white",
    },
  },
  {
    name: "Dark Mode",
    colors: {
      background: "bg-gray-900",
      cardBackground: "bg-gray-800",
      tableBackground: "bg-gray-700",
      primary: "bg-gray-600 text-white",
      secondary: "bg-gray-700 text-gray-200",
      accent: "bg-gray-500",
      text: "text-gray-100",
      textMuted: "text-gray-400",
      border: "border-gray-600",
      cardBorder: "border-gray-500",
      selectedCard: "ring-gray-400 bg-gray-700",
      currentPlayer: "bg-gray-600 text-white",
    },
  },
]

interface ThemeSelectorProps {
  currentTheme: Theme
  onThemeChange: (theme: Theme) => void
}

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full ${currentTheme.colors.accent}`}></div>
        {currentTheme.name}
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
          <h3 className="font-semibold mb-3">Choose Theme</h3>
          <div className="grid grid-cols-2 gap-3">
            {themes.map((theme) => (
              <Card
                key={theme.name}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  currentTheme.name === theme.name ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => {
                  onThemeChange(theme)
                  setIsOpen(false)
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${theme.colors.accent}`}></div>
                    <span className="text-sm font-medium">{theme.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <div className={`w-4 h-6 rounded-sm ${theme.colors.background}`}></div>
                    <div className={`w-4 h-6 rounded-sm ${theme.colors.tableBackground}`}></div>
                    <div className={`w-4 h-6 rounded-sm ${theme.colors.primary}`}></div>
                    <div className={`w-4 h-6 rounded-sm ${theme.colors.secondary}`}></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
