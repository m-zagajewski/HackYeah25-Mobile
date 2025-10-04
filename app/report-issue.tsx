import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ScrollView,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

interface IssueType {
  id: string;
  title: string;
  icon: string;
  color: string;
}

export default function ReportIssueScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();

  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const issueTypes: IssueType[] = [
    {
      id: "delay",
      title: "Delay",
      icon: "schedule",
      color: colors.warning,
    },
    {
      id: "crowded",
      title: "Overcrowded",
      icon: "people",
      color: colors.danger,
    },
    {
      id: "dirty",
      title: "Cleanliness",
      icon: "cleaning-services",
      color: colors.accent,
    },
    {
      id: "broken",
      title: "Equipment Issue",
      icon: "build",
      color: colors.secondary,
    },
    {
      id: "driver",
      title: "Driver Behavior",
      icon: "person",
      color: colors.info,
    },
    {
      id: "safety",
      title: "Safety Concern",
      icon: "warning",
      color: colors.danger,
    },
    {
      id: "route",
      title: "Route Problem",
      icon: "map",
      color: colors.primary,
    },
    {
      id: "other",
      title: "Other",
      icon: "more-horiz",
      color: colors.icon,
    },
  ];

  const handleSubmit = async () => {
    if (!selectedIssue) {
      Alert.alert("Select Issue Type", "Please select an issue type to report");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        "Report Submitted! ✅",
        "Thank you for your feedback. We'll address this issue as soon as possible.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    }, 1000);
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
                    Report an Issue
                  </ThemedText>
                  <ThemedText style={[styles.infoSubtitle, { color: colors.icon }]}>
                    Quick report • Takes less than 30 seconds
                  </ThemedText>
                </View>
              </View>

              {/* Current Journey Info */}
              <View style={[styles.journeyBadge, { backgroundColor: colors.background }]}>
                <MaterialIcons name="directions-bus" size={18} color={colors.primary} />
                <ThemedText style={styles.journeyText}>
                  Route 42 • Tram 4201
                </ThemedText>
              </View>
            </View>

            {/* Quick Issue Selection */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                What's the issue?
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: colors.icon }]}>
                Tap to select
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
                  Additional Details (Optional)
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
                  placeholder="Add more details if needed..."
                  placeholderTextColor={colors.icon}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={500}
                />
                <ThemedText style={[styles.charCount, { color: colors.icon }]}>
                  {description.length}/500 characters
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
                        Submitting...
                      </ThemedText>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="send" size={24} color="#fff" />
                      <ThemedText style={styles.submitButtonText}>
                        Submit Report
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
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Tips */}
            <View style={[styles.tipsCard, { backgroundColor: colors.card }]}>
              <MaterialIcons name="lightbulb" size={20} color={colors.accent} />
              <View style={styles.tipsContent}>
                <ThemedText style={styles.tipsTitle}>Quick Tip</ThemedText>
                <ThemedText style={[styles.tipsText, { color: colors.icon }]}>
                  Your reports help us improve service quality for everyone
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
