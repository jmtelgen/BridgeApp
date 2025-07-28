import { useNavigate } from 'react-router-dom';
import Page from '../photo-storage/page';
import { useAppState } from '@/state-management/app-store';

export function HomeComponent() {
  const loggedIn = useAppState((state) => state.loggedIn);
  const navigate = useNavigate();

  if (loggedIn) navigate('/login');

  return (
    <div>
      <Page/>
    </div>
  );
}

export default HomeComponent;
