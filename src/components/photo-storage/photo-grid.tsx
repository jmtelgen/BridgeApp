import { Img } from "react-image"
import { Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Photo } from "@/hooks/use-photos"

interface PhotoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  photos: Photo[]
  onDelete: (id: string) => void
}

export function PhotoGrid({ photos, onDelete, className, ...props }: PhotoGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4", className)} {...props}>
      {photos.map((photo) => (
        <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
          <Img
            src={photo.url || "/placeholder.svg"}
            alt={photo.name}
            className="object-cover transition-all group-hover:scale-105"
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <a
              href={photo.url}
              download={photo.name}
              className="rounded-full bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/75"
            >
              Download
            </a>
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full"
              onClick={(e) => {
                e.preventDefault()
                onDelete(photo.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete photo</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

