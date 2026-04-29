import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';

import { env } from '../config/env';
import { AuthResult } from '../services/auth';
import { IssueRequest, RequestPriority, RequestStatus, addRequestComment, getRequestDetail, listMapRequests, enhanceDescription, sendAiChat } from '../services/requests';
import { ThemeColors, lightColors } from '../theme/colors';
import { AnimatedScreen } from '../components/AnimatedPrimitives';
import { useLanguage } from '../theme/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

type HomeMapScreenProps = {
  auth: AuthResult;
  onIssueDetailOpenChange?: (isOpen: boolean) => void;
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

type AIChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

const DEFAULT_REGION = {
  latitude: 48.0196,
  longitude: 66.9237,
  latitudeDelta: 28,
  longitudeDelta: 34,
};

const USER_REGION_DELTA = {
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

const PHOTO_VIEWER_CLOSE_TOP = (StatusBar.currentHeight ?? 0) + 40;

const statusColors: Record<RequestStatus, string> = {
  accepted: '#dc2626',
  in_progress: '#ca8a04',
  resolved: '#15803d',
};

const priorityColors: Record<RequestPriority, string> = {
  low: '#15803d',
  medium: '#ca8a04',
  high: '#dc2626',
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

const formatMapDistance = (latitudeDelta: number) => {
  const meters = Math.max(latitudeDelta * 111_320, 1);

  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }

  if (meters < 10_000) {
    return `${(meters / 1000).toFixed(1)} км`;
  }

  return `${Math.round(meters / 1000)} км`;
};

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('kk-KZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export function HomeMapScreen({ auth, onIssueDetailOpenChange, onProfilePress }: HomeMapScreenProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const colors = theme.colors;
  styles = createStyles(colors);
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [hideIssues, setHideIssues] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const distanceHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [region, setRegion] = useState<typeof DEFAULT_REGION>(DEFAULT_REGION);
  const [showDistance, setShowDistance] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<MapIssue | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<AIChatMessage[]>([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatBusy, setAiChatBusy] = useState(false);
  const aiChatScrollRef = useRef<ScrollView | null>(null);
  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulseValue, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [pulseValue]);

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
        // Keep the map usable when geolocation is unavailable.
        console.error('Location error:', err);
      }
    };

    void requestLocationPermission();
    
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userLocation || hasCenteredOnUserRef.current) {
      return;
    }

    const nextRegion = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      ...USER_REGION_DELTA,
    };

    hasCenteredOnUserRef.current = true;
    setRegion(nextRegion);

    requestAnimationFrame(() => {
      mapRef.current?.animateToRegion(nextRegion, 500);
    });
  }, [userLocation]);

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
          setError(loadError instanceof Error ? loadError.message : t('mapLoadFailed'));
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

  useEffect(
    () => () => {
      if (distanceHideTimerRef.current) {
        clearTimeout(distanceHideTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    onIssueDetailOpenChange?.(Boolean(selectedIssue) || isAIChatOpen);
  }, [onIssueDetailOpenChange, selectedIssue, isAIChatOpen]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
  const mapDistanceLabel = useMemo(() => formatMapDistance(region.latitudeDelta), [region.latitudeDelta]);

  const handleResetHeading = () => {
    if (!mapRef.current) return;
    const center = userLocation ?? { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude };
    const nextRegion = {
      latitude: center.latitude,
      longitude: center.longitude,
      ...(userLocation ? USER_REGION_DELTA : {
        latitudeDelta: DEFAULT_REGION.latitudeDelta,
        longitudeDelta: DEFAULT_REGION.longitudeDelta,
      }),
    };

    try {
      mapRef.current.animateCamera({ center, heading: 0 }, { duration: 500 });
    } catch (e) {
      // fallback: just animate to region
      mapRef.current.animateToRegion(nextRegion, 500);
    }

    if (userLocation) {
      setRegion(nextRegion);
      requestAnimationFrame(() => {
        mapRef.current?.animateToRegion(nextRegion, 500);
      });
    }
  };

  const handleCenterOnUser = () => {
    if (!mapRef.current || !userLocation) return;

    mapRef.current.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      ...USER_REGION_DELTA,
    }, 500);
  };

  const ZOOM_FACTOR = 0.5;

  const revealDistance = () => {
    setShowDistance(true);

    if (distanceHideTimerRef.current) {
      clearTimeout(distanceHideTimerRef.current);
    }

    distanceHideTimerRef.current = setTimeout(() => {
      setShowDistance(false);
      distanceHideTimerRef.current = null;
    }, 3000);
  };

  const handleZoomIn = () => {
    if (!mapRef.current || !region) return;

    const newLatDelta = Math.max(region.latitudeDelta * ZOOM_FACTOR, 0.0005);
    const newLongDelta = Math.max(region.longitudeDelta * ZOOM_FACTOR, 0.0005);

    const next = { ...region, latitudeDelta: newLatDelta, longitudeDelta: newLongDelta };
    setRegion(next);
    revealDistance();
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
    revealDistance();
    try {
      mapRef.current.animateToRegion(next, 300);
    } catch {
      /* ignore */
    }
  };

  const handleIssuePress = async (issue: MapIssue) => {
    setSelectedIssue(issue);
    setActiveMediaIndex(0);
    setCommentText('');
    setDetailLoading(true);

    try {
      const detail = await getRequestDetail(auth.accessToken, issue.id);
      const lat = parseCoordinate(detail.latitude);
      const lng = parseCoordinate(detail.longitude);

      setSelectedIssue((current) =>
        current?.id === issue.id
          ? {
              ...issue,
              ...detail,
              lat: lat ?? issue.lat,
              lng: lng ?? issue.lng,
            }
          : current,
      );
    } catch {
      setSelectedIssue(issue);
    } finally {
      setDetailLoading(false);
    }
  };

  const selectedIssueMedia = selectedIssue?.media?.filter((item) => item.type === 'image') ?? [];
  const currentMedia = selectedIssueMedia[activeMediaIndex] ?? null;
  const getStatusLabel = (value: RequestStatus) =>
    value === 'accepted' ? t('newIssue') : value === 'in_progress' ? t('inProgress') : t('resolved');
  const getPriorityLabel = (value: RequestPriority) =>
    value === 'low' ? t('low') : value === 'medium' ? t('medium') : t('high');

  const showPreviousMedia = () => {
    if (selectedIssueMedia.length <= 1) {
      return;
    }

    setActiveMediaIndex((current) => (current - 1 + selectedIssueMedia.length) % selectedIssueMedia.length);
  };

  const showNextMedia = () => {
    if (selectedIssueMedia.length <= 1) {
      return;
    }

    setActiveMediaIndex((current) => (current + 1) % selectedIssueMedia.length);
  };

  const closeIssuePanel = () => {
    setSelectedIssue(null);
    setIsPhotoViewerOpen(false);
    setCommentText('');
  };

  const submitComment = async () => {
    if (!selectedIssue || commentBusy) {
      return;
    }

    const nextText = commentText.trim();

    if (!nextText) {
      return;
    }

    setCommentBusy(true);

    try {
      const comment = await addRequestComment(auth.accessToken, selectedIssue.id, nextText);
      setSelectedIssue((current) =>
        current?.id === selectedIssue.id
          ? {
              ...current,
              comments: [...(current.comments ?? []), comment],
            }
          : current,
      );
      setCommentText('');
    } finally {
      setCommentBusy(false);
    }
  };

  const sendAiMessage = async () => {
    const text = aiChatInput.trim();
    if (!text || aiChatBusy) return;

    const userMessage: AIChatMessage = { id: `${Date.now()}-u`, text, isUser: true, timestamp: new Date() };
    setAiChatMessages((m) => [...m, userMessage]);
    setAiChatInput('');
    setAiChatBusy(true);

    try {
      const answer = await sendAiChat(auth.accessToken, text);
      const botMessage: AIChatMessage = { id: `${Date.now()}-b`, text: answer, isUser: false, timestamp: new Date() };
      setAiChatMessages((m) => [...m, botMessage]);
      // scroll to bottom after next frame
      requestAnimationFrame(() => aiChatScrollRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      const botMessage: AIChatMessage = { id: `${Date.now()}-err`, text: (err instanceof Error ? err.message : 'Қате болды'), isUser: false, timestamp: new Date() };
      setAiChatMessages((m) => [...m, botMessage]);
    } finally {
      setAiChatBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
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

        {!hideIssues
          ? issues.map((issue) => (
              <Marker
                coordinate={{ latitude: issue.lat, longitude: issue.lng }}
                key={issue.id}
                onPress={() => {
                  void handleIssuePress(issue);
                }}
                zIndex={1}
              >
                <View style={[styles.marker, { backgroundColor: statusColors[issue.status] }]}>
                  <View style={styles.markerCore} />
                </View>
              </Marker>
            ))
          : null}

        {userLocation && (
          <Marker
            identifier="user-location"
            coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
            key={`user-location-${hideIssues ? 'issues-hidden' : 'issues-visible'}`}
            tracksViewChanges
            title={t('myLocation')}
            zIndex={1000}
          >
            <View style={styles.userLocationContainer}>
              <Animated.View
                style={[
                  styles.userLocationPulse,
                  {
                    opacity: pulseValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.32, 0],
                    }),
                    transform: [
                      {
                        scale: pulseValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.65, 1.25],
                        }),
                      },
                    ],
                  },
                ]}
              />
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

      {!selectedIssue && !isAIChatOpen && (
        <Pressable style={styles.aiButton} onPress={() => { setIsAIChatOpen(true); closeIssuePanel(); }}>
          <Ionicons name="sparkles" size={24} color={colors.white} />
        </Pressable>
      )}

      <View style={styles.zoomControls}>
        <Pressable style={styles.zoomButton} onPress={handleZoomIn}>
          <Ionicons name="add" size={20} color={colors.accent} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable style={styles.zoomButton} onPress={handleZoomOut}>
          <Ionicons name="remove" size={20} color={colors.accent} />
        </Pressable>
      </View>

      {showDistance ? (
        <View style={styles.distanceIndicator}>
          <View style={styles.distanceLine} />
          <Text style={styles.distanceText}>{mapDistanceLabel}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>{t('mapLoading')}</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.statePanel}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={() => setReloadKey((current) => current + 1)} style={styles.retryButton}>
            <Text style={styles.retryText}>{t('retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {selectedIssue ? (
        <>
        {keyboardHeight > 0 ? <View style={[styles.keyboardGapCover, { height: keyboardHeight }]} /> : null}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
          pointerEvents="box-none"
          style={[styles.issuePanelAvoidingView, { bottom: keyboardHeight }]}
        >
        <AnimatedScreen distance={24} style={styles.issuePanel}>
          <View style={styles.issuePanelHandle} />
          <View style={styles.issuePanelHeader}>
            <View style={styles.issuePanelTitleBlock}>
              <View style={styles.issueBadges}>
                <View style={[styles.issueBadge, { backgroundColor: statusColors[selectedIssue.status] }]}>
                  <Text style={styles.issueBadgeText}>{getStatusLabel(selectedIssue.status)}</Text>
                </View>
                {selectedIssue.priority ? (
                  <View style={[styles.issueBadge, { backgroundColor: priorityColors[selectedIssue.priority] }]}>
                    <Text style={styles.issueBadgeText}>{getPriorityLabel(selectedIssue.priority)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.issueTitle} numberOfLines={2}>
                {selectedIssue.title}
              </Text>
            </View>
            <Pressable style={styles.issueCloseButton} onPress={closeIssuePanel}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {detailLoading ? (
            <View style={styles.issueLoadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.issueLoadingText}>{t('loadingInfo')}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} style={styles.issuePanelScroll}>
            {currentMedia ? (
              <View style={styles.issuePhotoWrap}>
                <Pressable onPress={() => setIsPhotoViewerOpen(true)}>
                  <Image source={{ uri: `${env.apiUrl}${currentMedia.fileUrl}` }} style={styles.issuePhoto} resizeMode="cover" />
                </Pressable>
                <View style={styles.issuePhotoToolbar}>
                  <Pressable style={styles.issuePhotoNavButton} onPress={showPreviousMedia} disabled={selectedIssueMedia.length <= 1}>
                    <Ionicons name="chevron-back" size={18} color={selectedIssueMedia.length > 1 ? colors.text : colors.muted} />
                  </Pressable>
                  <Pressable style={styles.issuePhotoCounter} onPress={() => setIsPhotoViewerOpen(true)}>
                    <Ionicons name="expand-outline" size={16} color={colors.accent} />
                    <Text style={styles.issuePhotoCounterText}>{activeMediaIndex + 1} / {selectedIssueMedia.length}</Text>
                  </Pressable>
                  <Pressable style={styles.issuePhotoNavButton} onPress={showNextMedia} disabled={selectedIssueMedia.length <= 1}>
                    <Ionicons name="chevron-forward" size={18} color={selectedIssueMedia.length > 1 ? colors.text : colors.muted} />
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Text style={styles.issueDescription}>{selectedIssue.description || t('noDescription')}</Text>

            <View style={styles.issueInfoGrid}>
              <IssueInfoItem icon="folder-open-outline" label={t('category')} value={selectedIssue.category?.name ?? t('notSpecified')} />
              <IssueInfoItem
                icon="location-outline"
                label={t('city')}
                value={`${selectedIssue.city?.name ?? t('notSpecified')}${selectedIssue.district?.name ? ` / ${selectedIssue.district.name}` : ''}`}
              />
              <IssueInfoItem icon="person-outline" label={t('issueOwner')} value={selectedIssue.requester?.fullName ?? t('notSpecified')} />
              <IssueInfoItem icon="business-outline" label={t('organization')} value={selectedIssue.organization?.name ?? t('notAssigned')} />
              <IssueInfoItem icon="calendar-outline" label={t('createdAt')} value={formatDate(selectedIssue.createdAt)} />
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.commentTitle}>{t('comments')}</Text>
              {(selectedIssue.comments ?? []).filter((comment) => comment.source !== 'chat').map((comment) => (
                <View style={styles.commentItem} key={comment.id}>
                  <Text style={styles.commentAuthor}>
                    {comment.authorOrganization?.name ?? comment.authorUser?.fullName ?? t('unknown')}
                  </Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              ))}
              <View style={styles.commentComposer}>
                <TextInput
                  multiline
                  onChangeText={setCommentText}
                  placeholder={t('commentPlaceholder')}
                  placeholderTextColor={colors.muted}
                  style={styles.commentInput}
                  value={commentText}
                />
                <Pressable
                  disabled={commentBusy || !commentText.trim()}
                  onPress={() => {
                    void submitComment();
                  }}
                  style={[styles.commentSendButton, (!commentText.trim() || commentBusy) && styles.commentSendButtonDisabled]}
                >
                  {commentBusy ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={18} color={colors.white} />}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </AnimatedScreen>
        </KeyboardAvoidingView>
        </>
      ) : null}

      {isAIChatOpen ? (
        <>
        {keyboardHeight > 0 && Platform.OS === 'ios' ? <View style={[styles.keyboardGapCover, { height: keyboardHeight }]} /> : null}
        <View style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: Platform.OS === 'ios' ? keyboardHeight : 0 }} pointerEvents="box-none">
          <AnimatedScreen distance={24} style={[styles.aiChatPanel, { flex: 1, maxHeight: undefined, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <View style={styles.issuePanelHandle} />
            <View style={styles.issuePanelHeader}>
              <View style={styles.issuePanelTitleBlock}>
                <Text style={styles.issueTitle}>AI Qala</Text>
              </View>
              <Pressable style={styles.issueCloseButton} onPress={() => setIsAIChatOpen(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView 
              ref={aiChatScrollRef}
              showsVerticalScrollIndicator={false} 
              style={styles.aiChatScroll}
              contentContainerStyle={styles.aiChatScrollContent}
            >
              {aiChatMessages.length === 0 ? (
                <Text style={styles.aiEmptyText}>Қала бойынша немесе мәселелер туралы сұрақтарыңызды қойыңыз.</Text>
              ) : null}
              {aiChatMessages.map(msg => (
                <View key={msg.id} style={[styles.aiMessageRow, msg.isUser ? styles.aiMessageRowUser : styles.aiMessageRowBot]}>
                  <View style={[styles.aiMessageBubble, msg.isUser ? styles.aiMessageBubbleUser : styles.aiMessageBubbleBot]}>
                    <Text style={[styles.aiMessageText, msg.isUser ? styles.aiMessageTextUser : styles.aiMessageTextBot]}>
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}
              {aiChatBusy && (
                <View style={[styles.aiMessageRow, styles.aiMessageRowBot]}>
                  <View style={[styles.aiMessageBubble, styles.aiMessageBubbleBot]}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.commentComposer}>
              <TextInput
                multiline
                onChangeText={setAiChatInput}
                placeholder="Сұрағыңызды жазыңыз..."
                placeholderTextColor={colors.muted}
                style={styles.commentInput}
                value={aiChatInput}
              />
              <Pressable
                disabled={aiChatBusy || !aiChatInput.trim()}
                onPress={sendAiMessage}
                style={[styles.commentSendButton, (!aiChatInput.trim() || aiChatBusy) && styles.commentSendButtonDisabled]}
              >
                {aiChatBusy ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={18} color={colors.white} />}
              </Pressable>
            </View>
          </AnimatedScreen>
        </View>
        </>
      ) : null}

      <Modal visible={isPhotoViewerOpen && Boolean(currentMedia)} transparent animationType="fade" onRequestClose={() => setIsPhotoViewerOpen(false)}>
        <View style={styles.photoViewer}>
          <Pressable style={styles.photoViewerClose} onPress={() => setIsPhotoViewerOpen(false)}>
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>
          {currentMedia ? (
            <Image source={{ uri: `${env.apiUrl}${currentMedia.fileUrl}` }} style={styles.photoViewerImage} resizeMode="contain" />
          ) : null}
          {selectedIssueMedia.length > 1 ? (
            <View style={styles.photoViewerNav}>
              <Pressable style={styles.photoViewerNavButton} onPress={showPreviousMedia}>
                <Ionicons name="chevron-back" size={26} color={colors.white} />
              </Pressable>
              <Text style={styles.photoViewerCounter}>{activeMediaIndex + 1} / {selectedIssueMedia.length}</Text>
              <Pressable style={styles.photoViewerNavButton} onPress={showNextMedia}>
                <Ionicons name="chevron-forward" size={26} color={colors.white} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function IssueInfoItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  styles = createStyles(colors);

  return (
    <View style={styles.issueInfoItem}>
      <View style={styles.issueInfoIcon}>
        <Ionicons name={icon} size={16} color={colors.accent} />
      </View>
      <View style={styles.issueInfoCopy}>
        <Text style={styles.issueInfoLabel}>{label}</Text>
        <Text style={styles.issueInfoValue}>{value}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
  },
  statePanel: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.surface,
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
  aiButton: {
    position: 'absolute',
    bottom: 18,
    left: 14,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
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
    backgroundColor: colors.surface,
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
    marginTop: -51,
    alignItems: 'center',
    width: 50,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  zoomButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
  },
  distanceIndicator: {
    position: 'absolute',
    left: 10,
    top: '50%',
    marginTop: -24,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceLine: {
    width: 3,
    height: 48,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginRight: 8,
  },
  distanceText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  issuePanel: {
    width: '100%',
    maxHeight: '68%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  issuePanelAvoidingView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  keyboardGapCover: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
  },
  issuePanelHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  issuePanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  issuePanelTitleBlock: {
    flex: 1,
  },
  issueBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 8,
  },
  issueBadge: {
    minHeight: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  issueBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  issueTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  issueCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueLoadingRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueLoadingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  issuePanelScroll: {
    marginTop: 10,
  },
  issuePhoto: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
  },
  issuePhotoWrap: {
    marginBottom: 12,
  },
  issuePhotoToolbar: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  issuePhotoNavButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issuePhotoCounter: {
    minHeight: 34,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  issuePhotoCounterText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  issueDescription: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 14,
  },
  issueInfoGrid: {
    gap: 10,
    paddingBottom: 4,
  },
  issueInfoItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  issueInfoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueInfoCopy: {
    flex: 1,
    paddingTop: 1,
  },
  issueInfoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  issueInfoValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    marginTop: 2,
  },
  commentSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 8,
  },
  commentTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  commentItem: {
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    padding: 10,
    marginBottom: 8,
  },
  commentAuthor: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  commentText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: colors.surface,
  },
  commentSendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendButtonDisabled: {
    opacity: 0.5,
  },
  photoViewer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerImage: {
    width: '100%',
    height: '78%',
  },
  photoViewerClose: {
    position: 'absolute',
    top: PHOTO_VIEWER_CLOSE_TOP,
    right: 18,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerNav: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoViewerNavButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerCounter: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  aiChatPanel: {
    width: '100%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  aiChatScroll: {
    flex: 1,
    marginTop: 10,
    marginBottom: 10,
  },
  aiChatScrollContent: {
    paddingBottom: 20,
    gap: 12,
  },
  aiEmptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  aiMessageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  aiMessageRowUser: {
    justifyContent: 'flex-end',
  },
  aiMessageRowBot: {
    justifyContent: 'flex-start',
  },
  aiMessageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  aiMessageBubbleUser: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  aiMessageBubbleBot: {
    backgroundColor: colors.accentSoft,
    borderBottomLeftRadius: 4,
  },
  aiMessageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiMessageTextUser: {
    color: colors.white,
  },
  aiMessageTextBot: {
    color: colors.text,
  },
});

let styles = createStyles(lightColors);
