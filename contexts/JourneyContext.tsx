import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface Journey {
  id: string;
  routeNumber: string;
  destination: string;
  departure: string;
  arrival: string;
  status: "on-time" | "delayed" | "cancelled";
  delayMinutes?: number;
  currentStop?: string;
  nextStop?: string;
}

interface JourneyContextType {
  currentJourney: Journey | null;
  setCurrentJourney: (journey: Journey | null) => void;
  journeyHistory: Journey[];
  addJourneyToHistory: (journey: Journey) => void;
  clearJourneyHistory: () => void;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

export const JourneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentJourney, setCurrentJourney] = useState<Journey | null>({
    id: "1",
    routeNumber: "42",
    destination: "Central Station",
    departure: "14:30",
    arrival: "15:15",
    status: "on-time",
    currentStop: "Market Square",
    nextStop: "City Hall",
  });
  
  const [journeyHistory, setJourneyHistory] = useState<Journey[]>([]);

  const addJourneyToHistory = (journey: Journey) => {
    setJourneyHistory(prev => [...prev, journey]);
  };

  const clearJourneyHistory = () => {
    setJourneyHistory([]);
  };

  return (
    <JourneyContext.Provider
      value={{
        currentJourney,
        setCurrentJourney,
        journeyHistory,
        addJourneyToHistory,
        clearJourneyHistory,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
};

export const useJourney = (): JourneyContextType => {
  const context = useContext(JourneyContext);
  if (context === undefined) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
};
