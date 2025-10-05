import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

// ===== TYPY =====
interface RecurringRoute {
  id: string;
  name: string;
  from_location_name: string;
  to_location_name: string;
  departure_time: string;
  frequency: string;
  is_active: boolean;
  average_duration_minutes: number;
}

interface RecurringRouteDetail {
  id: string;
  name: string;
  description: string | null;
  from_location_name: string;
  from_coordinates: { latitude: number; longitude: number };
  to_location_name: string;
  to_coordinates: { latitude: number; longitude: number };
  departure_time: string;
  frequency: string;
  is_active: boolean;
  average_duration_minutes: number;
  average_walking_time_minutes: number;
  average_walking_distance_meters: number;
  typical_transfers: number;
  statistics: {
    total_trips: number;
    on_time_percentage: number;
    average_delay_minutes: number;
    most_common_delay_reason: string | null;
  };
  best_departure_time: string;
  alternative_times: string[];
  tips: string[];
}

interface RouteSegment {
  segment_id: number;
  type: "walking" | "transit";
  from_stop: {
    uuid: string;
    name: string;
    coordinates: { latitude: number; longitude: number };
  };
  to_stop: {
    uuid: string;
    name: string;
    coordinates: { latitude: number; longitude: number };
  };
  departure_timestamp: number;
  arrival_timestamp: number;
  duration_minutes: number;
  walking_distance_meters?: number;
  vehicle?: {
    uuid: string;
    license_plate: string;
    type: string;
    line_number: number;
    destination: string;
    capacity: number;
    owner: string;
  };
  delay?: {
    has_delay: boolean;
    delay_minutes: number;
    delay_reason: string;
    delay_source: string;
  };
}

interface CalculatedRoute {
  success: boolean;
  message: string;
  route_segments: RouteSegment[];
  summary: {
    total_duration_minutes: number;
    total_walking_time_minutes: number;
    total_walking_distance_meters: number;
    total_wait_time_minutes: number;
    total_delay_time_minutes: number;
    number_of_transfers: number;
    departure_timestamp: number;
    arrival_timestamp: number;
  };
  recommendations: string[];
}

// ===== API =====
const API_BASE_URL = "http://localhost:8000/api/v1";

async function fetchRecurringRoutes(
  activeOnly = true
): Promise<RecurringRoute[]> {
  const response = await fetch(
    `${API_BASE_URL}/recurring-routes?active_only=${activeOnly}`
  );
  const data = await response.json();
  return data.success ? data.routes : [];
}

async function fetchRouteDetails(
  routeId: string
): Promise<RecurringRouteDetail | null> {
  const response = await fetch(`${API_BASE_URL}/recurring-routes/${routeId}`);
  const data = await response.json();
  return data.success ? data.route : null;
}

async function calculateRoute(
  routeId: string,
  useNow = false
): Promise<CalculatedRoute | null> {
  const url = `${API_BASE_URL}/recurring-routes/${routeId}/calculate-route${
    useNow ? "?use_now=true" : ""
  }`;
  const response = await fetch(url);
  const data = await response.json();
  return data.success ? data : null;
}

// ===== KOMPONENTY =====

interface RouteCardProps {
  route: RecurringRoute;
  onPress: () => void;
  colors: any;
}

