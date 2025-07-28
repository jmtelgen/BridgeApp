import * as React from "react"
import { useDropzone } from "react-dropzone"
import { Cloud, File, Loader2, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { Photo } from "@/hooks/use-photos"

interface UploadPhotoProps extends React.HTMLAttributes<HTMLDivElement> {
  onUpload: (file: File) => Promise<Photo>
}

export function UploadPhoto({ onUpload, className, ...props }: UploadPhotoProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const { toast } = useToast()

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]

      if (file.size > 4 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 4MB",
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)

      try {
        await onUpload(file)
        toast({
          title: "Success",
          description: "Photo uploaded successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload photo",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload, toast],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    multiple: false,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative grid cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-10 text-center transition-colors hover:bg-accent hover:bg-opacity-5",
        isDragActive && "border-muted-foreground/50",
        className,
      )}
      {...props}
    >
      <input {...getInputProps()} />

      <div className="grid place-items-center gap-2">
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : isDragActive ? (
          <Cloud className="h-8 w-8" />
        ) : (
          <File className="h-8 w-8" />
        )}

        <div className="text-muted-foreground">
          {isUploading ? (
            <p>Uploading...</p>
          ) : isDragActive ? (
            <p>Drop the file here</p>
          ) : (
            <p>Drag & drop or click to upload</p>
          )}
        </div>

        {!isUploading && !isDragActive && (
          <Button variant="secondary" className="mt-2">
            Select File
          </Button>
        )}
      </div>
    </div>
  )
}

