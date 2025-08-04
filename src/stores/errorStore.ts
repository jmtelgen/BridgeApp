import { create } from 'zustand'
import { toast } from '../hooks/use-toast'

interface ErrorStore {
  // Actions
  showError: (message: string, title?: string) => void
  showSuccess: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  
  // API Error Handler
  handleApiError: (error: unknown, defaultMessage?: string) => void
}

export const useErrorStore = create<ErrorStore>((set, get) => ({
  showError: (message: string, title: string = "Error") => {
    toast({
      variant: "destructive",
      title,
      description: message,
    })
  },

  showSuccess: (message: string, title: string = "Success") => {
    toast({
      variant: "default",
      title,
      description: message,
    })
  },

  showWarning: (message: string, title: string = "Warning") => {
    toast({
      variant: "default",
      title,
      description: message,
    })
  },

  showInfo: (message: string, title: string = "Info") => {
    toast({
      variant: "default",
      title,
      description: message,
    })
  },

  handleApiError: (error: unknown, defaultMessage: string = "An unexpected error occurred") => {
    let errorMessage = defaultMessage
    
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message)
    }
    
    get().showError(errorMessage)
  }
})) 