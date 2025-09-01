import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DragDropContextType {
  draggedItem: string | null;
  setDraggedItem: (item: string | null) => void;
  dragOverItem: string | null;
  setDragOverItem: (item: string | null) => void;
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined);

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};

interface DragDropProviderProps {
  children: ReactNode;
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({ children }) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  return (
    <DragDropContext.Provider value={{
      draggedItem,
      setDraggedItem,
      dragOverItem,
      setDragOverItem
    }}>
      {children}
    </DragDropContext.Provider>
  );
};