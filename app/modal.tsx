import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { Journey, useJourney } from '@/contexts/JourneyContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

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
}

const API_BASE_URL = 'http://192.168.2.2:8000/api/v1';

// Test case coordinates: Czerwone Maki → Tauron Arena
const TEST_START_LAT = 50.014623;
const TEST_START_LON = 19.888062;
const TEST_END_LAT = 50.067366;
const TEST_END_LON = 19.990079;

// Popular locations in Kraków with coordinates
interface LocationSuggestion {
  name: string;
  lat: number;
  lon: number;
}

const KRAKOW_LOCATIONS: LocationSuggestion[] = [
  { name: 'Czerwone Maki P+R', lat: 50.014623, lon: 19.888062 },
  { name: 'Tauron Arena Kraków', lat: 50.067366, lon: 19.990079 },
  { name: 'Dworzec Główny', lat: 50.066, lon: 19.947 },
  { name: 'Rynek Główny', lat: 50.061, lon: 19.937 },
  { name: 'Salwator', lat: 50.054, lon: 19.915 },
  { name: 'Mistrzejowice', lat: 50.098, lon: 20.000 },
  { name: 'Wzgórza Krzesławickie', lat: 50.093, lon: 20.069 },
  { name: 'Prokocim', lat: 50.017, lon: 20.007 },
  { name: 'Nowa Huta', lat: 50.071, lon: 20.033 },
  { name: 'Kurdwanów', lat: 50.006, lon: 19.973 },
  { name: 'Bronowice', lat: 50.084, lon: 19.895 },
  { name: 'Krowodrza', lat: 50.083, lon: 19.925 },
  { name: 'Kazimierz', lat: 50.051, lon: 19.946 },
  { name: 'Podgórze', lat: 50.039, lon: 19.949 },
  { name: 'Lagiewniki', lat: 50.029, lon: 19.936 },
  { name: 'Borek Fałęcki', lat: 50.022, lon: 19.895 },
  { name: 'Ruczaj', lat: 50.027, lon: 19.906 },
  { name: 'Wola Duchacka', lat: 50.007, lon: 19.925 },
];

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
  
  if (isWalkingOnly) {
    // Walking-only route
    console.log('🚶 This is a walking-only route');
    
    // Build stops: from_stop of each segment + to_stop of last segment
    const stops: Array<{uuid: string; name: string; departureTime?: string; arrivalTime?: string}> = [];
    
    allSegments.forEach((seg, index) => {
      stops.push({
        uuid: seg.from_stop.uuid,
        name: seg.from_stop.name,
        departureTime: formatTime(seg.departure_timestamp),
        arrivalTime: undefined,
      });
    });
    
    // Add final destination (to_stop of last segment)
    if (lastSegment) {
      stops.push({
        uuid: lastSegment.to_stop.uuid,
        name: lastSegment.to_stop.name,
        departureTime: undefined,
        arrivalTime: formatTime(lastSegment.arrival_timestamp),
      });
    }
    
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
      stops,
      currentStopIndex: 0,
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
  
  // Build stops: from_stop of each segment + to_stop of last segment
  const stops: Array<{uuid: string; name: string; departureTime?: string; arrivalTime?: string}> = [];
  
  allSegments.forEach((seg, index) => {
    stops.push({
      uuid: seg.from_stop.uuid,
      name: seg.from_stop.name,
      departureTime: formatTime(seg.departure_timestamp),
      arrivalTime: undefined,
    });
  });
  
  // Add final destination (to_stop of last segment)
  if (lastSegment) {
    stops.push({
      uuid: lastSegment.to_stop.uuid,
      name: lastSegment.to_stop.name,
      departureTime: undefined,
      arrivalTime: formatTime(lastSegment.arrival_timestamp),
    });
  }
  
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
    stops,
    currentStopIndex: 0,
  };
};

// Fetch route from backend
const fetchRoute = async (startLat: number, startLon: number, endLat: number, endLon: number): Promise<Journey | null> => {
  try {
    const now = new Date();
    const departureTimestamp = Math.floor(now.getTime() / 1000); // Unix timestamp in seconds
    
    const url = `${API_BASE_URL}/plan_route?start_lat=${startLat}&start_lon=${startLon}&end_lat=${endLat}&end_lon=${endLon}&departure_timestamp=${departureTimestamp}`;
    
    console.log('🚀 Fetching route from:', url);
    console.log('⏱️ Departure timestamp:', departureTimestamp, '(', now.toLocaleString('pl-PL'), ')');
    console.log('⏱️ Timeout set to 60 seconds...');
    
    // Create AbortController with 60 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds
    
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
  }
};

