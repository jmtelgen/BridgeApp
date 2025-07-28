import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between md:py-4">
        <div className="flex flex-col gap-4 md:order-1 md:flex-row md:gap-6">
          <Button asChild variant="ghost" size="icon">
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <XIcon className="h-4 w-4" />
              <span className="sr-only">GitHub</span>
            </a>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <a href="https://twitter.com" target="_blank" rel="noreferrer">
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Twitter</span>
            </a>
          </Button>
        </div>
        <Separator className="md:hidden" />
        <div className="flex flex-col gap-4 md:order-0 md:flex-row md:gap-6">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <a href="#" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
              Your Name
            </a>
            . The source code is available on{" "}
            <a href="#" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
              GitHub
            </a>
            .
          </p>
        </div>
        <Separator className="md:hidden" />
        <div className="flex flex-col gap-4 md:order-2 md:flex-row md:gap-6">
          <a href="#" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Privacy Policy
          </a>
          <a href="#" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Terms & Conditions
          </a>
        </div>
      </div>
    </footer>
  )
}