import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isRegistered: boolean;
  registerForPushNotifications: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Brak uprawnień',
        'Nie udało się uzyskać uprawnień do powiadomień push. Powiadomienia są wymagane do śledzenia podróży.'
      );
      return null;
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.warn('⚠️ Project ID not found. Push notifications may not work.');
      }
      
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        })
      ).data;
      
      console.log('📱 Expo Push Token:', token);
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      Alert.alert('Błąd', 'Nie udało się zarejestrować tokenu push');
    }
  } else {
    Alert.alert('Uwaga', 'Powiadomienia push działają tylko na fizycznych urządzeniach');
  }

  return token;
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Auto-register on mount
    registerForPushNotifications();

    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
      setNotification(notification);
    });

    // Listener for when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      // Handle notification tap here (e.g., navigate to specific screen)
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const registerForPushNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        setIsRegistered(true);
        console.log('✅ Push notifications registered successfully');
        console.log('📱 Expo Push Token:', token);
        
        // Send token to backend
        try {
          const response = await fetch(`${API_BASE_URL}/register_push_token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              push_token: token,
              platform: Platform.OS,
              device_id: Device.modelName || 'unknown',
            }),
          });
          
          if (response.ok) {
            console.log('✅ Push token registered with backend');
          } else {
            console.warn('⚠️ Failed to register token with backend:', response.status);
          }
        } catch (backendError) {
          console.error('❌ Error sending token to backend:', backendError);
          // Don't throw - continue even if backend registration fails
        }
      }
    } catch (error) {
      console.error('❌ Error in registerForPushNotifications:', error);
      setIsRegistered(false);
    }
  };

  const sendTestNotification = async () => {
    if (!expoPushToken) {
      Alert.alert('Błąd', 'Brak tokenu push. Spróbuj ponownie zarejestrować powiadomienia.');
      return;
    }

    try {
      // Schedule a local notification for testing
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Powiadomienia 🚍",
          body: 'Twój autobus przyjedzie za 5 minut!',
          data: { testData: 'test notification' },
          sound: true,
        },
        trigger: { seconds: 2, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
      });
      
      console.log('✅ Test notification scheduled');
      Alert.alert('Sukces', 'Testowe powiadomienie zostanie wyświetlone za 2 sekundy');
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      Alert.alert('Błąd', 'Nie udało się wysłać testowego powiadomienia');
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        isRegistered,
        registerForPushNotifications,
        sendTestNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
