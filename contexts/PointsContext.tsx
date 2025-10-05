import React, { createContext, ReactNode, useContext, useState } from 'react';

interface PointsContextType {
  userPoints: number;
  userName: string;
  addPoints: (points: number) => void;
  setUserName: (name: string) => void;
}

const PointsContext = createContext<PointsContextType | undefined>(undefined);

interface PointsProviderProps {
  children: ReactNode;
}

export function PointsProvider({ children }: PointsProviderProps) {
  const [userPoints, setUserPoints] = useState(120); // Starting points
  const [userName, setUserName] = useState('Michał'); // Default name

  const addPoints = (points: number) => {
    const newTotal = userPoints + points;
    setUserPoints(newTotal);
    console.log(`🎉 Added ${points} points! Total: ${newTotal}`);
  };

  const handleSetUserName = (name: string) => {
    setUserName(name);
  };

  return (
    <PointsContext.Provider
      value={{
        userPoints,
        userName,
        addPoints,
        setUserName: handleSetUserName,
      }}
    >
      {children}
    </PointsContext.Provider>
  );
}

export function usePoints(): PointsContextType {
  const context = useContext(PointsContext);
  if (context === undefined) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
}

// Utility function to generate random points for issue reporting
export function generateRewardPoints(): number {
  // Random points between 5-25 for reporting issues
  return Math.floor(Math.random() * 21) + 5; // 5-25 points
}