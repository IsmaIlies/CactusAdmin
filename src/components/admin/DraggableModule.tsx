import React, { ReactNode } from 'react';
import { useDragDrop } from './DragDropProvider';

interface DraggableModuleProps {
  id: string;
  title: string;
  children: ReactNode;
  onMove: (fromId: string, toId: string) => void;
  className?: string;
}

const DraggableModule: React.FC<DraggableModuleProps> = ({
  id,
  title,
  children,
  onMove,
  className = ''
}) => {
  const { draggedItem, setDraggedItem, dragOverItem, setDragOverItem } = useDragDrop();

  const handleDragStart = (e: React.DragEvent) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    if (draggedItem && dragOverItem && draggedItem !== dragOverItem) {
      onMove(draggedItem, dragOverItem);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItem && draggedItem !== id) {
      setDragOverItem(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const isDragging = draggedItem === id;
  const isDragOver = dragOverItem === id;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDragOver ? 'border-cactus-400 shadow-lg scale-105' : ''}
        ${className}
      `}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-100 cursor-move">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-gray-400 text-lg">⋮⋮</span>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default DraggableModule;