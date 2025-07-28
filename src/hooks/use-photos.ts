"use client"

import { useState, useEffect } from "react"

export interface Photo {
  id: string
  name: string
  url: string
  createdAt: number
}

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    // Load photos from localStorage on mount
    const savedPhotos = localStorage.getItem("photos")
    if (savedPhotos) {
      setPhotos(JSON.parse(savedPhotos))
    }
  }, [])

  const addPhoto = async (file: File) => {
    return new Promise<Photo>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const newPhoto: Photo = {
          id: crypto.randomUUID(),
          name: file.name,
          url: e.target?.result as string,
          createdAt: Date.now(),
        }

        setPhotos((prev) => {
          const updated = [newPhoto, ...prev]
          localStorage.setItem("photos", JSON.stringify(updated))
          return updated
        })

        resolve(newPhoto)
      }

      reader.onerror = () => reject(new Error("Failed to read file"))

      reader.readAsDataURL(file)
    })
  }

  const deletePhoto = (id: string) => {
    setPhotos((prev) => {
      const updated = prev.filter((photo) => photo.id !== id)
      localStorage.setItem("photos", JSON.stringify(updated))
      return updated
    })
  }

  return { photos, addPhoto, deletePhoto }
}