const RouteCard: React.FC<RouteCardProps> = ({ route, onPress, colors }) => {
  const getFrequencyIcon = (frequency: string) => {
    if (frequency === "weekdays") return "business-center";
    if (frequency === "weekends") return "weekend";
    return "calendar-today";
  };

  const getFrequencyText = (frequency: string) => {
    const map: Record<string, string> = {
      weekdays: "Dni robocze",
      weekends: "Weekendy",
      daily: "Codziennie",
      monday: "Poniedziałki",
      tuesday: "Wtorki",
      wednesday: "Środy",
      thursday: "Czwartki",
      friday: "Piątki",
      saturday: "Soboty",
      sunday: "Niedziele",
    };
    return map[frequency] || frequency;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.routeCard, { backgroundColor: colors.card }]}
      activeOpacity={0.7}
    >
      <View style={styles.routeHeader}>
        <ThemedText style={styles.routeName}>{route.name}</ThemedText>
        <IconSymbol
          name="clock.fill"
          size={24}
          color={colors.tint}
        />
      </View>

      <View style={styles.routeLocations}>
        <MaterialIcons name="my-location" size={16} color={colors.primary} />
        <ThemedText style={styles.locationText} numberOfLines={1}>
          {route.from_location_name}
        </ThemedText>
      </View>

      <View style={styles.routeArrow}>
        <MaterialIcons name="arrow-downward" size={20} color={colors.icon} />
      </View>

      <View style={styles.routeLocations}>
        <MaterialIcons name="place" size={16} color={colors.secondary} />
        <ThemedText style={styles.locationText} numberOfLines={1}>
          {route.to_location_name}
        </ThemedText>
      </View>

      <View style={styles.routeFooter}>
        <View style={styles.routeInfo}>
          <MaterialIcons name="access-time" size={16} color={colors.icon} />
          <ThemedText style={styles.infoText}>{route.departure_time}</ThemedText>
        </View>
        <View style={styles.routeInfo}>
          <MaterialIcons name="schedule" size={16} color={colors.icon} />
          <ThemedText style={styles.infoText}>
            ~{Math.round(route.average_duration_minutes)} min
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface RouteDetailsViewProps {
  routeDetail: RecurringRouteDetail;
  onBack: () => void;
  onCalculateRoute: (useNow: boolean) => void;
  colors: any;
  calculatingRoute: boolean;
}

