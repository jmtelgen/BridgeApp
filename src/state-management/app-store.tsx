import { create } from "zustand";

interface appState {
  loggedIn: boolean;
  logIn: () => void,
}

export const useAppState = create<appState>()((set) => ({
  loggedIn: false,
  logIn() {
    set({loggedIn: true});
  },
}));