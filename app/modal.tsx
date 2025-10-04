import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { Journey, useJourney } from '@/contexts/JourneyContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Mock data based on test case: Czerwone Maki → Tauron Arena
// Coordinates: start (50.014623, 19.888062), end (50.067366, 19.990079)
const mockRoutes: Journey[] = [
  {
    id: '1',
    routeNumber: '179',
    destination: 'Tauron Arena Kraków',
    departure: '14:30',
    arrival: '15:15',
    status: 'on-time',
    currentStop: 'Czerwone Maki P+R',
    nextStop: 'Sanktuarium Bożego Miłosierdzia',
    vehicleUuid: '7a7eb004-794d-4f68-b79c-c6ad3042f9d0',
    currentStopIndex: 0,
    stops: [
      { uuid: 'a1b2c3d4-1111-4444-8888-111111111111', name: 'Czerwone Maki P+R', departureTime: '14:30' },
      { uuid: 'b2c3d4e5-2222-4444-8888-222222222222', name: 'Sanktuarium Bożego Miłosierdzia', arrivalTime: '14:35', departureTime: '14:36' },
      { uuid: 'c3d4e5f6-3333-4444-8888-333333333333', name: 'Kombinat', arrivalTime: '14:42', departureTime: '14:43' },
      { uuid: 'd4e5f6g7-4444-4444-8888-444444444444', name: 'Rondo Czyżyńskie', arrivalTime: '14:50', departureTime: '14:51' },
      { uuid: 'e5f6g7h8-5555-4444-8888-555555555555', name: 'Nowy Bieżanów', arrivalTime: '15:00', departureTime: '15:01' },
      { uuid: 'f6g7h8i9-6666-4444-8888-666666666666', name: 'Tauron Arena Kraków', arrivalTime: '15:15' },
    ],
  },
  {
    id: '2',
    routeNumber: '304',
    destination: 'Tauron Arena (przez Prokocim)',
    departure: '14:45',
    arrival: '15:30',
    status: 'on-time',
    currentStop: 'Czerwone Maki',
    nextStop: 'Prokocim',
    vehicleUuid: '8b8fc115-805e-5g79-c80d-d7be4153ga01',
    currentStopIndex: 0,
    stops: [
      { uuid: 'g7h8i9j0-7777-5555-9999-777777777777', name: 'Czerwone Maki P+R', departureTime: '14:45' },
      { uuid: 'h8i9j0k1-8888-5555-9999-888888888888', name: 'Prokocim', arrivalTime: '14:55', departureTime: '14:56' },
      { uuid: 'i9j0k1l2-9999-5555-9999-999999999999', name: 'Kurdwanów', arrivalTime: '15:05', departureTime: '15:06' },
      { uuid: 'j0k1l2m3-aaaa-5555-9999-aaaaaaaaaaaa', name: 'Bieżanów', arrivalTime: '15:15', departureTime: '15:16' },
      { uuid: 'k1l2m3n4-bbbb-5555-9999-bbbbbbbbbbbb', name: 'Tauron Arena Kraków', arrivalTime: '15:30' },
    ],
  },
  {
    id: '3',
    routeNumber: '124',
    destination: 'Tauron Arena (szybka)',
    departure: '15:00',
    arrival: '15:35',
    status: 'delayed',
    delayMinutes: 5,
    currentStop: 'Czerwone Maki P+R',
    nextStop: 'Borek Fałęcki',
    vehicleUuid: '9c9gd226-916f-6h80-d91e-e8cf5264hb12',
    currentStopIndex: 0,
    stops: [
      { uuid: 'l2m3n4o5-cccc-6666-aaaa-cccccccccccc', name: 'Czerwone Maki P+R', departureTime: '15:00' },
      { uuid: 'm3n4o5p6-dddd-6666-aaaa-dddddddddddd', name: 'Borek Fałęcki', arrivalTime: '15:08', departureTime: '15:09' },
      { uuid: 'n4o5p6q7-eeee-6666-aaaa-eeeeeeeeeeee', name: 'Piaski Wielkie', arrivalTime: '15:18', departureTime: '15:19' },
      { uuid: 'o5p6q7r8-ffff-6666-aaaa-ffffffffffff', name: 'Mały Płaszów', arrivalTime: '15:25', departureTime: '15:26' },
      { uuid: 'p6q7r8s9-gggg-6666-aaaa-gggggggggggg', name: 'Tauron Arena Kraków', arrivalTime: '15:35' },
    ],
  },
  {
    id: '4',
    routeNumber: '208',
    destination: 'Tauron Arena (noc)',
    departure: '22:00',
    arrival: '22:50',
    status: 'on-time',
    currentStop: 'Czerwone Maki',
    nextStop: 'Św. Józefa',
    vehicleUuid: 'ad0he337-a27g-7i91-ea2f-f9dg6375ic23',
    currentStopIndex: 0,
    stops: [
      { uuid: 'q7r8s9t0-hhhh-7777-bbbb-hhhhhhhhhhhh', name: 'Czerwone Maki P+R', departureTime: '22:00' },
      { uuid: 'r8s9t0u1-iiii-7777-bbbb-iiiiiiiiiiii', name: 'Św. Józefa', arrivalTime: '22:12', departureTime: '22:13' },
      { uuid: 's9t0u1v2-jjjj-7777-bbbb-jjjjjjjjjjjj', name: 'Wola Duchacka Zachód', arrivalTime: '22:25', departureTime: '22:26' },
      { uuid: 't0u1v2w3-kkkk-7777-bbbb-kkkkkkkkkkkk', name: 'Złocień', arrivalTime: '22:38', departureTime: '22:39' },
      { uuid: 'u1v2w3x4-llll-7777-bbbb-llllllllllll', name: 'Tauron Arena Kraków', arrivalTime: '22:50' },
    ],
  },
  {
    id: '5',
    routeNumber: '173',
    destination: 'Tauron Arena (ekspres)',
    departure: '16:15',
    arrival: '16:45',
    status: 'on-time',
    currentStop: 'Czerwone Maki P+R',
    nextStop: 'Kobierzyńska',
    vehicleUuid: 'be1if448-b38h-8j02-fb3g-g0eh7486jd34',
    currentStopIndex: 0,
    stops: [
      { uuid: 'v2w3x4y5-mmmm-8888-cccc-mmmmmmmmmmmm', name: 'Czerwone Maki P+R', departureTime: '16:15' },
      { uuid: 'w3x4y5z6-nnnn-8888-cccc-nnnnnnnnnnnn', name: 'Kobierzyńska', arrivalTime: '16:22', departureTime: '16:23' },
      { uuid: 'x4y5z6a7-oooo-8888-cccc-oooooooooooo', name: 'Rondo Grunwaldzkie', arrivalTime: '16:32', departureTime: '16:33' },
      { uuid: 'y5z6a7b8-pppp-8888-cccc-pppppppppppp', name: 'Tauron Arena Kraków', arrivalTime: '16:45' },
    ],
  },
];

