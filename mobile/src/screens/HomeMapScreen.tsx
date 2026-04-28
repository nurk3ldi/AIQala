import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';

import { env } from '../config/env';
import { AuthResult } from '../services/auth';
import { IssueRequest, RequestStatus, listMapRequests } from '../services/requests';
import { colors } from '../theme/colors';

type HomeMapScreenProps = {
  auth: AuthResult;
  onProfilePress?: () => void;
};

type MapIssue = IssueRequest & {
  lat: number;
  lng: number;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

const DEFAULT_REGION = {
  latitude: 48.0196,
  longitude: 66.9237,
  latitudeDelta: 28,
  longitudeDelta: 34,
};

const statusColors: Record<RequestStatus, string> = {
  accepted: '#dc2626',
  in_progress: '#ca8a04',
  resolved: '#15803d',
};

const statusLabels: Record<RequestStatus, string> = {
  accepted: 'Жаңа мәселе',
  in_progress: 'Өңдеуде',
  resolved: 'Шешілген',
};

const parseCoordinate = (value: string | null) => {
  if (!value) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeIssues = (issues: IssueRequest[]) =>
  issues.reduce<MapIssue[]>((accumulator, issue) => {
    const lat = parseCoordinate(issue.latitude);
    const lng = parseCoordinate(issue.longitude);

    if (lat === null || lng === null) {
      return accumulator;
    }

    accumulator.push({
      ...issue,
      lat,
      lng,
    });

    return accumulator;
  }, []);

export function HomeMapScreen({ auth, onProfilePress }: HomeMapScreenProps) {
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [hideIssues, setHideIssues] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState<typeof DEFAULT_REGION>(DEFAULT_REGION);

  useEffect(() => {
    let active = true;

    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        
        if (active) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (err) {
        // геолокация алмасқан кезде мол әрі қарай жүргін
        console.error('Location error:', err);
      }
    };

    void requestLocationPermission();
    
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const nextIssues = normalizeIssues(await listMapRequests(auth.accessToken));

        if (active) {
          setIssues(nextIssues);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Карта жүктелмеді');
          setIssues([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [auth.accessToken, reloadKey]);

  const counts = useMemo(
    () =>
      issues.reduce<Record<RequestStatus, number>>(
        (accumulator, issue) => {
          accumulator[issue.status] += 1;
          return accumulator;
        },
        {
          accepted: 0,
          in_progress: 0,
          resolved: 0,
        },
      ),
    [issues],
  );

  const handleResetHeading = () => {
    if (!mapRef.current) return;
    const center = userLocation ?? { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude };

    try {
      mapRef.current.animateCamera({ center, heading: 0 }, { duration: 500 });
    } catch (e) {
      // fallback: just animate to region
      mapRef.current.animateToRegion({ latitude: center.latitude, longitude: center.longitude, latitudeDelta: DEFAULT_REGION.latitudeDelta, longitudeDelta: DEFAULT_REGION.longitudeDelta }, 500);
    }
  };

  const handleCenterOnUser = () => {
    if (!mapRef.current || !userLocation) return;

    mapRef.current.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  };

  const ZOOM_FACTOR = 0.5;

  const handleZoomIn = () => {
    if (!mapRef.current || !region) return;

    const newLatDelta = Math.max(region.latitudeDelta * ZOOM_FACTOR, 0.0005);
    const newLongDelta = Math.max(region.longitudeDelta * ZOOM_FACTOR, 0.0005);

    const next = { ...region, latitudeDelta: newLatDelta, longitudeDelta: newLongDelta };
    setRegion(next);
    try {
      mapRef.current.animateToRegion(next, 300);
    } catch {
      /* ignore */
    }
  };

  const handleZoomOut = () => {
    if (!mapRef.current || !region) return;

    const newLatDelta = Math.min(region.latitudeDelta / ZOOM_FACTOR, 100);
    const newLongDelta = Math.min(region.longitudeDelta / ZOOM_FACTOR, 100);

    const next = { ...region, latitudeDelta: newLatDelta, longitudeDelta: newLongDelta };
    setRegion(next);
    try {
      mapRef.current.animateToRegion(next, 300);
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={styles.screen}>
      <MapView
        ref={(r) => (mapRef.current = r)}
        initialRegion={region}
        onRegionChangeComplete={(r) => setRegion(r)}
        mapType="standard"
        showsCompass={false}
        showsMyLocationButton={false}
        style={styles.map}
      >
        <UrlTile
          maximumZ={19}
          tileSize={256}
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {issues.map((issue) => (
          <Marker
            coordinate={{ latitude: issue.lat, longitude: issue.lng }}
            description={issue.category?.name ?? issue.city?.name ?? statusLabels[issue.status]}
            key={issue.id}
            title={issue.title}
          >
            <View style={[styles.marker, { backgroundColor: statusColors[issue.status] }]}>
              <View style={styles.markerCore} />
            </View>
          </Marker>
        ))
        .filter(() => !hideIssues)}

        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
            title="Менің орным"
          >
            <View style={styles.userLocationContainer}>
              <View style={styles.userLocationPulse} />
              <View style={styles.userLocationMarker}>
                {auth.user.avatarUrl ? (
                  <Image source={{ uri: `${env.apiUrl}${auth.user.avatarUrl}` }} style={styles.userLocationAvatar} />
                ) : (
                  <View style={styles.userLocationAvatarPlaceholder}>
                    <Text style={styles.userLocationAvatarText}>{auth.user.fullName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      <Pressable style={styles.profileButton} onPress={onProfilePress}>
        {auth.user.avatarUrl ? (
          <Image source={{ uri: `${env.apiUrl}${auth.user.avatarUrl}` }} style={styles.profileAvatar} resizeMode="cover" />
        ) : (
          <View style={styles.profileAvatarPlaceholder}>
            <Text style={styles.profileAvatarText}>{auth.user.fullName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </Pressable>

      <Pressable style={styles.toggleButton} onPress={() => setHideIssues(!hideIssues)}>
        <Ionicons name={hideIssues ? 'eye-off' : 'eye'} size={24} color={colors.accent} />
      </Pressable>

      <View style={styles.bottomButtons}>
        <Pressable style={styles.smallButton} onPress={handleResetHeading}>
          <Ionicons name="compass" size={20} color={colors.accent} />
        </Pressable>
        <Pressable style={[styles.smallButton, { marginTop: 10 }]} onPress={handleCenterOnUser}>
          <Ionicons name="locate" size={20} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.zoomControls}>
        <Pressable style={styles.smallButton} onPress={handleZoomIn}>
          <Ionicons name="add" size={20} color={colors.accent} />
        </Pressable>
        <Pressable style={[styles.smallButton, { marginTop: 10 }]} onPress={handleZoomOut}>
          <Ionicons name="remove" size={20} color={colors.accent} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Карта жүктеліп жатыр...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.statePanel}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={() => setReloadKey((current) => current + 1)} style={styles.retryButton}>
            <Text style={styles.retryText}>Қайталау</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  profileButton: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  toggleButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  profileAvatar: {
    width: '80%',
    height: '80%',
    borderRadius: 25,
  },
  profileAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityPill: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cityText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  legend: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  markerCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  statePanel: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  stateText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  retryButton: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  retryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  userLocationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    opacity: 0.3,
  },
  userLocationMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    overflow: 'hidden',
  },
  userLocationAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  userLocationAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationAvatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 18,
    right: 14,
    alignItems: 'center',
  },
  smallButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  zoomControls: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -55,
    alignItems: 'center',
  },
});
