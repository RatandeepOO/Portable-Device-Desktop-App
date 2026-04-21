import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, Alert as RNAlert, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';

export default function HomeScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sound, setSound] = useState(null);
  const locationInterval = useRef(null);
  const { user, updateUser, token } = useAuthStore();

  useEffect(() => {
    loadAlerts();
    
    return () => {
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (token) {
      connectWebSocket();
      requestLocationPermission();
    }
    
    return () => {
      websocketService.disconnect();
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
      }
    };
  }, [token]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        startLocationUpdates();
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const startLocationUpdates = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      websocketService.sendLocation(location.coords.latitude, location.coords.longitude);
      
      locationInterval.current = setInterval(async () => {
        const loc = await Location.getCurrentPositionAsync({});
        websocketService.sendLocation(loc.coords.latitude, loc.coords.longitude);
      }, 3000);
    } catch (error) {
      console.error('Location update error:', error);
    }
  };

  const connectWebSocket = () => {
    if (token) {
      websocketService.connect(token);
      
      websocketService.on('alert:new', handleNewAlert);
      websocketService.on('connected', () => {
        const currentToken = useAuthStore.getState().token;
        if (currentToken) {
          websocketService.send({ type: 'team:login', token: currentToken });
        }
      });
    }
  };

  const handleNewAlert = async (alertData) => {
    await playAlertSound();
    loadAlerts();
    
    RNAlert.alert(
      'New Alert!',
      `Emergency alert received from ${alertData.device?.device_id || 'Unknown'}`,
      [
        { text: 'View', onPress: () => navigation.navigate('AlertDetail', { alert: alertData }) },
        { text: 'Later', style: 'cancel' }
      ]
    );
  };

  const playAlertSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      
      const { sound: audioSound } = await Audio.Sound.createAsync(
        require('../../assets/alert.mp3'),
        { isLooping: true, volume: 1.0 }
      );
      
      await audioSound.playAsync();
      setSound(audioSound);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const stopAlertSound = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  };

  const loadAlerts = async () => {
    try {
      const data = await apiService.getAlerts();
      const activeAlerts = data.filter(a => !a.is_resolved);
      setAlerts(activeAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = () => {
    const newStatus = !user.is_available;
    updateUser({ is_available: newStatus });
    websocketService.sendStatus(newStatus);
  };

  const getStatusLabel = (status) => {
    const labels = { 1: 'Minor', 2: 'Moderate', 3: 'Emergency' };
    return labels[status] || 'Unknown';
  };

  const getStatusColor = (status) => {
    const colors = { 1: '#FFA500', 2: '#FF6600', 3: '#FF0000' };
    return colors[status] || '#999';
  };

  const renderAlertItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.alertCard}
      onPress={() => navigation.navigate('AlertDetail', { alert: item })}
    >
      <View style={styles.alertHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
        <Text style={styles.alertTime}>
          {new Date(item.created_at).toLocaleTimeString()}
        </Text>
      </View>
      
      <View style={styles.alertContent}>
        {item.devices?.image_url && (
          <Image 
            source={{ uri: item.devices.image_url }} 
            style={styles.userImage}
          />
        )}
        <View style={styles.alertInfo}>
          <Text style={styles.deviceId}>{item.devices?.device_id || 'Unknown'}</Text>
          <Text style={styles.deviceName}>{item.devices?.user_name || 'Unknown User'}</Text>
          <Text style={styles.location}>
            {item.alert_lat?.toFixed(4)}, {item.alert_lng?.toFixed(4)}
          </Text>
        </View>
      </View>
      
      <View style={styles.alertActions}>
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={() => {
            websocketService.acceptAlert(item.id);
            navigation.navigate('AlertDetail', { alert: item });
          }}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.statusButton, user?.is_available && styles.statusAvailable]}
          onPress={toggleAvailability}
        >
          <Text style={[styles.statusButtonText, user?.is_available && styles.statusAvailableText]}>
            {user?.is_available ? 'Available' : 'Busy'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileButtonText}>Profile</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active alerts</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlertItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#CC6600',
  },
  statusAvailable: {
    backgroundColor: '#00CC66',
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusAvailableText: {
    color: '#FFFFFF',
  },
  profileButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0066CC',
    borderRadius: 20,
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  alertTime: {
    color: '#999',
    fontSize: 12,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  deviceId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  alertActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  acceptButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});