import { isAccordionItemSelected } from "react-bootstrap/esm/AccordionContext";
import { create } from "zustand";

export enum Status {
  INCOMPLETE = "Incomplete",
  IN_PROGRESS = "In Progress",
  COMPLETE = "Complete",
}

interface ItemState {
  id: number,
  status: Status;
  description?: string;
  title: string;
  date: string,
  time: string,
}

interface listState {
  items: Array<ItemState>;
  addItem: (title: string, status: Status, date: string, time: string, description?: string) => void,
  updateItem: (id: number, status: Status, date: string, time: string, description?: string) => void,
  deleteItem: (id: number) => void,
}

interface checkedItem {
  checked: boolean,
  id?: number,
  checkItem: (id: number) => void,
  unCheckItem: () => void,
}

const mockData = [
  {
    id: 0,
    status: Status.INCOMPLETE,
    description: "Please do this",
    title: "My todo item",
    date: "2024-07-18",
    time: "09:18",
  },
  {
    id: 1,
    status: Status.COMPLETE,
    description: "Please also do this",
    title: "My other todo item",
    date: "2024-08-19",
    time: "21:01",
  }
]

export const useChecked = create<checkedItem>()((set) => ({
  checked: false,
  id: undefined,
  checkItem: (id: number) => set((state) => ({
    checked: true,
    id: id,
  })),
  unCheckItem: () => set((state) => ({
    checked: false,
    id: undefined,
  })) 
}))

export const useItem = create<listState>()((set) => ({
  items: mockData,
  addItem: (title: string, status: Status, date: string, time: string, description?: string) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: state.items.length,
          status: status,
          title: title,
          date: date,
          description: description,
          time: time,
        },
      ],
    })),
  updateItem: (id: number, status: Status, date: string, time: string, description?: string) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { 
          ...item,
          id: id, 
          status: status, 
          date: date, 
          time: time,
          description: description === undefined ? item.description : description,
         } : item,
      ),
    })),
  deleteItem: (id: number) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}));

export default useItem;