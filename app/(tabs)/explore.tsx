import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface TicketType {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: string;
}

interface Route {
  id: string;
  number: string;
  name: string;
  type: 'bus' | 'tram' | 'metro' | 'train';
}

export default function BuyTicketScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>(null);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const ticketTypes: TicketType[] = [
    {
      id: 'single',
      name: 'Single Journey',
      price: 3.50,
      description: '75 min validity',
      icon: 'ticket.fill',
    },
    {
      id: 'day',
      name: 'Day Pass',
      price: 8.00,
      description: '24 hours unlimited',
      icon: 'calendar',
    },
    {
      id: 'week',
      name: 'Weekly Pass',
      price: 35.00,
      description: '7 days unlimited',
      icon: 'calendar.badge.clock',
    },
    {
      id: 'month',
      name: 'Monthly Pass',
      price: 120.00,
      description: '30 days unlimited',
      icon: 'creditcard.fill',
    },
  ];

  const popularRoutes: Route[] = [
    { id: '1', number: '42', name: 'Central Station - Airport', type: 'bus' },
    { id: '2', number: '128', name: 'Downtown - University', type: 'tram' },
    { id: '3', number: 'M1', name: 'North - South Line', type: 'metro' },
    { id: '4', number: '7', name: 'City Express', type: 'train' },
  ];

  const getRouteIcon = (type: Route['type']) => {
    switch (type) {
      case 'bus':
        return 'bus.fill';
      case 'tram':
        return 'tram.fill';
      case 'metro':
        return 'train.side.front.car';
      case 'train':
        return 'train.side.middle.car';
      default:
        return 'bus.fill';
    }
  };

  const handleBuyTicket = () => {
    console.log('Buying ticket:', {
      ticketType: selectedTicketType,
      from: fromLocation,
      to: toLocation,
      route: selectedRoute,
    });
  };

  return (
    <ImageBackground 
      source={require('@/assets/journeytlo.png')}
      style={styles.container}
      resizeMode="cover"
    >
    <ThemedView style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <ThemedText type="title" style={styles.headerTitle}>Buy Ticket</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Choose your journey</ThemedText>
      </View>

      {/* Compact Search Section - Vertical Layout Same as Home */}
      <View style={[styles.searchSection, { backgroundColor: colors.card }]}>
        <View style={styles.searchInputWrapper}>
          {/* Connection Line on Left */}
          <View style={styles.connectionLine}>
            <View style={[styles.lineDot, { backgroundColor: colors.primary }]} />
            <View style={[styles.verticalLine, { backgroundColor: colors.border }]} />
            <View style={[styles.lineDot, { backgroundColor: colors.secondary }]} />
          </View>

          {/* Input Fields Stacked */}
          <View style={styles.inputsContainer}>
            <View style={[styles.stackedInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Current location"
                placeholderTextColor={colors.icon}
                value={fromLocation}
                onChangeText={setFromLocation}
              />
            </View>

            <View style={[styles.stackedInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="To"
                placeholderTextColor={colors.icon}
                value={toLocation}
                onChangeText={setToLocation}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
          onPress={() => {/* Search for connections */}}
          activeOpacity={0.8}
        >
          <IconSymbol size={18} name="magnifyingglass" color="#fff" />
          <ThemedText style={styles.searchButtonText}>Search</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Ticket Types */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Ticket Type</ThemedText>
          <View style={styles.ticketGrid}>
            {ticketTypes.map((ticket) => (
              <TouchableOpacity
                key={ticket.id}
                style={[
                  styles.ticketCard,
                  { 
                    backgroundColor: colors.card,
                    borderColor: selectedTicketType === ticket.id ? colors.primary : colors.border,
                    borderWidth: selectedTicketType === ticket.id ? 2 : 1,
                  }
                ]}
                onPress={() => setSelectedTicketType(ticket.id)}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  size={32} 
                  name={ticket.icon as any} 
                  color={selectedTicketType === ticket.id ? colors.primary : colors.icon}
                />
                <ThemedText type="defaultSemiBold" style={styles.ticketName}>
                  {ticket.name}
                </ThemedText>
                <ThemedText 
                  style={[
                    styles.ticketPrice,
                    { color: selectedTicketType === ticket.id ? colors.primary : colors.text }
                  ]}
                >
                  ${ticket.price.toFixed(2)}
                </ThemedText>
                <ThemedText style={styles.ticketDescription}>{ticket.description}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Popular Routes */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Popular Routes</ThemedText>
          {popularRoutes.map((route) => (
            <TouchableOpacity
              key={route.id}
              style={[
                styles.routeCard,
                { 
                  backgroundColor: colors.card,
                  borderColor: selectedRoute === route.id ? colors.primary : colors.border,
                  borderWidth: selectedRoute === route.id ? 2 : 1,
                }
              ]}
              onPress={() => setSelectedRoute(route.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.routeBadge, { backgroundColor: colors.secondary }]}>
                <IconSymbol size={24} name={getRouteIcon(route.type)} color="#fff" />
              </View>
              <View style={styles.routeInfo}>
                <View style={styles.routeHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.routeNumber}>
                    {route.number}
                  </ThemedText>
                  <View style={[styles.routeTypeBadge, { backgroundColor: colors.accent }]}>
                    <ThemedText style={styles.routeTypeText}>{route.type.toUpperCase()}</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.routeName}>{route.name}</ThemedText>
              </View>
              <IconSymbol 
                size={24} 
                name={selectedRoute === route.id ? 'checkmark.circle.fill' : 'circle'} 
                color={selectedRoute === route.id ? colors.primary : colors.border}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Summary */}
        {selectedTicketType && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Ticket Type</ThemedText>
              <ThemedText type="defaultSemiBold">
                {ticketTypes.find(t => t.id === selectedTicketType)?.name}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Price</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: colors.primary }}>
                ${ticketTypes.find(t => t.id === selectedTicketType)?.price.toFixed(2)}
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Buy Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.buyButton,
            { 
              backgroundColor: selectedTicketType ? colors.primary : colors.border,
            }
          ]}
          onPress={handleBuyTicket}
          disabled={!selectedTicketType}
          activeOpacity={0.8}
        >
          <IconSymbol size={24} name="creditcard.fill" color="#fff" />
          <ThemedText style={styles.buyButtonText}>
            {selectedTicketType ? 'Proceed to Payment' : 'Select Ticket Type'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  connectionLine: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 2,
    height: 16,
    marginVertical: 2,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  ticketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ticketCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ticketName: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  ticketPrice: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    marginTop: 4,
  },
  ticketDescription: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
    textAlign: 'center',
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  routeBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  routeNumber: {
    fontSize: 18,
  },
  routeTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  routeTypeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
  routeName: {
    fontSize: 14,
    opacity: 0.7,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    opacity: 0.7,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    gap: 12,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
});