const RouteDetailsView: React.FC<RouteDetailsViewProps> = ({
  routeDetail,
  onBack,
  onCalculateRoute,
  colors,
  calculatingRoute,
}) => {
  return (
    <ScrollView style={styles.detailsContainer}>
      <TouchableOpacity
        onPress={onBack}
        style={[styles.backButton, { backgroundColor: colors.card }]}
        activeOpacity={0.7}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <ThemedText style={styles.backButtonText}>Powrót</ThemedText>
      </TouchableOpacity>

      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        <ThemedText style={styles.detailsTitle}>{routeDetail.name}</ThemedText>
        {routeDetail.description && (
          <ThemedText style={styles.detailsDescription}>
            {routeDetail.description}
          </ThemedText>
        )}

        <View style={styles.detailsSection}>
          <IconSymbol name="map" size={20} color={colors.tint} />
          <ThemedText style={styles.sectionTitle}>Trasa</ThemedText>
        </View>
        <ThemedText style={styles.detailsText}>
          📍 Start: {routeDetail.from_location_name}
        </ThemedText>
        <ThemedText style={styles.detailsText}>
          🎯 Cel: {routeDetail.to_location_name}
        </ThemedText>
        <ThemedText style={styles.detailsText}>
          🕐 Odjazd: {routeDetail.departure_time}
        </ThemedText>
        <ThemedText style={styles.detailsText}>
          ⏱️ Średni czas: ~{Math.round(routeDetail.average_duration_minutes)} min
        </ThemedText>
        <ThemedText style={styles.detailsText}>
          🚶 Spacer: ~{Math.round(routeDetail.average_walking_time_minutes)} min (
          {routeDetail.average_walking_distance_meters}m)
        </ThemedText>
        <ThemedText style={styles.detailsText}>
          🔄 Przesiadki: {routeDetail.typical_transfers}
        </ThemedText>
      </View>

      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        <View style={styles.detailsSection}>
          <IconSymbol name="chart.bar.fill" size={20} color={colors.tint} />
          <ThemedText style={styles.sectionTitle}>Statystyki</ThemedText>
        </View>
        <ThemedText style={styles.detailsText}>
          📊 Liczba przejazdów: {routeDetail.statistics.total_trips}
        </ThemedText>
        <ThemedText style={styles.detailsText}>
          ✅ Punktualność: {routeDetail.statistics.on_time_percentage.toFixed(1)}%
        </ThemedText>
        <ThemedText style={styles.detailsText}>
          ⚠️ Średnie opóźnienie:{" "}
          {routeDetail.statistics.average_delay_minutes.toFixed(1)} min
        </ThemedText>
        {routeDetail.statistics.most_common_delay_reason && (
          <ThemedText style={styles.detailsText}>
            🔍 Najczęstszy powód: {routeDetail.statistics.most_common_delay_reason}
          </ThemedText>
        )}
      </View>

      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        <View style={styles.detailsSection}>
          <IconSymbol name="clock.fill" size={20} color={colors.tint} />
          <ThemedText style={styles.sectionTitle}>Alternatywne czasy</ThemedText>
        </View>
        <ThemedText style={styles.detailsText}>
          ⭐ Najlepszy czas: {routeDetail.best_departure_time}
        </ThemedText>
        <ThemedText style={styles.detailsText}>
          🕐 Inne opcje: {routeDetail.alternative_times.join(", ")}
        </ThemedText>
      </View>

      {routeDetail.tips.length > 0 && (
        <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          <View style={styles.detailsSection}>
            <IconSymbol name="lightbulb.fill" size={20} color={colors.warning} />
            <ThemedText style={styles.sectionTitle}>Wskazówki</ThemedText>
          </View>
          {routeDetail.tips.map((tip, index) => (
            <ThemedText key={index} style={styles.tipText}>
              💡 {tip}
            </ThemedText>
          ))}
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={() => onCalculateRoute(false)}
          style={[
            styles.calculateButton,
            { backgroundColor: colors.primary },
            calculatingRoute && styles.buttonDisabled,
          ]}
          disabled={calculatingRoute}
          activeOpacity={0.7}
        >
          {calculatingRoute ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol name="map.fill" size={24} color="#fff" />
              <ThemedText style={styles.calculateButtonText}>
                Oblicz trasę
              </ThemedText>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onCalculateRoute(true)}
          style={[
            styles.calculateButton,
            { backgroundColor: colors.success },
            calculatingRoute && styles.buttonDisabled,
          ]}
          disabled={calculatingRoute}
          activeOpacity={0.7}
        >
          {calculatingRoute ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol name="location.fill" size={24} color="#fff" />
              <ThemedText style={styles.calculateButtonText}>
                Teraz
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

interface CalculatedRouteViewProps {
  calculatedRoute: CalculatedRoute;
  routeName: string;
  onBack: () => void;
  colors: any;
}

const CalculatedRouteView: React.FC<CalculatedRouteViewProps> = ({
  calculatedRoute,
  routeName,
  onBack,
  colors,
}) => {
  return (
    <ScrollView style={styles.detailsContainer}>
      <TouchableOpacity
        onPress={onBack}
        style={[styles.backButton, { backgroundColor: colors.card }]}
        activeOpacity={0.7}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <ThemedText style={styles.backButtonText}>Powrót do szczegółów</ThemedText>
      </TouchableOpacity>

      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        <ThemedText style={styles.detailsTitle}>{routeName}</ThemedText>
        <ThemedText style={styles.successMessage}>
          {calculatedRoute.message}
        </ThemedText>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <IconSymbol name="clock.fill" size={24} color={colors.tint} />
            <ThemedText style={styles.summaryValue}>
              {Math.round(calculatedRoute.summary.total_duration_minutes)} min
            </ThemedText>
            <ThemedText style={styles.summaryLabel}>Całkowity czas</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <IconSymbol name="figure.walk" size={24} color={colors.tint} />
            <ThemedText style={styles.summaryValue}>
              {Math.round(calculatedRoute.summary.total_walking_time_minutes)} min
            </ThemedText>
            <ThemedText style={styles.summaryLabel}>Spacer</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <IconSymbol name="arrow.left.arrow.right" size={24} color={colors.tint} />
            <ThemedText style={styles.summaryValue}>
              {calculatedRoute.summary.number_of_transfers}
            </ThemedText>
            <ThemedText style={styles.summaryLabel}>Przesiadki</ThemedText>
          </View>
          {calculatedRoute.summary.total_delay_time_minutes > 0 && (
            <View style={styles.summaryItem}>
              <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.warning} />
              <ThemedText style={styles.summaryValue}>
                {Math.round(calculatedRoute.summary.total_delay_time_minutes)} min
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Opóźnienie</ThemedText>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        <View style={styles.detailsSection}>
          <IconSymbol name="list.bullet" size={20} color={colors.tint} />
          <ThemedText style={styles.sectionTitle}>Trasa krok po kroku</ThemedText>
        </View>

        {calculatedRoute.route_segments.map((segment, index) => (
          <View key={segment.segment_id} style={styles.segmentContainer}>
            {segment.type === "walking" ? (
              <View style={styles.walkingSegment}>
                <View style={styles.segmentHeader}>
                  <IconSymbol
                    name="figure.walk"
                    size={24}
                    color={colors.primary}
                  />
                  <ThemedText style={styles.segmentTitle}>
                    Spacer ({Math.round(segment.duration_minutes)} min)
                  </ThemedText>
                </View>
                <ThemedText style={styles.segmentText}>
                  📍 Z: {segment.from_stop.name}
                </ThemedText>
                <ThemedText style={styles.segmentText}>
                  📍 Do: {segment.to_stop.name}
                </ThemedText>
                <ThemedText style={styles.segmentText}>
                  📏 Dystans: {segment.walking_distance_meters}m
                </ThemedText>
              </View>
            ) : (
              <View style={styles.transitSegment}>
                <View style={styles.segmentHeader}>
                  <IconSymbol name="bus.fill" size={24} color={colors.secondary} />
                  <ThemedText style={styles.segmentTitle}>
                    Linia {segment.vehicle?.line_number} - {segment.vehicle?.type}
                  </ThemedText>
                </View>
                <ThemedText style={styles.segmentText}>
                  🚏 Z: {segment.from_stop.name}
                </ThemedText>
                <ThemedText style={styles.segmentText}>
                  🚏 Do: {segment.to_stop.name}
                </ThemedText>
                <ThemedText style={styles.segmentText}>
                  🎯 Kierunek: {segment.vehicle?.destination}
                </ThemedText>
                <ThemedText style={styles.segmentText}>
                  ⏱️ Czas przejazdu: {Math.round(segment.duration_minutes)} min
                </ThemedText>
                <ThemedText style={styles.segmentText}>
                  🕐 Odjazd:{" "}
                  {new Date(segment.departure_timestamp * 1000).toLocaleTimeString(
                    "pl-PL",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </ThemedText>
                <ThemedText style={styles.segmentText}>
                  🕐 Przyjazd:{" "}
                  {new Date(segment.arrival_timestamp * 1000).toLocaleTimeString(
                    "pl-PL",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </ThemedText>

                {segment.delay?.has_delay && (
                  <View
                    style={[
                      styles.delayWarning,
                      { backgroundColor: colors.warning + "20" },
                    ]}
                  >
                    <IconSymbol
                      name="exclamationmark.triangle.fill"
                      size={20}
                      color={colors.warning}
                    />
                    <ThemedText style={styles.delayText}>
                      Opóźnienie: {Math.round(segment.delay.delay_minutes)} min -{" "}
                      {segment.delay.delay_reason}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
            {index < calculatedRoute.route_segments.length - 1 && (
              <View style={styles.segmentDivider}>
                <MaterialIcons name="arrow-downward" size={20} color={colors.icon} />
              </View>
            )}
          </View>
        ))}
      </View>

      {calculatedRoute.recommendations.length > 0 && (
        <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          <View style={styles.detailsSection}>
            <IconSymbol name="info.circle.fill" size={20} color={colors.info} />
            <ThemedText style={styles.sectionTitle}>Rekomendacje</ThemedText>
          </View>
          {calculatedRoute.recommendations.map((rec, index) => (
            <ThemedText key={index} style={styles.recommendationText}>
              {rec}
            </ThemedText>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

// ===== GŁÓWNY KOMPONENT =====
export default function RecurringRoutesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [routes, setRoutes] = useState<RecurringRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RecurringRouteDetail | null>(
    null
  );
  const [calculatedRoute, setCalculatedRoute] = useState<CalculatedRoute | null>(
    null
  );
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const data = await fetchRecurringRoutes(true);
      setRoutes(data);
    } catch (error) {
      console.error("Błąd pobierania tras:", error);
      Alert.alert("Błąd", "Nie udało się pobrać tras regularnych");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const handleRoutePress = async (route: RecurringRoute) => {
    try {
      setLoading(true);
      const details = await fetchRouteDetails(route.id);
      if (details) {
        setSelectedRoute(details);
        setCalculatedRoute(null);
      } else {
        Alert.alert("Błąd", "Nie udało się pobrać szczegółów trasy");
      }
    } catch (error) {
      console.error("Błąd pobierania szczegółów:", error);
      Alert.alert("Błąd", "Nie udało się pobrać szczegółów trasy");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRoute = async (useNow: boolean) => {
    if (!selectedRoute) return;

    try {
      setCalculatingRoute(true);
      const route = await calculateRoute(selectedRoute.id, useNow);
      if (route) {
        setCalculatedRoute(route);
      } else {
        Alert.alert("Błąd", "Nie udało się obliczyć trasy");
      }
    } catch (error) {
      console.error("Błąd obliczania trasy:", error);
      Alert.alert("Błąd", "Nie udało się obliczyć trasy");
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleBack = () => {
    setSelectedRoute(null);
    setCalculatedRoute(null);
  };

  const handleBackToDetails = () => {
    setCalculatedRoute(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require("@/assets/journeytlo.png")}
        style={[styles.container, { backgroundColor: colors.background }]}
        resizeMode="cover"
      >
        <ThemedView style={[styles.container, { backgroundColor: "transparent" }]}>
          {/* Header with Logo */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Image 
                  source={require('@/assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.logoText}>
                <ThemedText style={styles.companyName}>Regularne Trasy</ThemedText>
                <ThemedText style={styles.companyTagline}>
                  Zarządzaj przejazdami
                </ThemedText>
              </View>
            </View>
          </View>

          {loading && !selectedRoute ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <ThemedText style={styles.loadingText}>Ładowanie tras...</ThemedText>
            </View>
          ) : calculatedRoute && selectedRoute ? (
            <CalculatedRouteView
              calculatedRoute={calculatedRoute}
              routeName={selectedRoute.name}
              onBack={handleBackToDetails}
              colors={colors}
            />
          ) : selectedRoute ? (
            <RouteDetailsView
              routeDetail={selectedRoute}
              onBack={handleBack}
              onCalculateRoute={handleCalculateRoute}
              colors={colors}
              calculatingRoute={calculatingRoute}
            />
          ) : (
            <ScrollView
              style={styles.content}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadRoutes();
                  }}
                  tintColor="#fff"
                />
              }
            >
              {routes.length === 0 ? (
                <View style={[styles.emptyJourney, { backgroundColor: colors.card }]}>
                  <IconSymbol size={40} name="arrow.triangle.2.circlepath" color={colors.icon} style={{ opacity: 0.3 }} />
                  <ThemedText style={styles.emptyTitle}>
                    Brak Regularnych Tras
                  </ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    Twoje regularne trasy pojawią się tutaj
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.routesList}>
                  {routes.map((route) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      onPress={() => handleRoutePress(route)}
                      colors={colors}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </ThemedView>
      </ImageBackground>
    </SafeAreaView>
  );
}

// ===== STYLE =====
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgb(69, 101, 173)",
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#fff",
    fontFamily: "Poppins-Medium",
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    backgroundColor: "rgb(69, 101, 173)",
    justifyContent: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  logoText: {
    flex: 1,
    justifyContent: "center",
  },
  companyName: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#fff",
    lineHeight: 28,
  },
  companyTagline: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#fff",
    opacity: 0.9,
    lineHeight: 16,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  routesList: {
    padding: 4,
    gap: 12,
  },
  routeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8eaed",
    shadowColor: "rgba(56, 80, 136, 0.05)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
    padding: 16,
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  routeName: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    flex: 1,
  },
  routeLocations: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    flex: 1,
  },
  routeArrow: {
    alignItems: "center",
    marginVertical: 4,
  },
  routeFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
  },
  emptyJourney: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    opacity: 0.6,
    textAlign: "center",
  },
  detailsContainer: {
    flex: 1,
    padding: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
  },
  detailsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8eaed",
    shadowColor: "rgba(56, 80, 136, 0.05)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    marginBottom: 8,
  },
  detailsDescription: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    opacity: 0.8,
    marginBottom: 16,
  },
  detailsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
  },
  detailsText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginBottom: 8,
    lineHeight: 20,
  },
  tipText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginBottom: 8,
    lineHeight: 20,
    paddingLeft: 8,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  calculateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  calculateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  successMessage: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginBottom: 16,
    opacity: 0.8,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    opacity: 0.7,
    marginTop: 4,
  },
  segmentContainer: {
    marginBottom: 12,
  },
  segmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  segmentTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  walkingSegment: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(100, 150, 255, 0.1)",
  },
  transitSegment: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(50, 200, 100, 0.1)",
  },
  segmentText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginBottom: 4,
    lineHeight: 20,
  },
  segmentDivider: {
    alignItems: "center",
    paddingVertical: 4,
  },
  delayWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  delayText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    flex: 1,
  },
  recommendationText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginBottom: 6,
    lineHeight: 20,
  },
});
