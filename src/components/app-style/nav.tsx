"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import { Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface NavItem {
  title: string
  to: string
  disabled?: boolean
}

interface NavbarProps {
  items?: NavItem[]
}

export function Navbar({ items = [] }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const defaultItems: NavItem[] = [
    {
      title: "Photo Storage",
      to: "/photos",
    },
    {
      title: "Todo List",
      to: "/todo",
    },
    {
      title: "About Me",
      to: "/about",
    }
  ]

  const navItems = items.length ? items : defaultItems

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Jake's Page</span>
          </Link>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex gap-6">
          {navItems.map((item, index) => (
            <Link
              key={index}
              to={item.to}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                item.disabled && "cursor-not-allowed opacity-80",
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Mobile navigation */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col gap-4 mt-8">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.to}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    item.disabled && "cursor-not-allowed opacity-80",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="outline" size="sm">
            Log in
          </Button>
          <Button size="sm">Sign up</Button>
        </div>
      </div>
    </header>
  )
}

