import React, { createContext, useState, useContext, ReactNode } from 'react';

interface Entity {
  id: string;
  name: string;
  type: 'restaurant' | 'event';
  location?: string;
  cuisine?: string;
}

interface EntityContextType {
  visibleEntities: Entity[];
  setVisibleEntities: (entities: Entity[]) => void;
  addVisibleEntity: (entity: Entity) => void;
  clearVisibleEntities: () => void;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export const EntityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visibleEntities, setVisibleEntities] = useState<Entity[]>([]);

  const addVisibleEntity = (entity: Entity) => {
    setVisibleEntities(prev => {
      if (prev.find(e => e.id === entity.id)) return prev;
      return [...prev, entity];
    });
  };

  const clearVisibleEntities = () => setVisibleEntities([]);

  return (
    <EntityContext.Provider value={{ visibleEntities, setVisibleEntities, addVisibleEntity, clearVisibleEntities }}>
      {children}
    </EntityContext.Provider>
  );
};

export const useEntity = () => {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error('useEntity must be used within an EntityProvider');
  }
  return context;
};
