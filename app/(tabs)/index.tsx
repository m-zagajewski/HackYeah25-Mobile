import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { Journey, useJourney } from "@/contexts/JourneyContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { currentJourney } = useJourney();
  const { expoPushToken, isRegistered, sendTestNotification } = useNotifications();

  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");

  const handleSearchConnection = () => {
    router.push("/modal");
  };

  const getStatusColor = (status: Journey["status"]) => {
    switch (status) {
      case "on-time":
        return colors.success;
      case "delayed":
        return colors.warning;
      case "cancelled":
        return colors.danger;
      default:
        return colors.text;
    }
  };

  const getStatusText = (journey: Journey) => {
    switch (journey.status) {
      case "on-time":
        return "Na Czas";
      case "delayed":
        return `Opóźnienie ${journey.delayMinutes} min`;
      case "cancelled":
        return "Odwołany";
      default:
        return "";
    }
  };

  const calculateJourneyProgress = (journey: Journey): number => {
    if (!journey.departure || !journey.arrival) return 0;
    
    // Parse time strings (HH:MM format)
    const parseTime = (timeStr: string): Date => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };
    
    const now = new Date();
    const departureTime = parseTime(journey.departure);
    const arrivalTime = parseTime(journey.arrival);
    
    // Handle case where arrival is next day (after midnight)
    if (arrivalTime < departureTime) {
      arrivalTime.setDate(arrivalTime.getDate() + 1);
    }
    
    // Calculate progress
    const totalDuration = arrivalTime.getTime() - departureTime.getTime();
    const elapsed = now.getTime() - departureTime.getTime();
    
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    
    return progress;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require("@/assets/journeytlo.png")}
        style={[styles.container, { backgroundColor: colors.background }]}
        resizeMode="cover"
      >
        <ThemedView
          style={[styles.container, { backgroundColor: "transparent" }]}
        >
          {/* Compact Header with Logo */}
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
              <ThemedText style={styles.companyName}>Lajkonik</ThemedText>
              <ThemedText style={styles.companyTagline}>
                Małopolska Innowacyjna
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <TouchableOpacity 
            style={[styles.searchSection, { backgroundColor: colors.card }]}
            onPress={handleSearchConnection}
            activeOpacity={0.7}
          >
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
                  <ThemedText style={[styles.inputPlaceholder, { color: colors.icon }]}>
                    {fromLocation || "Aktualna lokalizacja"}
                  </ThemedText>
                </View>

                <View style={styles.stackedInput}>
                  <ThemedText style={[styles.inputPlaceholder, { color: colors.icon }]}>
                    {toLocation || "Dokąd"}
                  </ThemedText>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.journeyContainer} onPress={() => router.push('/live-track')} activeOpacity={0.9}>
            {currentJourney ? (
              <View
                style={[styles.journeyCard, { backgroundColor: colors.card }]}
              >
                {/* Journey Header */}
                <View style={styles.journeyHeader}>
                  <View style={styles.journeyHeaderLeft}>
                    <IconSymbol
                      size={18}
                      name="clock.fill"
                      color={colors.accent}
                    />
                    <ThemedText
                      type="defaultSemiBold"
                      style={styles.journeyTitle}
                    >
                      Aktualna Podróż
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(currentJourney.status) },
                    ]}
                  >
                    <ThemedText style={styles.statusText}>
                      {getStatusText(currentJourney)}
                    </ThemedText>
                  </View>
                </View>

                {/* Route Info */}
                <View style={styles.routeInfo}>
                  <View
                    style={[
                      styles.routeBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <ThemedText style={styles.routeNumber}>
                      {currentJourney.routeNumber}
                    </ThemedText>
                  </View>
                  <View style={styles.routeDetails}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={styles.destination}
                    >
                      {currentJourney.destination}
                    </ThemedText>
                    <View style={styles.timeRow}>
                      <View style={styles.timeItem}>
                        <ThemedText style={styles.timeLabel}>
                          Odjazd
                        </ThemedText>
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.timeValue}
                        >
                          {currentJourney.departure}
                        </ThemedText>
                      </View>
                      <IconSymbol
                        size={16}
                        name="arrow.right"
                        color={colors.icon}
                      />
                      <View style={styles.timeItem}>
                        <ThemedText style={styles.timeLabel}>
                          Przyjazd
                        </ThemedText>
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.timeValue}
                        >
                          {currentJourney.arrival}
                        </ThemedText>
                      </View>
                      {currentJourney.durationMinutes && (
                        <>
                          <View style={[styles.timeDivider, { backgroundColor: colors.border }]} />
                          <View style={styles.timeItem}>
                            <ThemedText style={styles.timeLabel}>
                              Czas
                            </ThemedText>
                            <ThemedText
                              type="defaultSemiBold"
                              style={styles.timeValue}
                            >
                              {Math.round(currentJourney.durationMinutes)} min
                            </ThemedText>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                </View>

                {/* Progress Indicator */}
                <View style={styles.progressSection}>
                  <View style={styles.stopInfo}>
                    <View style={styles.stopItem}>
                      <View
                        style={[
                          styles.stopIndicator,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                      <View>
                        <ThemedText style={styles.stopLabel}>
                          Obecny Przystanek
                        </ThemedText>
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.stopName}
                        >
                          {currentJourney.currentStop}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.stopItem}>
                      <View
                        style={[
                          styles.stopIndicator,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View>
                        <ThemedText style={styles.stopLabel}>
                          Następny Przystanek
                        </ThemedText>
                        <ThemedText style={styles.stopName}>
                          {currentJourney.nextStop}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.progressBar,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        { 
                          backgroundColor: colors.primary, 
                          width: `${calculateJourneyProgress(currentJourney)}%` 
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: colors.warning },
                    ]}
                    onPress={() => {
                      router.push("/report-issue");
                    }}
                  >
                    <IconSymbol
                      size={20}
                      name="exclamationmark.triangle.fill"
                      color="#fff"
                    />
                    <ThemedText style={styles.actionBtnText}>
                      Zgłoś Problem
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View
                style={[styles.emptyJourney, { backgroundColor: colors.card }]}
              >
                <IconSymbol size={40} name="ticket" color={colors.icon} style={{ opacity: 0.3 }} />
                <ThemedText style={styles.emptyTitle}>
                  Brak Aktywnej Podróży
                </ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  Wyszukaj połączenia powyżej
                </ThemedText>
                
                {/* Notification Test Button - For Development */}
                {__DEV__ && (
                  <View style={styles.notificationTest}>
                    <ThemedText style={[styles.notificationStatus, { color: colors.icon }]}>
                      Push Token: {isRegistered ? '✅ Zarejestrowany' : '❌ Niezarejestrowany'}
                    </ThemedText>
                    {expoPushToken && (
                      <ThemedText style={[styles.notificationToken, { color: colors.icon }]} numberOfLines={1}>
                        {expoPushToken.substring(0, 30)}...
                      </ThemedText>
                    )}
                    <TouchableOpacity
                      style={[styles.testButton, { backgroundColor: colors.primary }]}
                      onPress={sendTestNotification}
                    >
                      <MaterialIcons name="notifications" size={16} color="#fff" />
                      <ThemedText style={styles.testButtonText}>
                        Testuj Powiadomienie
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>
    </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgb(69, 101, 173)",
  },
  container: {
    flex: 1,
  },
    header: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 }, // height > 0 = shadow only below
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
  searchSection: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8eaed",
    shadowColor: "rgba(56, 80, 136, 0.05)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "stretch",
    // gap: 12,
  },
  connectionLine: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  lineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  inputPlaceholder: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
  },
  journeyContainer: {
    flex: 1,
    marginTop: 16,
    marginBottom: 16,
  },
  journeyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8eaed",
    shadowColor: "rgba(56, 80, 136, 0.05)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  journeyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  journeyHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  journeyTitle: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins-Bold",
  },
  routeInfo: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  routeBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  routeNumber: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Poppins-Bold",
  },
  routeDetails: {
    flex: 1,
  },
  destination: {
    fontSize: 17,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeItem: {
    flex: 1,
  },
  timeDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 4,
  },
  timeLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  stopInfo: {
    gap: 12,
    marginBottom: 12,
  },
  stopItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stopIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stopLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 2,
  },
  stopName: {
    fontSize: 14,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
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
    opacity: 0.6,
    textAlign: "center",
  },
  buyTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  buyTicketBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Poppins-Bold",
  },
  notificationTest: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    alignItems: "center",
    gap: 8,
    width: '100%',
  },
  notificationStatus: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  notificationToken: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    opacity: 0.5,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  testButtonText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
});
