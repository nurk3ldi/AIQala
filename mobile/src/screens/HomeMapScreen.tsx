import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';

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

  return (
    <View style={styles.screen}>
      <MapView
        initialRegion={DEFAULT_REGION}
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
        ))}
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
  profileAvatar: {
    width: '100%',
    height: '100%',
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
});
