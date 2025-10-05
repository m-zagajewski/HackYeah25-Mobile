import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useJourney } from "@/contexts/JourneyContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface IssueType {
  id: string;
  title: string;
  icon: string;
  color: string;
}

type DelayReason = "TRAFFIC_JAM" | "ROAD_ACCIDENT" | "SEVERE_WEATHER" | "VEHICLE_ISSUE";

interface DelayReportPayload {
  vehicle_uuid: string;
  current_stop_uuid: string;
  next_stop_uuid: string;
  delay_reason: DelayReason;
}

export default function ReportIssueScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { currentJourney } = useJourney();

  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const issueTypes: IssueType[] = [
    {
      id: "TRAFFIC_JAM",
      title: "Korki",
      icon: "schedule",
      color: colors.warning,
    },
    {
      id: "VEHICLE_ISSUE",
      title: "Usterka",
      icon: "build",
      color: colors.secondary,
    },
    {
      id: "SEVERE_WEATHER",
      title: "Zła Pogoda",
      icon: "cloud",
      color: colors.danger,
    },
    {
      id: "ROAD_ACCIDENT",
      title: "Wypadek",
      icon: "map",
      color: colors.primary,
    },
  ];
  const handleSubmit = async () => {
    if (!selectedIssue) {
      Alert.alert("Wybierz Typ Problemu", "Proszę wybrać typ problemu do zgłoszenia");
      return;    }

    // Validate journey data
    if (!currentJourney) {
      Alert.alert("Brak Aktywnej Podróży", "Nie można zgłosić problemu bez aktywnej podróży");
      return;
    }

    if (!currentJourney.vehicleUuid || !currentJourney.stops || currentJourney.currentStopIndex === undefined) {
      console.log('Invalid journey data:', currentJourney);
      Alert.alert("Błąd", "Brak wymaganych danych o podróży");
      return;
    }

    const currentStopData = currentJourney.stops[currentJourney.currentStopIndex];
    const nextStopData = currentJourney.stops[currentJourney.currentStopIndex + 1];

    if (!currentStopData || !nextStopData) {
      Alert.alert("Błąd", "Nie można określić przystanków");
      return;
    }

    setIsSubmitting(true);

    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-domain.com';
      
      const payload: DelayReportPayload = {
        vehicle_uuid: currentJourney.vehicleUuid,
        current_stop_uuid: currentStopData.uuid,
        next_stop_uuid: nextStopData.uuid,
        delay_reason: selectedIssue as DelayReason,
      };

      console.log('Sending delay report:', payload);

      const response = await fetch(`${API_BASE_URL}/api/v1/delay/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Delay report response:', data);

      setIsSubmitting(false);
      Alert.alert(
        "Zgłoszenie Wysłane! ✅",
        "Dziękujemy za opinię. Zajmiemy się tym problemem tak szybko, jak to możliwe.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting delay report:', error);
      setIsSubmitting(false);
      Alert.alert(
        "Błąd",
        `Nie udało się wysłać zgłoszenia: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
        [
          {
            text: "OK",
          },
        ]
      );
    }
  };

  const selectedIssueType = issueTypes.find((type) => type.id === selectedIssue);

  return (
    <ImageBackground
      source={require("@/assets/journeytlo.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <ThemedView style={[styles.container, { backgroundColor: "transparent" }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Info */}
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <View style={styles.infoHeader}>
                <MaterialIcons
                  name="report-problem"
                  size={28}
                  color={colors.warning}
                />
                <View style={styles.infoText}>
                  <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
                    Zgłoś Problem
                  </ThemedText>
                  <ThemedText style={[styles.infoSubtitle, { color: colors.icon }]}>
                    Szybkie zgłoszenie • Zajmie mniej niż 30 sekund
                  </ThemedText>
                </View>
              </View>

              {/* Current Journey Info */}
              {currentJourney && (
                <View style={[styles.journeyBadge, { backgroundColor: colors.background }]}>
                  <MaterialIcons name="directions-bus" size={18} color={colors.primary} />
                  <ThemedText style={styles.journeyText}>
                    Linia {currentJourney.routeNumber} • {currentJourney.currentStop} → {currentJourney.nextStop}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Quick Issue Selection */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Jaki jest problem?
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: colors.icon }]}>
                Dotknij, aby wybrać
              </ThemedText>

              <View style={styles.issueGrid}>
                {issueTypes.map((issue) => (
                  <TouchableOpacity
                    key={issue.id}
                    style={[
                      styles.issueCard,
                      {
                        backgroundColor: colors.background,
                        borderColor:
                          selectedIssue === issue.id
                            ? issue.color
                            : colors.border,
                        borderWidth: selectedIssue === issue.id ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedIssue(issue.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.issueIconContainer,
                        {
                          backgroundColor:
                            selectedIssue === issue.id
                              ? issue.color
                              : colors.border,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={issue.icon as any}
                        size={24}
                        color={selectedIssue === issue.id ? "#fff" : colors.icon}
                      />
                    </View>
                    <ThemedText
                      style={[
                        styles.issueTitle,
                        selectedIssue === issue.id && {
                          color: issue.color,
                          fontFamily: "Poppins-SemiBold",
                        },
                      ]}
                    >
                      {issue.title}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Optional Description */}
            {selectedIssue && (
              <View style={[styles.section, { backgroundColor: colors.card }]}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Dodatkowe Szczegóły (Opcjonalne)
                </ThemedText>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Dodaj więcej szczegółów, jeśli potrzebujesz..."
                  placeholderTextColor={colors.icon}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={500}
                />
                <ThemedText style={[styles.charCount, { color: colors.icon }]}>
                  {description.length}/500 znaków
                </ThemedText>
              </View>
            )}

            {/* Submit Button */}
            {selectedIssue && (
              <View style={styles.submitContainer}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    { backgroundColor: selectedIssueType?.color || colors.primary },
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <>
                      <MaterialIcons name="hourglass-empty" size={24} color="#fff" />
                      <ThemedText style={styles.submitButtonText}>
                        Wysyłanie...
                      </ThemedText>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="send" size={24} color="#fff" />
                      <ThemedText style={styles.submitButtonText}>
                        Wyślij Zgłoszenie
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => router.back()}
                  disabled={isSubmitting}
                >
                  <ThemedText style={[styles.cancelButtonText, { color: colors.text }]}>
                    Anuluj
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Tips */}
            <View style={[styles.tipsCard, { backgroundColor: colors.card }]}>
              <MaterialIcons name="lightbulb" size={20} color={colors.accent} />
              <View style={styles.tipsContent}>
                <ThemedText style={styles.tipsTitle}>Szybka Wskazówka</ThemedText>
                <ThemedText style={[styles.tipsText, { color: colors.icon }]}>
                  Twoje zgłoszenia pomagają nam poprawiać jakość usług dla wszystkich
                </ThemedText>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 13,
  },
  journeyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  journeyText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  issueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  issueCard: {
    width: "47%",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  issueIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  issueTitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "right",
  },
  submitContainer: {
    gap: 12,
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
  },
  tipsCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 12,
    padding: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 2,
  },
  tipsText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
