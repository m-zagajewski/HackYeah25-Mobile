import React, { createContext, ReactNode, useContext, useState } from 'react';

// Backend API types
interface ApiStop {
  uuid: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface ApiVehicle {
  uuid: string;
  license_plate: string;
  type: string;
  line_number: number;
  destination: string;
  capacity: number;
  owner: string;
}

interface ApiSegment {
  segment_id: number;
  type: 'walking' | 'transit';
  from_stop: ApiStop;
  to_stop: ApiStop;
  departure_timestamp: number;
  arrival_timestamp: number;
  duration_minutes: number;
  walking_distance_meters: number | null;
  vehicle: ApiVehicle | null;
  delay: number | null;
}

interface ApiRouteResponse {
  success: boolean;
  message: string;
  route_segments: ApiSegment[];
  summary: {
    total_duration_minutes: number;
    total_walking_time_minutes: number;
    total_walking_distance_meters: number;
    total_wait_time_minutes: number;
    total_delay_time_minutes: number;
    number_of_transfers: number;
    departure_timestamp: number;
    arrival_timestamp: number;
    segments_count: number;
    walking_segments_count: number;
    transit_segments_count: number;
  };
  detailed_geometry?: [number, number][]; // Array of [latitude, longitude] coordinates
}

const API_BASE_URL = 'http://192.168.2.2:8000/api/v1';

export interface Stop {
  uuid: string;
  name: string;
  arrivalTime?: string;
  departureTime?: string;
}

export interface RouteSegment {
  segmentId: number;
  type: 'walking' | 'transit';
  fromStop: Stop;
  toStop: Stop;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  walkingDistanceMeters?: number;
  vehicleInfo?: {
    lineNumber: number;
    destination: string;
    type: string;
  };
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
  segments?: RouteSegment[]; // Segmenty trasy (walking + transit)
  currentStopIndex?: number; // Indeks obecnego przystanku
  routeGeometry?: { latitude: number; longitude: number }[]; // Detailed route coordinates
}

interface JourneyContextType {
  currentJourney: Journey | null;
  setCurrentJourney: (journey: Journey | null) => void;
  journeyHistory: Journey[];
  addJourneyToHistory: (journey: Journey) => void;
  clearJourneyHistory: () => void;
  fetchRoute: (startLat: number, startLon: number, endLat: number, endLon: number, departureDate?: Date) => Promise<Journey | null>;
  isLoadingRoute: boolean;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

// Helper function to convert timestamp to time string
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
};

// Transform API response to Journey format
const transformApiResponseToJourney = (apiResponse: ApiRouteResponse): Journey => {
  console.log('🔍 All route segments:', JSON.stringify(apiResponse.route_segments, null, 2));
  console.log('📊 Segment types:', apiResponse.route_segments.map(seg => seg.type));
  
  const transitSegments = apiResponse.route_segments.filter(seg => seg.type === 'transit');
  const walkingSegments = apiResponse.route_segments.filter(seg => seg.type === 'walking');
  console.log('🚆 Transit segments count:', transitSegments.length);
  console.log('🚶 Walking segments count:', walkingSegments.length);
  
  const isWalkingOnly = transitSegments.length === 0;
  const allSegments = apiResponse.route_segments;
  const firstSegment = allSegments[0];
  const lastSegment = allSegments[allSegments.length - 1];
  
  // Group consecutive segments of the same type
  const groupedSegments: RouteSegment[] = [];
  let currentGroup: ApiSegment[] = [];
  let currentType: 'walking' | 'transit' | null = null;
  
  allSegments.forEach((seg, index) => {
    if (seg.type !== currentType) {
      // Finish previous group
      if (currentGroup.length > 0) {
        const firstInGroup = currentGroup[0];
        const lastInGroup = currentGroup[currentGroup.length - 1];
        const totalDuration = currentGroup.reduce((sum, s) => sum + s.duration_minutes, 0);
        const totalWalkingDistance = currentGroup.reduce((sum, s) => sum + (s.walking_distance_meters || 0), 0);
        
        groupedSegments.push({
          segmentId: firstInGroup.segment_id,
          type: firstInGroup.type,
          fromStop: {
            uuid: firstInGroup.from_stop.uuid,
            name: firstInGroup.from_stop.name,
            departureTime: formatTime(firstInGroup.departure_timestamp),
          },
          toStop: {
            uuid: lastInGroup.to_stop.uuid,
            name: lastInGroup.to_stop.name,
            arrivalTime: formatTime(lastInGroup.arrival_timestamp),
          },
          departureTime: formatTime(firstInGroup.departure_timestamp),
          arrivalTime: formatTime(lastInGroup.arrival_timestamp),
          durationMinutes: totalDuration,
          walkingDistanceMeters: totalWalkingDistance > 0 ? totalWalkingDistance : undefined,
          vehicleInfo: firstInGroup.vehicle ? {
            lineNumber: firstInGroup.vehicle.line_number,
            destination: firstInGroup.vehicle.destination,
            type: firstInGroup.vehicle.type,
          } : undefined,
        });
      }
      
      // Start new group
      currentGroup = [seg];
      currentType = seg.type;
    } else {
      // Add to current group
      currentGroup.push(seg);
    }
  });
  
  // Don't forget the last group
  if (currentGroup.length > 0) {
    const firstInGroup = currentGroup[0];
    const lastInGroup = currentGroup[currentGroup.length - 1];
    const totalDuration = currentGroup.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalWalkingDistance = currentGroup.reduce((sum, s) => sum + (s.walking_distance_meters || 0), 0);
    
    groupedSegments.push({
      segmentId: firstInGroup.segment_id,
      type: firstInGroup.type,
      fromStop: {
        uuid: firstInGroup.from_stop.uuid,
        name: firstInGroup.from_stop.name,
        departureTime: formatTime(firstInGroup.departure_timestamp),
      },
      toStop: {
        uuid: lastInGroup.to_stop.uuid,
        name: lastInGroup.to_stop.name,
        arrivalTime: formatTime(lastInGroup.arrival_timestamp),
      },
      departureTime: formatTime(firstInGroup.departure_timestamp),
      arrivalTime: formatTime(lastInGroup.arrival_timestamp),
      durationMinutes: totalDuration,
      walkingDistanceMeters: totalWalkingDistance > 0 ? totalWalkingDistance : undefined,
      vehicleInfo: firstInGroup.vehicle ? {
        lineNumber: firstInGroup.vehicle.line_number,
        destination: firstInGroup.vehicle.destination,
        type: firstInGroup.vehicle.type,
      } : undefined,
    });
  }
  
  const segments = groupedSegments;
  console.log('✅ Grouped segments:', segments.length, 'segments');
  console.log('📊 Grouped segment types:', segments.map(s => s.type));
  
  // Convert detailed_geometry from [lat, lon] to {latitude, longitude}
  const routeGeometry = apiResponse.detailed_geometry?.map(coord => ({
    latitude: coord[0],
    longitude: coord[1]
  })) || [];
  console.log('🗺️ Route geometry points:', routeGeometry.length);
  
  if (isWalkingOnly) {
    // Walking-only route
    console.log('🚶 This is a walking-only route');
    
    const walkingDistanceKm = (apiResponse.summary.total_walking_distance_meters / 1000).toFixed(1);
    
    return {
      id: `route-${Date.now()}`,
      routeNumber: '🚶',
      destination: lastSegment?.to_stop.name || 'Cel podróży',
      departure: formatTime(apiResponse.summary.departure_timestamp),
      arrival: formatTime(apiResponse.summary.arrival_timestamp),
      status: 'on-time',
      currentStop: firstSegment?.from_stop.name,
      nextStop: allSegments[1]?.from_stop.name || firstSegment?.to_stop.name,
      segments,
      currentStopIndex: 0,
      routeGeometry,
    };
  }
  
  // Transit route (with public transport)
  console.log('🚆 This is a transit route');
  const firstTransit = transitSegments[0];
  const lastTransit = transitSegments[transitSegments.length - 1];
  
  // Get the main vehicle/line (most common vehicle in the route)
  const vehicleCounts = new Map<number, { vehicle: ApiVehicle; count: number }>();
  transitSegments.forEach(seg => {
    if (seg.vehicle) {
      const lineNum = seg.vehicle.line_number;
      const existing = vehicleCounts.get(lineNum);
      if (existing) {
        existing.count++;
      } else {
        vehicleCounts.set(lineNum, { vehicle: seg.vehicle, count: 1 });
      }
    }
  });
  
  const mainVehicleEntry = Array.from(vehicleCounts.values()).sort((a, b) => b.count - a.count)[0];
  const mainVehicle = mainVehicleEntry?.vehicle;
  
  const hasDelay = apiResponse.summary.total_delay_time_minutes > 0;
  const status: Journey['status'] = hasDelay ? 'delayed' : 'on-time';
  
  return {
    id: `route-${Date.now()}`,
    routeNumber: mainVehicle ? mainVehicle.line_number.toString() : 'Bus',
    destination: lastTransit?.to_stop.name || lastSegment?.to_stop.name || 'Cel podróży',
    departure: formatTime(apiResponse.summary.departure_timestamp),
    arrival: formatTime(apiResponse.summary.arrival_timestamp),
    status,
    delayMinutes: hasDelay ? apiResponse.summary.total_delay_time_minutes : undefined,
    currentStop: firstTransit?.from_stop.name || firstSegment?.from_stop.name,
    nextStop: (transitSegments[1]?.from_stop.name || transitSegments[0]?.to_stop.name) || (allSegments[1]?.from_stop.name || allSegments[0]?.to_stop.name),
    vehicleUuid: mainVehicle?.uuid,
    segments,
    currentStopIndex: 0,
    routeGeometry,
  };
};

export const JourneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentJourney, setCurrentJourney] = useState<Journey | null>(null);
  const [journeyHistory, setJourneyHistory] = useState<Journey[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const addJourneyToHistory = (journey: Journey) => {
    setJourneyHistory(prev => [...prev, journey]);
  };

  const clearJourneyHistory = () => {
    setJourneyHistory([]);
  };

  const fetchRoute = async (
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    departureDate?: Date
  ): Promise<Journey | null> => {
    setIsLoadingRoute(true);
    try {
      const now = departureDate || new Date();
      const departureTimestamp = Math.floor(now.getTime() / 1000);
      
      console.log('📍 Route parameters:');
      console.log('  Start:', { lat: startLat, lon: startLon });
      console.log('  End:', { lat: endLat, lon: endLon });
      console.log('  Departure:', now.toLocaleString('pl-PL'), '(timestamp:', departureTimestamp, ')');
      
      const url = `${API_BASE_URL}/plan_route?start_lat=${startLat}&start_lon=${startLon}&end_lat=${endLat}&end_lon=${endLon}&timestamp=${departureTimestamp}`;
      
      console.log('🚀 Fetching route from:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error('❌ HTTP error! status:', response.status);
          
          // Try to get error details from response
          try {
            const errorData = await response.json();
            console.error('❌ Error details:', JSON.stringify(errorData, null, 2));
            
            if (response.status === 422) {
              // Validation error - show specific message
              const errorMessage = errorData.detail || errorData.message || 'Nieprawidłowe parametry wyszukiwania';
              throw new Error(errorMessage);
            }
          } catch (jsonError) {
            // If we can't parse error as JSON, just throw status
            console.error('❌ Could not parse error response:', jsonError);
          }
          
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('📥 Response received, parsing JSON...');
        const data: ApiRouteResponse = await response.json();
        console.log('📦 Received data:', JSON.stringify(data, null, 2));
        
        if (!data.success) {
          console.error('❌ API returned success=false:', data.message);
          throw new Error(data.message || 'Failed to fetch route');
        }
        
        console.log('✅ API success, transforming data...');
        const journey = transformApiResponseToJourney(data);
        console.log('✅ Transformed journey:', JSON.stringify(journey, null, 2));
        
        return journey;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('⏱️ Request timeout after 60 seconds');
          throw new Error('Zapytanie przekroczyło limit czasu (60s). Spróbuj ponownie.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('💥 Error in fetchRoute:', error);
      throw error;
    } finally {
      setIsLoadingRoute(false);
    }
  };

  return (
    <JourneyContext.Provider
      value={{
        currentJourney,
        setCurrentJourney,
        journeyHistory,
        addJourneyToHistory,
        clearJourneyHistory,
        fetchRoute,
        isLoadingRoute,
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
