import { useEffect } from 'react';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import BridgeGame from './components/bridge/play';
import { RoomManager } from './components/bridge/components/Room';
import { useRoomStore } from './stores/roomStore';
import { Toaster } from './components/ui/toaster';

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
function RoomGame() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { isValidRoom } = useRoomStore();

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
  
  return (
    <div>
      <BridgeGame />
    </div>
  );
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RoomPage />} />
        <Route path="/room/:roomId" element={<RoomGame />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
