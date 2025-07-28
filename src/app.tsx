// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from 'react-bootstrap';
import { Route, Routes } from 'react-router-dom';
import HomeComponent from './components/home-page/HomeComponent';
import TodoListComponent from './components/todo-list/todo-list-component';
import Page from './components/photo-storage/page';
import { Navbar } from './components/app-style/nav';
import { Footer } from './components/app-style/footer';
import { useAppState } from './state-management/app-store';
import BridgeGame from './components/bridge/play';

export function App() {

  return (
    <div>
      <BridgeGame />
    </div>
  );
}

export default App;
