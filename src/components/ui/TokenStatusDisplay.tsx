import React from 'react'
import { useTokenStatus } from '../../hooks/useTokenStatus'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'

interface TokenStatusDisplayProps {
  showDetails?: boolean
  className?: string
}

export function TokenStatusDisplay({ showDetails = false, className = '' }: TokenStatusDisplayProps) {
  const { isExpired, needsRefreshSoon, timeUntilExpiry, formattedTimeUntilExpiry } = useTokenStatus()

  if (!timeUntilExpiry) {
    return null // Don't show if no token
  }

  const getStatusIcon = () => {
    if (isExpired) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    } else if (needsRefreshSoon) {
      return <Clock className="w-4 h-4 text-yellow-500" />
    } else {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
  }

  const getStatusText = () => {
    if (isExpired) {
      return 'Token expired'
    } else if (needsRefreshSoon) {
      return 'Refreshing soon'
    } else {
      return 'Token valid'
    }
  }

  const getStatusColor = () => {
    if (isExpired) {
      return 'text-red-600'
    } else if (needsRefreshSoon) {
      return 'text-yellow-600'
    } else {
      return 'text-green-600'
    }
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {getStatusIcon()}
      <span className={getStatusColor()}>
        {getStatusText()}
      </span>
      
      {showDetails && formattedTimeUntilExpiry && (
        <span className="text-gray-500">
          (expires in {formattedTimeUntilExpiry})
        </span>
      )}
    </div>
  )
}
