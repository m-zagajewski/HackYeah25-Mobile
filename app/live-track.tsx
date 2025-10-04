import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface Stop {
  id: string;
  name: string;
  time: string;
  status: "completed" | "current" | "upcoming";
  delay?: number;
}

interface VehiclePosition {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
}

export default function LiveTrackScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();

  const [currentStop, setCurrentStop] = useState(2);
  const [progress] = useState(new Animated.Value(0));
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [vehiclePosition, setVehiclePosition] = useState<VehiclePosition>({
    latitude: 52.2297,
    longitude: 21.0122,
    speed: 45,
    heading: 90,
  });

  // Mock journey data
  const journey = {
    routeNumber: "42",
    destination: "Central Station",
    vehicle: "Tram 4201",
    occupancy: 68, // percentage
    nextStop: "City Hall",
    arrival: "15:15",
    delay: 0,
  };

  const stops: Stop[] = [
    {
      id: "1",
      name: "Station Plaza",
      time: "14:30",
      status: "completed",
    },
    {
      id: "2",
      name: "Market Square",
      time: "14:38",
      status: "completed",
    },
    {
      id: "3",
      name: "City Hall",
      time: "14:45",
      status: "current",
    },
    {
      id: "4",
      name: "University Campus",
      time: "14:52",
      status: "upcoming",
    },
    {
      id: "5",
      name: "Shopping District",
      time: "14:58",
      status: "upcoming",
    },
    {
      id: "6",
      name: "Park Avenue",
      time: "15:05",
      status: "upcoming",
    },
    {
      id: "7",
      name: "Central Station",
      time: "15:15",
      status: "upcoming",
    },
  ];

  // Request location permission and get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      }
    })();
  }, []);

  // Simulate vehicle movement
  useEffect(() => {
    const interval = setInterval(() => {
      setVehiclePosition((prev) => ({
        ...prev,
        latitude: prev.latitude + (Math.random() - 0.5) * 0.001,
        longitude: prev.longitude + (Math.random() - 0.5) * 0.001,
        speed: 40 + Math.random() * 20,
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progress, {
      toValue: (currentStop / stops.length) * 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [currentStop]);

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
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>Live Tracking Kurwa</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Route {journey.routeNumber} • {journey.vehicle}
          </ThemedText>
        </View>
        <TouchableOpacity style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Live Map */}
        <View style={styles.mapContainer}>
          {Platform.OS === "ios" ? (
            <AppleMaps.View
              style={styles.map}
              cameraPosition={{
                coordinates: {
                  latitude: vehiclePosition.latitude,
                  longitude: vehiclePosition.longitude,
                },
                zoom: 14,
              }}
              markers={[
                {
                  id: "vehicle",
                  coordinates: {
                    latitude: vehiclePosition.latitude,
                    longitude: vehiclePosition.longitude,
                  },
                  title: journey.vehicle,
                },
                ...(userLocation
                  ? [
                      {
                        id: "user",
                        coordinates: {
                          latitude: userLocation.coords.latitude,
                          longitude: userLocation.coords.longitude,
                        },
                        title: "Your Location",
                      },
                    ]
                  : []),
              ]}
            />
          ) : (
            <GoogleMaps.View
              style={styles.map}
              cameraPosition={{
                coordinates: {
                  latitude: vehiclePosition.latitude,
                  longitude: vehiclePosition.longitude,
                },
                zoom: 14,
              }}
              markers={[
                {
                  id: "vehicle",
                  coordinates: {
                    latitude: vehiclePosition.latitude,
                    longitude: vehiclePosition.longitude,
                  },
                  title: journey.vehicle,
                  snippet: `Speed: ${Math.round(vehiclePosition.speed)} km/h`,
                },
                ...(userLocation
                  ? [
                      {
                        id: "user",
                        coordinates: {
                          latitude: userLocation.coords.latitude,
                          longitude: userLocation.coords.longitude,
                        },
                        title: "Your Location",
                      },
                    ]
                  : []),
              ]}
            />
          )}

          {/* Vehicle Info Overlay */}
          <View
            style={[
              styles.vehicleInfoOverlay,
              { backgroundColor: colors.card },
            ]}
          >
            <View style={styles.vehicleInfoRow}>
              <View style={styles.infoItem}>
                <MaterialIcons
                  name="speed"
                  size={20}
                  color={colors.secondary}
                />
                <View style={styles.infoText}>
                  <ThemedText style={styles.infoLabel}>Speed</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {Math.round(vehiclePosition.speed)} km/h
                  </ThemedText>
                </View>
              </View>

              <View style={styles.infoItem}>
                <MaterialIcons
                  name="people"
                  size={20}
                  color={colors.warning}
                />
                <View style={styles.infoText}>
                  <ThemedText style={styles.infoLabel}>Occupancy</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {journey.occupancy}%
                  </ThemedText>
                </View>
              </View>

              <View style={styles.infoItem}>
                <MaterialIcons
                  name="schedule"
                  size={20}
                  color={
                    journey.delay > 0 ? colors.danger : colors.success
                  }
                />
                <View style={styles.infoText}>
                  <ThemedText style={styles.infoLabel}>Status</ThemedText>
                  <ThemedText
                    style={[
                      styles.infoValue,
                      {
                        color:
                          journey.delay > 0 ? colors.danger : colors.success,
                      },
                    ]}
                  >
                    {journey.delay === 0 ? "On Time" : `+${journey.delay}m`}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Next Stop Card */}
        <View style={[styles.nextStopCard, { backgroundColor: colors.card }]}>
          <View style={styles.nextStopHeader}>
            <MaterialIcons
              name="my-location"
              size={24}
              color={colors.primary}
            />
            <ThemedText style={styles.nextStopTitle}>Next Stop</ThemedText>
          </View>
          <View style={styles.nextStopInfo}>
            <ThemedText type="defaultSemiBold" style={styles.nextStopName}>
              {journey.nextStop}
            </ThemedText>
            <View style={styles.nextStopTime}>
              <MaterialIcons name="access-time" size={16} color={colors.icon} />
              <ThemedText style={styles.nextStopTimeText}>
                Arriving at {journey.arrival}
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
                { backgroundColor: colors.primary, width: "65%" },
              ]}
            />
          </View>
        </View>

        {/* All Stops */}
        <View style={[styles.stopsCard, { backgroundColor: colors.card }]}>
          <View style={styles.stopsHeader}>
            <ThemedText type="defaultSemiBold" style={styles.stopsTitle}>
              All Stops
            </ThemedText>
            <ThemedText style={[styles.stopsCount, { color: colors.icon }]}>
              {currentStop + 1} of {stops.length}
            </ThemedText>
          </View>

          <View style={styles.stopsList}>
            {stops.map((stop, index) => (
              <View key={stop.id} style={styles.stopItem}>
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
                <View style={styles.stopContent}>
                  <View
                    style={[
                      styles.stopIconContainer,
                      { backgroundColor: getStopColor(stop.status) },
                    ]}
                  >
                    {stop.status === "completed" ? (
                      <MaterialIcons name="check" size={16} color="#fff" />
                    ) : stop.status === "current" ? (
                      <MaterialIcons name="my-location" size={16} color="#fff" />
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
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.secondary },
            ]}
          >
            <MaterialIcons name="notifications" size={24} color="#fff" />
            <ThemedText style={styles.actionButtonText}>
              Notify on Arrival
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.warning }]}
          >
            <MaterialIcons name="report-problem" size={24} color="#fff" />
            <ThemedText style={styles.actionButtonText}>
              Report Issue
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
          >
            <MaterialIcons name="share" size={24} color="#fff" />
            <ThemedText style={styles.actionButtonText}>
              Share Journey
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: 0,
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
});