export default function RouteSelectionModal() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { setCurrentJourney, addJourneyToHistory } = useJourney();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRoutes, setFilteredRoutes] = useState<Journey[]>(mockRoutes);
  const [isSearching, setIsSearching] = useState(false);

  // Filter routes based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRoutes(mockRoutes);
      setIsSearching(false);
    } else {
      setIsSearching(true);
      const timer = setTimeout(() => {
        const filtered = mockRoutes.filter(
          (route) =>
            route.routeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            route.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
            route.currentStop?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            route.nextStop?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredRoutes(filtered);
        setIsSearching(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const handleSelectRoute = (journey: Journey) => {
    // Add to context
    setCurrentJourney(journey);
    addJourneyToHistory(journey);
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
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

  const renderRouteItem = ({ item }: { item: Journey }) => (
    <TouchableOpacity
      style={[styles.routeItem, { backgroundColor: colors.card }]}
      onPress={() => handleSelectRoute(item)}
      activeOpacity={0.7}
    >
      <View style={styles.routeItemHeader}>
        <View style={[styles.routeBadge, { backgroundColor: colors.primary }]}>
          <ThemedText style={styles.routeNumber}>{item.routeNumber}</ThemedText>
        </View>
        <View style={styles.routeInfo}>
          <ThemedText type="defaultSemiBold" style={styles.destination}>
            {item.destination}
          </ThemedText>
          <View style={styles.stopsInfo}>
            <MaterialIcons name="my-location" size={14} color={colors.icon} />
            <ThemedText style={styles.stopText} numberOfLines={1}>
              {item.currentStop}
            </ThemedText>
            <MaterialIcons name="arrow-forward" size={14} color={colors.icon} />
            <ThemedText style={styles.stopText} numberOfLines={1}>
              {item.nextStop}
            </ThemedText>
          </View>
        </View>
      </View>
      
      <View style={styles.routeItemFooter}>
        <View style={styles.timeInfo}>
          <MaterialIcons name="schedule" size={16} color={colors.icon} />
          <ThemedText style={styles.timeText}>
            {item.departure} - {item.arrival}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <ThemedText style={styles.statusText}>
            {getStatusText(item)}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitle}>
            Wybierz Trasę
          </ThemedText>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <MaterialIcons name="search" size={24} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Szukaj trasy, numeru, przystanku..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="cancel" size={20} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={styles.loadingText}>Wyszukiwanie...</ThemedText>
          </View>
        ) : filteredRoutes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={64} color={colors.icon} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Brak wyników
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              Nie znaleziono tras pasujących do "{searchQuery}"
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredRoutes}
            renderItem={renderRouteItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
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
});
