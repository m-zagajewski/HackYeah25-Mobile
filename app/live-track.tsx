import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useJourney } from "@/contexts/JourneyContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function LiveTrackScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { currentJourney } = useJourney();

  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Get route geometry from journey context
  const routeGeometry = currentJourney?.routeGeometry || [];
  console.log('🗺️ Route geometry in live-track:', routeGeometry.length, 'points');

  // Get start and end coordinates for markers
  const startCoordinate = routeGeometry.length > 0 ? routeGeometry[0] : null;
  const endCoordinate = routeGeometry.length > 0 ? routeGeometry[routeGeometry.length - 1] : null;

  // Calculate center point of the route for better map positioning
  const routeCenter = (() => {
    if (routeGeometry.length === 0) {
      return userLocation ? {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      } : { latitude: 50.0614, longitude: 19.9372 };
    }
    
    const latitudes = routeGeometry.map(coord => coord.latitude);
    const longitudes = routeGeometry.map(coord => coord.longitude);
    
    return {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    };
  })();

  // Calculate appropriate zoom level based on route bounds
  const routeZoom = (() => {
    if (routeGeometry.length < 2) return 13;
    
    const latitudes = routeGeometry.map(coord => coord.latitude);
    const longitudes = routeGeometry.map(coord => coord.longitude);
    
    const latDiff = Math.max(...latitudes) - Math.min(...latitudes);
    const lonDiff = Math.max(...longitudes) - Math.min(...longitudes);
    const maxDiff = Math.max(latDiff, lonDiff);
    
    // Adjust zoom based on coordinate span
    if (maxDiff > 0.1) return 11;
    if (maxDiff > 0.05) return 12;
    if (maxDiff > 0.02) return 13;
    if (maxDiff > 0.01) return 14;
    return 15;
  })();

  // Create markers array
  const mapMarkers = [];
  if (userLocation) {
    mapMarkers.push({
      id: "user",
      coordinates: {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      },
      title: "Twoja Lokalizacja",
      color: "#4CAF50",
    });
  }
  if (startCoordinate) {
    mapMarkers.push({
      id: "start",
      coordinates: startCoordinate,
      title: "Start",
      color: "#2196F3",
    });
  }
  if (endCoordinate) {
    mapMarkers.push({
      id: "end",
      coordinates: endCoordinate,
      title: "Cel",
      color: "#F44336",
    });
  }

  // Calculate journey progress based on time
  const calculateJourneyProgress = (): number => {
    if (!currentJourney?.departure || !currentJourney?.arrival) return 0;
    
    const parseTime = (timeStr: string): Date => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };
    
    const now = new Date();
    const departureTime = parseTime(currentJourney.departure);
    const arrivalTime = parseTime(currentJourney.arrival);
    
    if (arrivalTime < departureTime) {
      arrivalTime.setDate(arrivalTime.getDate() + 1);
    }
    
    const totalDuration = arrivalTime.getTime() - departureTime.getTime();
    const elapsed = now.getTime() - departureTime.getTime();
    
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  // Request location permission and get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationPermission(true);
        // const location = await Location.getCurrentPositionAsync({});
        // setUserLocation(location);
        setUserLocation({
  coords: {
    latitude: 50.0614,
    longitude: 19.9372,
  },
} as Location.LocationObject);
      }
    })();
  }, []);

  return (
    <ImageBackground
      source={require("@/assets/journeytlo.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <ThemedView
        style={[styles.container, { backgroundColor: "transparent" }]}
      >
        {!currentJourney ? (
          <View style={[styles.noJourneyContainer, { backgroundColor: colors.card }]}>
            <MaterialIcons name="route" size={64} color={colors.icon} style={{ opacity: 0.5 }} />
            <ThemedText type="title" style={[styles.noJourneyTitle, { marginTop: 16 }]}>
              Brak aktywnej podróży
            </ThemedText>
            <ThemedText style={[styles.noJourneyText, { color: colors.icon, marginTop: 8 }]}>
              Wyszukaj trasę, aby rozpocząć śledzenie
            </ThemedText>
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.primary, marginTop: 24 }]}
              onPress={() => router.back()}
            >
              <MaterialIcons name="search" size={20} color="#fff" />
              <ThemedText style={[styles.searchButtonText, { color: "#fff" }]}>
                Wyszukaj Trasę
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        {/* Fullscreen Map Modal */}
        <Modal
          visible={isMapFullscreen}
          animationType="slide"
          onRequestClose={() => setIsMapFullscreen(false)}
        >
          <View style={styles.fullscreenMapContainer}>
            {userLocation &&
              (Platform.OS === "ios" ? (
                <AppleMaps.View
                  style={styles.map}
                  cameraPosition={{
                    coordinates: routeCenter,
                    zoom: routeZoom,
                  }}
                  markers={mapMarkers}
                  polylines={
                    routeGeometry.length > 0
                      ? [
                          {
                            id: "route",
                            coordinates: routeGeometry,
                            color: "#2196F3",
                            width: 5,
                          },
                        ]
                      : []
                  }
                />
              ) : (
                <GoogleMaps.View
                  style={styles.map}
                  cameraPosition={{
                    coordinates: routeCenter,
                    zoom: routeZoom,
                  }}
                  markers={mapMarkers}
                  polylines={
                    routeGeometry.length > 0
                      ? [
                          {
                            id: "route",
                            coordinates: routeGeometry,
                            color: "#2196F3",
                            width: 5,
                          },
                        ]
                      : []
                  }
                />
              ))}

            {/* Close Fullscreen Button */}
            <TouchableOpacity
              style={[
                styles.fullscreenExitButton,
                { backgroundColor: colors.card },
              ]}
              onPress={() => setIsMapFullscreen(false)}
            >
              <MaterialIcons
                name="fullscreen-exit"
                size={20}
                color={colors.text}
              />
              <ThemedText
                style={[styles.fullscreenButtonText, { color: colors.text }]}
              >
                Wyjdź z Pełnego Ekranu
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Modal>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Live Map */}
          <View style={styles.mapContainer}>
            {userLocation &&
              (Platform.OS === "ios" ? (
                <AppleMaps.View
                  style={styles.map}
                  cameraPosition={{
                    coordinates: routeCenter,
                    zoom: routeZoom,
                  }}
                  markers={mapMarkers}
                  polylines={
                    routeGeometry.length > 0
                      ? [
                          {
                            id: "route",
                            coordinates: routeGeometry, // [{ latitude, longitude }, ...]
                            color: "#2196F3",
                            width: 5,
                          },
                        ]
                      : []
                  }
                />
              ) : (
                <GoogleMaps.View
                  style={styles.map}
                  cameraPosition={{
                    coordinates: routeCenter,
                    zoom: routeZoom,
                  }}
                  markers={mapMarkers}
                  polylines={
                    routeGeometry.length > 0
                      ? [
                          {
                            id: "route",
                            coordinates: routeGeometry,
                            color: "#2196F3",
                            width: 5,
                          },
                        ]
                      : []
                  }
                />
              ))}

            {/* Fullscreen Toggle Button */}
            <TouchableOpacity
              style={[
                styles.fullscreenButton,
                { backgroundColor: colors.card },
              ]}
              onPress={() => setIsMapFullscreen(true)}
            >
              <MaterialIcons name="fullscreen" size={20} color={colors.text} />
              <ThemedText
                style={[styles.fullscreenButtonText, { color: colors.text }]}
              >
                Zobacz Pełny Ekran
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Next Stop Card */}
          <View style={[styles.nextStopCard, { backgroundColor: colors.card }]}>
            <View style={styles.nextStopHeader}>
              <MaterialIcons
                name="my-location"
                size={24}
                color={colors.primary}
              />
              <ThemedText style={styles.nextStopTitle}>
                Następny Przystanek
              </ThemedText>
            </View>
            <View style={styles.nextStopInfo}>
              <ThemedText type="defaultSemiBold" style={styles.nextStopName}>
                {currentJourney?.destination || "Brak danych"}
              </ThemedText>
              <View style={styles.nextStopTime}>
                <MaterialIcons
                  name="access-time"
                  size={16}
                  color={colors.icon}
                />
                <ThemedText style={styles.nextStopTimeText}>
                  Przyjazd o {currentJourney?.arrival || "--:--"}
                </ThemedText>
              </View>
              {currentJourney?.durationMinutes && (
                <View style={styles.nextStopTime}>
                  <MaterialIcons
                    name="schedule"
                    size={16}
                    color={colors.icon}
                  />
                  <ThemedText style={styles.nextStopTimeText}>
                    Czas podróży: {Math.round(currentJourney.durationMinutes)} min
                  </ThemedText>
                </View>
              )}
            </View>
            <View
              style={[
                styles.nextStopProgress,
                { backgroundColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.nextStopProgressFill,
                  { 
                    backgroundColor: colors.primary, 
                    width: `${calculateJourneyProgress()}%` 
                  },
                ]}
              />
            </View>
          </View>

          {/* All Stops */}
          <View style={[styles.stopsCard, { backgroundColor: colors.card }]}>
            <View style={styles.stopsHeader}>
              <ThemedText type="defaultSemiBold" style={styles.stopsTitle}>
                Szczegóły trasy
              </ThemedText>
              {currentJourney?.segments && (
                <ThemedText style={[styles.stopsCount, { color: colors.icon }]}>
                  {currentJourney.segments.length} {currentJourney.segments.length === 1 ? 'segment' : 'segmentów'}
                </ThemedText>
              )}
            </View>

            <View>
              {currentJourney?.segments && currentJourney.segments.length > 0 && (
                <View style={styles.segmentsContainer}>
                  {currentJourney.segments.map((segment, segmentIndex) => (
                    <View key={segment.segmentId} style={styles.segmentItem}>
                      {/* Segment Header */}
                      <View style={styles.segmentHeader}>
                        {segment.type === 'walking' ? (
                          <View style={styles.segmentTypeContainer}>
                            <View style={[styles.segmentIconContainer, { backgroundColor: colors.border }]}>
                              <MaterialIcons name="directions-walk" size={20} color={colors.icon} />
                            </View>
                            <View style={styles.segmentInfo}>
                              <ThemedText type="defaultSemiBold" style={styles.segmentTypeText}>
                                Spacer
                              </ThemedText>
                              {segment.walkingDistanceMeters && (
                                <ThemedText style={[styles.segmentSubtext, { color: colors.icon }]}>
                                  {(segment.walkingDistanceMeters / 1000).toFixed(1)} km
                                </ThemedText>
                              )}
                            </View>
                          </View>
                        ) : (
                          <View style={styles.segmentTypeContainer}>
                            <View style={[styles.segmentIconContainer, styles.lineBadge, { backgroundColor: colors.primary }]}>
                              <ThemedText style={styles.lineNumber}>
                                {segment.vehicleInfo?.lineNumber || 'Bus'}
                              </ThemedText>
                            </View>
                            <View style={styles.segmentInfo}>
                              <ThemedText type="defaultSemiBold" style={styles.segmentTypeText}>
                                {segment.vehicleInfo?.type === 'TRAM' ? 'Tramwaj' : 'Autobus'}
                              </ThemedText>
                              <ThemedText style={[styles.segmentSubtext, { color: colors.icon }]}>
                                {segment.vehicleInfo?.destination || 'Transport publiczny'}
                              </ThemedText>
                            </View>
                          </View>
                        )}
                        <View style={[styles.durationBadge, { backgroundColor: colors.background }]}>
                          <MaterialIcons name="schedule" size={14} color={colors.icon} />
                          <ThemedText style={styles.segmentDuration}>
                            {Math.round(segment.durationMinutes)} min
                          </ThemedText>
                        </View>
                      </View>

                      {/* Start Stop */}
                      <View style={styles.segmentStop}>
                        <View style={styles.stopIndicatorContainer}>
                          <View
                            style={[
                              styles.stopDot,
                              {
                                backgroundColor: segmentIndex === 0 ? colors.success : colors.primary,
                              },
                            ]}
                          />
                          <View style={[styles.stopLine, { backgroundColor: colors.border }]} />
                        </View>
                        <View style={styles.stopDetails}>
                          <ThemedText type="defaultSemiBold" style={styles.stopName}>
                            {segment.fromStop.name}
                          </ThemedText>
                          <View style={styles.stopTimeRow}>
                            <MaterialIcons name="schedule" size={14} color={colors.icon} />
                            <ThemedText style={[styles.stopTime, { color: colors.icon }]}>
                              Odjazd: {segment.departureTime}
                            </ThemedText>
                          </View>
                        </View>
                      </View>

                      {/* End Stop */}
                      <View style={styles.segmentStop}>
                        <View style={styles.stopIndicatorContainer}>
                          <View
                            style={[
                              styles.stopDot,
                              {
                                backgroundColor: segmentIndex === currentJourney.segments!.length - 1 
                                  ? colors.danger 
                                  : colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.stopDetails}>
                          <ThemedText type="defaultSemiBold" style={styles.stopName}>
                            {segment.toStop.name}
                          </ThemedText>
                          <View style={styles.stopTimeRow}>
                            <MaterialIcons name="schedule" size={14} color={colors.icon} />
                            <ThemedText style={[styles.stopTime, { color: colors.icon }]}>
                              Przyjazd: {segment.arrivalTime}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning }]}
              onPress={() => router.push('/report-issue')}
            >
              <MaterialIcons name="report-problem" size={24} color="#fff" />
              <ThemedText style={styles.actionButtonText}>
                Zgłoś Problem
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </>
        )}
      </ThemedView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  noJourneyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: 16,
    borderRadius: 16,
    padding: 32,
  },
  noJourneyTitle: {
    fontSize: 20,
    textAlign: "center",
  },
  noJourneyText: {
    fontSize: 14,
    textAlign: "center",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchButtonText: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#fff",
    opacity: 0.9,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  vehicleInfoOverlay: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  vehicleInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  nextStopCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  nextStopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  nextStopTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    opacity: 0.7,
  },
  nextStopInfo: {
    marginBottom: 12,
  },
  nextStopName: {
    fontSize: 20,
    marginBottom: 4,
  },
  nextStopTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nextStopTimeText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  nextStopProgress: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  nextStopProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  stopsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  stopsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  stopsTitle: {
    fontSize: 16,
  },
  stopsCount: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stopDetails: {
    flex: 1,
  },
  stopName: {
    fontSize: 15,
    marginBottom: 2,
  },
  stopTime: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
  },
  actionsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
  },
  fullscreenMapContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  fullscreenButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  fullscreenExitButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fullscreenButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  // Segments styles
  segmentsContainer: {
    gap: 8,
  },
  segmentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.15)',
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  segmentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  segmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBadge: {
    minWidth: 40,
  },
  lineNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  segmentInfo: {
    flex: 1,
  },
  segmentTypeText: {
    fontSize: 15,
  },
  segmentSubtext: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  segmentDuration: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  segmentStop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stopIndicatorContainer: {
    alignItems: 'center',
    width: 20,
  },
  stopLine: {
    width: 2,
    flex: 1,
    minHeight: 32,
  },
  stopTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
});
