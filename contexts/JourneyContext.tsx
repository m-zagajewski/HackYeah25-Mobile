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
  const [currentJourney, setCurrentJourney] = useState<Journey | null>({
    id: "1",
    routeNumber: "42",
    destination: "Central Station",
    departure: "14:30",
    arrival: "15:15",
    status: "on-time",
    currentStop: "Market Square",
    nextStop: "City Hall",
    // Mock data for API testing
    vehicleUuid: "7a7eb004-794d-4f68-b79c-c6ad3042f9d0",
    currentStopIndex: 2,
    stops: [
      { uuid: "a1b2c3d4-1111-4444-8888-111111111111", name: "Terminal A", departureTime: "14:00" },
      { uuid: "b2c3d4e5-2222-4444-8888-222222222222", name: "Main Street", arrivalTime: "14:15", departureTime: "14:16" },
      { uuid: "33d92c11-966a-48b8-9e0d-6d038ec3905b", name: "Market Square", arrivalTime: "14:25", departureTime: "14:30" }, // current
      { uuid: "0f1835a0-846d-4eae-983e-fbd9548130e0", name: "City Hall", arrivalTime: "14:45", departureTime: "14:46" }, // next
      { uuid: "c3d4e5f6-3333-4444-8888-333333333333", name: "Park Avenue", arrivalTime: "15:00", departureTime: "15:01" },
      { uuid: "d4e5f6g7-4444-4444-8888-444444444444", name: "Central Station", arrivalTime: "15:15" },
    ],
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
