import { usePhotos } from "@/hooks/use-photos"
import { PhotoGrid } from "@/components/photo-storage/photo-grid"
import { UploadPhoto } from "@/components/photo-storage/upload-photo"
import { Toaster } from "@/components/ui/toaster"

export default function Page() {
  const { photos, addPhoto, deletePhoto } = usePhotos()

  return (
    <main className="container mx-auto min-h-screen max-w-7xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Photo Storage</h1>
        <p className="text-muted-foreground">Upload and store your photos in your browser.</p>
      </div>

      <UploadPhoto onUpload={addPhoto} className="max-w-2xl" />

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Photos</h2>
        <PhotoGrid photos={photos} onDelete={deletePhoto} />
      </div>

      <Toaster />
    </main>
  )
}