export default function RouteSelectionModal() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { setCurrentJourney, addJourneyToHistory } = useJourney();

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [route, setRoute] = useState<Journey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Suggestions state
  const [fromSuggestions, setFromSuggestions] = useState<LocationSuggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<LocationSuggestion[]>([]);
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);
  
  // Selected coordinates
  const [fromCoords, setFromCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [toCoords, setToCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Filter suggestions based on input
  const filterSuggestions = (query: string): LocationSuggestion[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return KRAKOW_LOCATIONS.filter(loc => 
      loc.name.toLowerCase().includes(lowerQuery)
    ).slice(0, 5); // Limit to 5 suggestions
  };

  // Handle from location change
  const handleFromLocationChange = (text: string) => {
    setFromLocation(text);
    setFromCoords(null); // Clear coordinates when text changes
    if (text.trim()) {
      setFromSuggestions(filterSuggestions(text));
      setActiveField('from');
    } else {
      setFromSuggestions([]);
      setActiveField(null);
    }
  };

  // Handle to location change
  const handleToLocationChange = (text: string) => {
    setToLocation(text);
    setToCoords(null); // Clear coordinates when text changes
    if (text.trim()) {
      setToSuggestions(filterSuggestions(text));
      setActiveField('to');
    } else {
      setToSuggestions([]);
      setActiveField(null);
    }
  };

  // Select from suggestion
  const selectFromSuggestion = (suggestion: LocationSuggestion) => {
    setFromLocation(suggestion.name);
    setFromCoords({ lat: suggestion.lat, lon: suggestion.lon });
    setFromSuggestions([]);
    setActiveField(null);
  };

  // Select to suggestion
  const selectToSuggestion = (suggestion: LocationSuggestion) => {
    setToLocation(suggestion.name);
    setToCoords({ lat: suggestion.lat, lon: suggestion.lon });
    setToSuggestions([]);
    setActiveField(null);
  };

  const handleSearch = async () => {
    if (!fromLocation.trim() || !toLocation.trim()) {
      Alert.alert('Błąd', 'Proszę podać lokalizację startową i docelową');
      return;
    }

    if (!fromCoords || !toCoords) {
      Alert.alert('Błąd', 'Proszę wybrać lokalizacje z podpowiedzi');
      return;
    }

    console.log('🔍 Starting search...');
    console.log('📍 From:', fromLocation, fromCoords);
    console.log('📍 To:', toLocation, toCoords);
    
    setIsLoading(true);
    setError(null);
    Keyboard.dismiss();
    
    try {
      console.log('📞 Calling fetchRoute...');
      const fetchedRoute = await fetchRoute(
        fromCoords.lat,
        fromCoords.lon,
        toCoords.lat,
        toCoords.lon
      );
      console.log('📥 Fetched route result:', fetchedRoute);
      
      if (fetchedRoute) {
        console.log('✅ Setting route state with:', fetchedRoute);
        setRoute(fetchedRoute);
      } else {
        console.log('⚠️ fetchedRoute is null or undefined');
      }
    } catch (err) {
      console.error('❌ Error in handleSearch:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nie udało się pobrać trasy';
      setError(errorMessage);
      Alert.alert('Błąd', errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🏁 Search complete, isLoading set to false');
    }
  };

  const handleSelectRoute = () => {
    if (!route) return;
    
    // Add to context
    setCurrentJourney(route);
    addJourneyToHistory(route);
    
    // Navigate back to index (home screen)
    router.back();
  };

  const getStatusColor = (status: Journey['status']) => {
    switch (status) {
      case 'on-time':
        return colors.success;
      case 'delayed':
        return colors.warning;
      case 'cancelled':
        return colors.danger;
      default:
        return colors.text;
    }
  };

  const getStatusText = (journey: Journey) => {
    switch (journey.status) {
      case 'on-time':
        return 'Na Czas';
      case 'delayed':
        return `Opóźnienie ${journey.delayMinutes} min`;
      case 'cancelled':
        return 'Odwołany';
      default:
        return '';
    }
  };

  return (
    <ThemedView style={styles.container}>

      {/* Search Form - Only show if no route yet */}
      {!route && !isLoading && (
        <View style={styles.searchForm}>
          <View style={[styles.searchSection, { backgroundColor: colors.card }]}>
            <View style={styles.searchInputWrapper}>
              {/* Connection Line on Left */}
              <View style={styles.connectionLine}>
                <MaterialIcons
                  name="my-location"
                  size={20}
                  color={colors.primary}
                />
                <View
                  style={[
                    styles.verticalLine,
                    { backgroundColor: colors.border },
                  ]}
                />
                <MaterialIcons
                  name="place"
                  size={20}
                  color={colors.secondary}
                />
              </View>

              {/* Input Fields Stacked */}
              <View style={styles.inputsContainer}>
                <View style={styles.stackedInput}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Skąd..."
                    placeholderTextColor={colors.icon}
                    value={fromLocation}
                    onChangeText={handleFromLocationChange}
                    autoFocus
                  />
                </View>

                <View style={styles.stackedInput}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Dokąd..."
                    placeholderTextColor={colors.icon}
                    value={toLocation}
                    onChangeText={handleToLocationChange}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Suggestions dropdown */}
          {activeField === 'from' && fromSuggestions.length > 0 && (
            <View style={[styles.suggestionsContainer, { backgroundColor: colors.card }]}>
              {fromSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                  onPress={() => selectFromSuggestion(suggestion)}
                >
                  <MaterialIcons name="place" size={20} color={colors.icon} />
                  <ThemedText style={styles.suggestionText}>{suggestion.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeField === 'to' && toSuggestions.length > 0 && (
            <View style={[styles.suggestionsContainer, { backgroundColor: colors.card }]}>
              {toSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                  onPress={() => selectToSuggestion(suggestion)}
                >
                  <MaterialIcons name="place" size={20} color={colors.icon} />
                  <ThemedText style={styles.suggestionText}>{suggestion.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Search Button */}
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={handleSearch}
          >
            <MaterialIcons name="search" size={24} color="#fff" />
            <ThemedText style={styles.searchButtonText}>Wyszukaj Trasę</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Route Details */}
      <View style={styles.resultsContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={styles.loadingText}>Wyszukiwanie trasy...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="error-outline" size={64} color={colors.danger} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Błąd
            </ThemedText>
            <ThemedText style={styles.emptyText}>{error}</ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={handleSearch}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <ThemedText style={styles.retryButtonText}>Spróbuj ponownie</ThemedText>
            </TouchableOpacity>
          </View>
        ) : route ? (
          <View style={styles.routeDetailsContainer}>
            <View style={[styles.routeCard, { backgroundColor: colors.card }]}>
              {/* Route Header */}
              <View style={styles.routeItemHeader}>
                <View style={[styles.routeBadge, { backgroundColor: colors.primary }]}>
                  <ThemedText style={styles.routeNumber}>{route.routeNumber}</ThemedText>
                </View>
                <View style={styles.routeInfo}>
                  <ThemedText type="defaultSemiBold" style={styles.destination}>
                    {route.destination}
                  </ThemedText>
                  <View style={styles.stopsInfo}>
                    <MaterialIcons name="my-location" size={14} color={colors.icon} />
                    <ThemedText style={styles.stopText} numberOfLines={1}>
                      {route.currentStop}
                    </ThemedText>
                    <MaterialIcons name="arrow-forward" size={14} color={colors.icon} />
                    <ThemedText style={styles.stopText} numberOfLines={1}>
                      {route.nextStop}
                    </ThemedText>
                  </View>
                </View>
              </View>
              
              {/* Route Footer */}
              <View style={styles.routeItemFooter}>
                <View style={styles.timeInfo}>
                  <MaterialIcons name="schedule" size={16} color={colors.icon} />
                  <ThemedText style={styles.timeText}>
                    {route.departure} - {route.arrival}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(route.status) },
                  ]}
                >
                  <ThemedText style={styles.statusText}>
                    {getStatusText(route)}
                  </ThemedText>
                </View>
              </View>

              {/* All Stops */}
              <View style={styles.allStopsSection}>
                <ThemedText type="defaultSemiBold" style={styles.stopsTitle}>
                  Wszystkie przystanki
                </ThemedText>
                {route.stops?.map((stop, index) => (
                  <View key={stop.uuid} style={styles.stopItem}>
                    <View style={styles.stopIndicatorContainer}>
                      <View
                        style={[
                          styles.stopDot,
                          {
                            backgroundColor:
                              index === 0
                                ? colors.primary
                                : index === route.stops!.length - 1
                                ? colors.secondary
                                : colors.border,
                          },
                        ]}
                      />
                      {index < route.stops!.length - 1 && (
                        <View style={[styles.stopLine, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                    <View style={styles.stopDetails}>
                      <ThemedText style={styles.stopName}>{stop.name}</ThemedText>
                      <ThemedText style={styles.stopTime}>
                        {stop.departureTime || stop.arrivalTime}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Select Button */}
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.primary }]}
              onPress={handleSelectRoute}
            >
              <MaterialIcons name="check-circle" size={24} color="#fff" />
              <ThemedText style={styles.selectButtonText}>Wybierz tę trasę</ThemedText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  searchForm: {
    padding: 16,
  },
  searchSection: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  suggestionsContainer: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    gap: 12,
  },
  connectionLine: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  inputsContainer: {
    flex: 1,
    gap: 8,
  },
  stackedInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  resultsContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  routeItem: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  routeItemHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  routeBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  routeInfo: {
    flex: 1,
    gap: 4,
  },
  destination: {
    fontSize: 16,
  },
  stopsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopText: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
  },
  routeItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    marginTop: 16,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  routeDetailsContainer: {
    flex: 1,
    padding: 16,
  },
  routeCard: {
    padding: 16,
    borderRadius: 12,
    gap: 16,
    marginBottom: 16,
  },
  allStopsSection: {
    gap: 8,
    marginTop: 8,
  },
  stopsTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  stopItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stopIndicatorContainer: {
    alignItems: 'center',
    width: 20,
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stopLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
  },
  stopDetails: {
    flex: 1,
    paddingVertical: 2,
  },
  stopName: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  stopTime: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});
