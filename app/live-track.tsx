import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useJourney } from "@/contexts/JourneyContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
const route = [
  { latitude: 50.0614, longitude: 19.9372 }, // Rynek Główny
  { latitude: 50.0620, longitude: 19.9390 }, // w stronę ulicy Floriańskiej
  { latitude: 50.0630, longitude: 19.9405 }, // przy Kościele Mariackim
  { latitude: 50.0640, longitude: 19.9420 }, // w stronę Bramy Floriańskiej
];
const { width, height } = Dimensions.get("window");

interface Stop {
  id: string;
  name: string;
  time: string;
  status: "completed" | "current" | "upcoming";
  delay?: number;
}

export default function LiveTrackScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { currentJourney } = useJourney();
  const stopRefs = useRef<{ [key: string]: View | null }>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const [progress] = useState(new Animated.Value(0));
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [visibleStopIndex, setVisibleStopIndex] = useState(0);

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

  // Generate stops from journey segments
  const stops: Stop[] = (() => {
    if (!currentJourney?.segments || currentJourney.segments.length === 0) return [];
    
    const now = new Date();
    const parseTime = (timeStr: string): Date => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };
    
    const getStopStatus = (time: string): Stop['status'] => {
      if (!time) return 'upcoming';
      const stopTime = parseTime(time);
      const diffMinutes = (stopTime.getTime() - now.getTime()) / (1000 * 60);
      
      console.log(`🕐 Stop time: ${time}, diff: ${diffMinutes.toFixed(1)} min`);
      
      if (diffMinutes < -2) return 'completed';
      if (diffMinutes < 5) return 'current';
      return 'upcoming';
    };
    
    const allStops: Stop[] = [];
    
    // Add start stop of each segment
    currentJourney.segments.forEach((segment, index) => {
      allStops.push({
        id: `${segment.segmentId}-start`,
        name: segment.fromStop.name,
        time: segment.departureTime || "",
        status: getStopStatus(segment.departureTime),
      });
    });
    
    // Add the final destination (end of last segment)
    const lastSegment = currentJourney.segments[currentJourney.segments.length - 1];
    allStops.push({
      id: `${lastSegment.segmentId}-end`,
      name: lastSegment.toStop.name,
      time: lastSegment.arrivalTime || "",
      status: getStopStatus(lastSegment.arrivalTime),
    });
    
    return allStops;
  })();

  // Find current stop index
  const currentStopIndex = stops.findIndex(stop => stop.status === 'current');
  const activeStopIndex = currentStopIndex >= 0 ? currentStopIndex : Math.max(0, stops.findIndex(stop => stop.status === 'upcoming') - 1);

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

  // Animate progress bar
  useEffect(() => {
    if (stops.length === 0) return;
    Animated.timing(progress, {
      toValue: ((activeStopIndex + 1) / stops.length) * 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [activeStopIndex, stops.length]);

  // Auto-scroll to current stop when it changes
  useEffect(() => {
    if (activeStopIndex >= 0 && stops.length > 0) {
      const stopId = stops[activeStopIndex]?.id;
      const stopView = stopRefs.current[stopId];
      if (stopView && scrollViewRef.current) {
        stopView.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 50, animated: true });
          },
          () => {}
        );
      }
    }
  }, [activeStopIndex, stops]);

  const getStopIcon = (status: Stop["status"]) => {
    switch (status) {
      case "completed":
        return "checkmark.circle.fill";
      case "current":
        return "location.circle.fill";
      default:
        return "circle";
    }
  };

  const getStopColor = (status: Stop["status"]) => {
    switch (status) {
      case "completed":
        return colors.success;
      case "current":
        return colors.primary;
      default:
        return colors.border;
    }
  };

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
                    coordinates: {
                      latitude: userLocation.coords.latitude,
                      longitude: userLocation.coords.longitude,
                    },
                    zoom: 14,
                  }}
                  markers={[
                    {
                      id: "user",
                      coordinates: {
                        latitude: userLocation.coords.latitude,
                        longitude: userLocation.coords.longitude,
                      },
                      title: "Twoja Lokalizacja",
                    },
                  ]}
                />
              ) : (
                <GoogleMaps.View
                  style={styles.map}
                  cameraPosition={{
                    coordinates: {
                      latitude: userLocation.coords.latitude,
                      longitude: userLocation.coords.longitude,
                    },
                    zoom: 14,
                  }}
                  markers={[
                    {
                      id: "user",
                      coordinates: {
                        latitude: userLocation.coords.latitude,
                        longitude: userLocation.coords.longitude,
                      },
                      title: "Twoja Lokalizacja",
                    },
                  ]}
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
                    coordinates: {
                      latitude: userLocation.coords.latitude,
                      longitude: userLocation.coords.longitude,
                    },
                    zoom: 14,
                  }}
                  markers={[
                    {
                      id: "user",
                      coordinates: {
                        latitude: userLocation.coords.latitude,
                        longitude: userLocation.coords.longitude,
                      },
                      title: "Your Location",
                    },
                  ]}
                  polylines={
                    route.length > 0
                      ? [
                          {
                            id: "route",
                            coordinates: route, // [{ latitude, longitude }, ...]
                            color: "blue",
                            width: 4,
                          },
                        ]
                      : []
                  }
                />
              ) : (
                <GoogleMaps.View
                  style={styles.map}
                  cameraPosition={{
                    coordinates: {
                      latitude: userLocation.coords.latitude,
                      longitude: userLocation.coords.longitude,
                    },
                    zoom: 14,
                  }}
                  markers={[
                    {
                      id: "user",
                      coordinates: {
                        latitude: userLocation.coords.latitude,
                        longitude: userLocation.coords.longitude,
                      },
                      title: "Your Location",
                    },
                  ]}
                  polylines={
                    route.length > 0
                      ? [
                          {
                            id: "route",
                            coordinates: route,
                            color: "blue",
                            width: 4,
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
                Wszystkie Przystanki
              </ThemedText>
              <ThemedText style={[styles.stopsCount, { color: colors.icon }]}>
                {visibleStopIndex + 1} z {stops.length}
              </ThemedText>
            </View>

            <ScrollView 
              ref={scrollViewRef}
              style={styles.stopsList}
              showsVerticalScrollIndicator={false}
              onScroll={(event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                // Calculate which stop is approximately visible
                const approximateIndex = Math.floor(offsetY / 70); // assuming ~70px per stop
                if (approximateIndex >= 0 && approximateIndex < stops.length) {
                  setVisibleStopIndex(approximateIndex);
                }
              }}
              scrollEventThrottle={16}
            >
              {stops.map((stop, index) => (
                <View 
                  key={stop.id} 
                  style={[
                    styles.stopItem,
                    stop.status === "current" && {
                      borderLeftWidth: 3,
                      borderLeftColor: colors.primary,
                      paddingLeft: 5,
                    }
                  ]}
                  ref={(ref) => {
                    stopRefs.current[stop.id] = ref;
                  }}
                  collapsable={false}
                >
                  {/* Connection Line */}
                  {index > 0 && (
                    <View
                      style={[
                        styles.connectionLine,
                        {
                          backgroundColor:
                            stop.status === "upcoming"
                              ? colors.border
                              : colors.primary,
                        },
                      ]}
                    />
                  )}

                  {/* Stop Content */}
                  <View 
                    style={[
                      styles.stopContent,
                      stop.status === "current" && {
                        backgroundColor: colors.primary + '15', // 15 = ~8% opacity
                        marginHorizontal: -8,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                      }
                    ]}
                  >
                    <View
                      style={[
                        styles.stopIconContainer,
                        { backgroundColor: getStopColor(stop.status) },
                        stop.status === "current" && {
                          transform: [{ scale: 1.2 }],
                        }
                      ]}
                    >
                      {stop.status === "completed" ? (
                        <MaterialIcons name="check" size={16} color="#fff" />
                      ) : stop.status === "current" ? (
                        <MaterialIcons
                          name="my-location"
                          size={16}
                          color="#fff"
                        />
                      ) : (
                        <View
                          style={[
                            styles.stopDot,
                            { backgroundColor: colors.background },
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.stopDetails}>
                      <ThemedText
                        type={
                          stop.status === "current"
                            ? "defaultSemiBold"
                            : "default"
                        }
                        style={[
                          styles.stopName,
                          stop.status === "upcoming" && { opacity: 0.6 },
                        ]}
                      >
                        {stop.name}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.stopTime,
                          { color: colors.icon },
                          stop.status === "upcoming" && { opacity: 0.6 },
                        ]}
                      >
                        {stop.time}
                        {stop.delay && stop.delay > 0 && (
                          <ThemedText style={{ color: colors.danger }}>
                            {" "}
                            (+{stop.delay}m)
                          </ThemedText>
                        )}
                      </ThemedText>
                    </View>

                    {stop.status === "current" && (
                      <View
                        style={[
                          styles.currentBadge,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <ThemedText style={styles.currentBadgeText}>
                          Current
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning }]}
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
  stopsList: {
    maxHeight: 300,
  },
  stopItem: {
    position: "relative",
  },
  connectionLine: {
    position: "absolute",
    left: 11,
    top: -12,
    width: 2,
    height: 24,
  },
  stopContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  stopIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
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
});
