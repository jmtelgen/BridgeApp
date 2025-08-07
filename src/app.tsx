import { useEffect } from 'react';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { RoomManager } from './components/bridge/components/Room';
import { RoomGame } from './components/bridge/components/RoomGame';
import { useRoomStore } from './stores/roomStore';
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
  const { isValidRoom } = useRoomStore();

  // Use WebSocket cleanup hook
  useWebSocketCleanup(roomId);

  useEffect(() => {
    // Check if the user has valid access to this room
    if (roomId && !isValidRoom(roomId)) {
      // Redirect back to room screen if they don't have valid access
      navigate('/', { replace: true });
    }
  }, [roomId, isValidRoom, navigate]);

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
