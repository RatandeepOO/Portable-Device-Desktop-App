import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { websocketService } from '../services/websocket';

export default function AlertDetailScreen({ route, navigation }) {
  const { alert } = route.params;
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const getStatusLabel = (status) => {
    const labels = { 1: 'Minor', 2: 'Moderate', 3: 'Emergency' };
    return labels[status] || 'Unknown';
  };

  const getStatusColor = (status) => {
    const colors = { 1: '#FFA500', 2: '#FF6600', 3: '#FF0000' };
    return colors[status] || '#999';
  };

  const openMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${alert.alert_lat},${alert.alert_lng}`;
    Linking.openURL(url);
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      websocketService.acceptAlert(alert.id);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      websocketService.completeAlert(alert.id);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const isAssignedToMe = alert.team_id === user?.id;
  const hasActiveAlert = !user?.is_available;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(alert.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(alert.status)}</Text>
        </View>
        <Text style={styles.alertTime}>
          {new Date(alert.created_at).toLocaleString()}
        </Text>
      </View>

      <View style={styles.content}>
        {alert.devices?.image_url ? (
          <Image 
            source={{ uri: alert.devices.image_url }} 
            style={styles.userImage}
          />
        ) : (
          <View style={[styles.userImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Device ID</Text>
            <Text style={styles.value}>{alert.devices?.device_id || 'Unknown'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>User Name</Text>
            <Text style={styles.value}>{alert.devices?.user_name || 'Unknown'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Emergency Contact</Text>
            <Text style={styles.value}>
              {alert.devices?.emergency_contact_name || 'N/A'}
              {alert.devices?.emergency_contact_phone ? `\n${alert.devices.emergency_contact_phone}` : ''}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>
              {alert.alert_lat?.toFixed(6)}, {alert.alert_lng?.toFixed(6)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Click Count</Text>
            <Text style={styles.value}>{alert.click_count}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.mapButton} onPress={openMaps}>
          <Text style={styles.mapButtonText}>Open in Maps</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        {!isAssignedToMe && !hasActiveAlert && (
          <TouchableOpacity 
            style={[styles.button, styles.acceptButton, loading && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Accept Alert</Text>
            )}
          </TouchableOpacity>
        )}

        {isAssignedToMe && !alert.is_resolved && (
          <TouchableOpacity 
            style={[styles.button, styles.completeButton, loading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Mark Complete</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.button, styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  alertTime: {
    color: '#999',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 24,
  },
  placeholderImage: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
  },
  infoSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  mapButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  acceptButton: {
    backgroundColor: '#0066CC',
  },
  completeButton: {
    backgroundColor: '#00CC66',
  },
  backButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});