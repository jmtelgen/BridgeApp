import { useEffect, useState } from 'react';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { RoomManager } from './components/bridge/components/Room';
import { RoomGame } from './components/bridge/components/RoomGame';
import { useRoomStore } from './stores/roomStore';
import { useRoomDataStore } from './stores/roomDataStore';
import { useUserStore } from './stores/userStore';
import { Toaster } from './components/ui/toaster';
import { websocketService } from './services/websocketService';
import { useWebSocketCleanup } from './hooks/useWebSocketCleanup';

// Room component that shows at the root
function RoomPage() {
  const navigate = useNavigate();
  const { theme, addValidRoom } = useRoomStore();

  const handleRoomJoined = (roomId: string, playerPosition: string) => {
    // Add the room to valid rooms before navigating
    addValidRoom(roomId);
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
      <RoomManager theme={theme} onRoomJoined={handleRoomJoined} />
    </div>
  );
}

// Bridge game component for the room route
function RoomGameWrapper() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { isValidRoom, addValidRoom } = useRoomStore();
  const { currentRoom } = useRoomDataStore();
  const [isLoading, setIsLoading] = useState(true);

  // Use WebSocket cleanup hook
  useWebSocketCleanup(roomId);

  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      return;
    }

    // If we have room data for this roomId, consider it valid
    if (currentRoom && currentRoom.roomId === roomId) {
      addValidRoom(roomId);
      setIsLoading(false);
      return;
    }

    // Check if the user has valid access to this room
    if (!isValidRoom(roomId)) {
      // Redirect back to room screen if they don't have valid access
      navigate('/', { replace: true });
    } else {
      setIsLoading(false);
    }
  }, [roomId, isValidRoom, currentRoom, addValidRoom, navigate]);

  // Show loading state while checking room access
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  // Don't render the game if the user doesn't have valid access
  if (!roomId || !isValidRoom(roomId)) {
    return null; // Will redirect in useEffect
  }
  
  return <RoomGame />;
}

export function App() {
  const { generateUserId } = useUserStore()

  // Initialize user ID on app start (WebSocket connection will happen when needed)
  useEffect(() => {
    // Generate user ID on initial page load
    const userId = generateUserId()
    console.log('App initialized with user ID:', userId)
    // Note: WebSocket connection will be established when user creates or joins a room

    // Handle page unload (browser close, refresh, navigation)
    const handleBeforeUnload = () => {
      console.log('Page unloading, cleaning up WebSocket connection')
      websocketService.disconnect()
    }

    // Handle page visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page hidden, keeping WebSocket connection alive')
        // Don't disconnect when tab is hidden, only when tab is closed
      } else {
        console.log('Page visible, WebSocket connection maintained')
        // Connection should still be active from previous room creation/joining
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function to remove event listeners when app unmounts
    return () => {
      console.log('App unmounting, removing event listeners')
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // Don't disconnect WebSocket on app unmount - only on tab close
    }
  }, [generateUserId])

  return (
    <>
      <Routes>
        <Route path="/" element={<RoomPage />} />
        <Route path="/room/:roomId" element={<RoomGameWrapper />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
