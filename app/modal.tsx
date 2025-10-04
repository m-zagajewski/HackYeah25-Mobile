import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { Journey, RouteSegment, useJourney } from '@/contexts/JourneyContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
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
  };
};

// Fetch route from backend
const fetchRoute = async (startLat: number, startLon: number, endLat: number, endLon: number, departureDate?: Date): Promise<Journey | null> => {
  try {
    const now = departureDate || new Date();
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
  
  // Time picker state
  const [departureTime, setDepartureTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(new Date().getMinutes());
  
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
    console.log('⏰ Departure time:', departureTime.toLocaleString('pl-PL'));
    
    setIsLoading(true);
    setError(null);
    Keyboard.dismiss();
    
    try {
      console.log('📞 Calling fetchRoute...');
      const fetchedRoute = await fetchRoute(
        fromCoords.lat,
        fromCoords.lon,
        toCoords.lat,
        toCoords.lon,
        departureTime
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

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setDepartureTime(selectedDate);
    }
  };

  const dismissTimePicker = () => {
    setShowTimePicker(false);
  };

  const confirmTime = () => {
    const newDate = new Date(departureTime);
    newDate.setHours(selectedHour);
    newDate.setMinutes(selectedMinute);
    setDepartureTime(newDate);
    setShowTimePicker(false);
  };

  const formatDisplayTime = (date: Date): string => {
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

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

          {/* Time Picker Button */}
          <TouchableOpacity
            style={[styles.timePickerButton, { backgroundColor: colors.card }]}
            onPress={() => {
              setSelectedHour(departureTime.getHours());
              setSelectedMinute(departureTime.getMinutes());
              setShowTimePicker(true);
            }}
          >
            <MaterialIcons name="access-time" size={20} color={colors.icon} />
            <View style={styles.timePickerContent}>
              <ThemedText style={styles.timePickerLabel}>Odjazd o:</ThemedText>
              <ThemedText style={styles.timePickerValue}>{formatDisplayTime(departureTime)}</ThemedText>
            </View>
            <MaterialIcons name="edit" size={18} color={colors.icon} />
          </TouchableOpacity>

          {/* Custom Time Picker Modal */}
          <Modal
            visible={showTimePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={dismissTimePicker}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={dismissTimePicker}
            >
              <View style={[styles.timePickerModalContent, { backgroundColor: colors.card }]}>
                <View style={styles.timePickerHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.timePickerTitle}>
                    Wybierz godzinę odjazdu
                  </ThemedText>
                </View>
                
                <View style={styles.timePickerBody}>
                  <View style={styles.timePickerScrolls}>
                    {/* Hours Scroll */}
                    <ScrollView 
                      style={styles.timeScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {hours.map((hour) => (
                        <TouchableOpacity
                          key={`hour-${hour}`}
                          style={[
                            styles.timeItem,
                            selectedHour === hour && { backgroundColor: colors.primary }
                          ]}
                          onPress={() => setSelectedHour(hour)}
                        >
                          <ThemedText 
                            style={[
                              styles.timeItemText,
                              selectedHour === hour && styles.timeItemTextSelected
                            ]}
                          >
                            {hour.toString().padStart(2, '0')}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    
                    <ThemedText style={styles.timeSeparator}>:</ThemedText>
                    
                    {/* Minutes Scroll */}
                    <ScrollView 
                      style={styles.timeScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {minutes.filter(m => m % 5 === 0).map((minute) => (
                        <TouchableOpacity
                          key={`minute-${minute}`}
                          style={[
                            styles.timeItem,
                            selectedMinute === minute && { backgroundColor: colors.primary }
                          ]}
                          onPress={() => setSelectedMinute(minute)}
                        >
                          <ThemedText 
                            style={[
                              styles.timeItemText,
                              selectedMinute === minute && styles.timeItemTextSelected
                            ]}
                          >
                            {minute.toString().padStart(2, '0')}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                
                <View style={styles.timePickerFooter}>
                  <TouchableOpacity 
                    style={styles.timePickerCancelButton}
                    onPress={dismissTimePicker}
                  >
                    <ThemedText style={styles.timePickerCancelText}>Anuluj</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.timePickerConfirmButton, { backgroundColor: colors.primary }]}
                    onPress={confirmTime}
                  >
                    <ThemedText style={styles.timePickerConfirmText}>Potwierdź</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

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
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
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

              {/* Segments - Only start and end of each segment */}
              {route.segments && route.segments.length > 0 && (
                <View style={styles.segmentsSection}>
                  <ThemedText type="defaultSemiBold" style={styles.segmentsTitle}>
                    Szczegóły trasy
                  </ThemedText>
                  {route.segments.map((segment, segmentIndex) => (
                    <View key={segment.segmentId} style={styles.segmentContainer}>
                      {/* Segment Header */}
                      <View style={styles.segmentHeader}>
                        {segment.type === 'walking' ? (
                          <View style={styles.segmentTypeContainer}>
                            <MaterialIcons name="directions-walk" size={18} color={colors.icon} />
                            <ThemedText style={styles.segmentTypeText}>
                              Spacer {segment.walkingDistanceMeters ? `(${(segment.walkingDistanceMeters / 1000).toFixed(1)} km)` : ''}
                            </ThemedText>
                          </View>
                        ) : (
                          <View style={styles.segmentTypeContainer}>
                            <View style={[styles.lineBadge, { backgroundColor: colors.primary }]}>
                              <ThemedText style={styles.lineNumber}>
                                {segment.vehicleInfo?.lineNumber || 'Bus'}
                              </ThemedText>
                            </View>
                            <ThemedText style={styles.segmentTypeText}>
                              {segment.vehicleInfo?.destination || 'Transport publiczny'}
                            </ThemedText>
                          </View>
                        )}
                        <ThemedText style={styles.segmentDuration}>
                          {segment.durationMinutes} min
                        </ThemedText>
                      </View>

                      {/* Start Stop */}
                      <View style={styles.segmentStop}>
                        <View style={styles.stopIndicatorContainer}>
                          <View
                            style={[
                              styles.stopDot,
                              {
                                backgroundColor: segmentIndex === 0 ? colors.primary : colors.secondary,
                              },
                            ]}
                          />
                          <View style={[styles.stopLine, { backgroundColor: colors.border }]} />
                        </View>
                        <View style={styles.stopDetails}>
                          <ThemedText style={styles.stopName}>{segment.fromStop.name}</ThemedText>
                          <ThemedText style={styles.stopTime}>
                            Odjazd: {segment.departureTime}
                          </ThemedText>
                        </View>
                      </View>

                      {/* End Stop */}
                      <View style={styles.segmentStop}>
                        <View style={styles.stopIndicatorContainer}>
                          <View
                            style={[
                              styles.stopDot,
                              {
                                backgroundColor: segmentIndex === route.segments!.length - 1 
                                  ? colors.secondary 
                                  : colors.icon,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.stopDetails}>
                          <ThemedText style={styles.stopName}>{segment.toStop.name}</ThemedText>
                          <ThemedText style={styles.stopTime}>
                            Przyjazd: {segment.arrivalTime}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Select Button */}
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.primary }]}
              onPress={handleSelectRoute}
            >
              <MaterialIcons name="check-circle" size={24} color="#fff" />
              <ThemedText style={styles.selectButtonText}>Wybierz tę trasę</ThemedText>
            </TouchableOpacity>
          </ScrollView>
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
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  timePickerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  timePickerValue: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  timePickerModal: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  timePickerDoneButton: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  iosTimePicker: {
    height: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timePickerModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  timePickerTitle: {
    fontSize: 18,
  },
  timePickerBody: {
    padding: 20,
  },
  timePickerScrolls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timeScroll: {
    height: 200,
    width: 80,
  },
  timeItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 4,
    alignItems: 'center',
  },
  timeItemText: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
  },
  timeItemTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  timeSeparator: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    marginHorizontal: 8,
  },
  timePickerFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  timePickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  timePickerCancelText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  timePickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timePickerConfirmText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
  segmentsSection: {
    gap: 12,
    marginTop: 8,
  },
  segmentsTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  segmentContainer: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  segmentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  segmentTypeText: {
    fontSize: 13,
    opacity: 0.7,
    flex: 1,
  },
  segmentDuration: {
    fontSize: 12,
    opacity: 0.6,
    fontFamily: 'Poppins-Medium',
  },
  lineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  lineNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  segmentStop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
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
