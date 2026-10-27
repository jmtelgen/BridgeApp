import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { RoomManager } from './components/bridge/components/Room';
import { RoomGame } from './components/bridge/components/RoomGame';
import CreateAccountPage from './components/bridge/components/auth/createAccount';
import LoginPage from './components/bridge/components/auth/login';
import { useRoomDataStore } from './stores/roomDataStore';
import { Toaster } from './components/ui/toaster';
import { websocketService } from './services/websocketService';
import { useAutoTokenRefresh } from './hooks/useAutoTokenRefresh';
import { Position } from './components/bridge/types';
import { PreferenceEffects } from './components/bridge/components/PlayerPreferences';

// Room component that shows at the root
function RoomPage() {
  const navigate = useNavigate();

  const handleRoomJoined = (roomId: string, playerPosition: Position) => {
    // Navigate to the room with the room ID
    navigate(`/room/${roomId}`);
  };

  const handleBackToRoom = () => {
    // Clear room data when going back to room list
    const { clearCurrentRoom } = useRoomDataStore.getState();
    clearCurrentRoom();
    navigate('/');
  };

  return (
    <div>
      <RoomManager onRoomJoined={handleRoomJoined} />
    </div>
  );
}

// Bridge game component for the room route
function RoomGameWrapper() {
  return <RoomGame />;
}

export function App() {
  // Use auto token refresh hook
  const { isRefreshing, shouldShowLogin } = useAutoTokenRefresh()

  // Signed identity and connection are obtained on demand, not invented on app start.
  useEffect(() => {
    // Handle page unload (browser close, refresh, navigation)
    const handleBeforeUnload = () => {
      websocketService.disconnect()
    }

    // Handle page visibility change (tab switching)
    const handleVisibilityChange = () => {
      // Don't disconnect when tab is hidden, only when tab is closed
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function to remove event listeners when app unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // Don't disconnect WebSocket on app unmount - only on tab close
    }
  }, [])

  // Show loading state while attempting token refresh
  if (isRefreshing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Refreshing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PreferenceEffects />
      <Routes>
        <Route path="/" element={<RoomPage />} />
        <Route path="/room/:roomId" element={<RoomGameWrapper />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
