import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface Stop {
  uuid: string;
  name: string;
  arrivalTime?: string;
  departureTime?: string;
}

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
  // API-related fields
  vehicleUuid?: string;
  stops?: Stop[]; // Lista wszystkich przystanków na trasie
  currentStopIndex?: number; // Indeks obecnego przystanku
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
  const [currentJourney, setCurrentJourney] = useState<Journey | null>(null);
  
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
