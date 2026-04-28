import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';

import { env } from '../config/env';
import { AuthResult } from '../services/auth';
import {
  Category,
  City,
  District,
  IssueRequest,
  RequestMedia,
  RequestPriority,
  RequestStatus,
  addRequestComment,
  addRequestMedia,
  deleteRequest,
  getRequestDetail,
  listCategories,
  listCities,
  listDistricts,
  listRequests,
  updateRequest,
} from '../services/requests';
import { colors } from '../theme/colors';

type RequestsScreenProps = {
  auth: AuthResult;
};

const statusLabels: Record<RequestStatus, string> = {
  accepted: 'Жаңа',
  in_progress: 'Орындалуда',
  resolved: 'Шешілді',
};

const statusColors: Record<RequestStatus, string> = {
  accepted: '#dc2626',
  in_progress: '#ca8a04',
  resolved: '#15803d',
};

const priorityLabels: Record<RequestPriority, string> = {
  low: 'Төмен',
  medium: 'Орташа',
  high: 'Жоғары',
};

const priorityColors: Record<RequestPriority, string> = {
  low: '#15803d',
  medium: '#ca8a04',
  high: '#dc2626',
};

const formatDate = (value?: string) => {
  if (!value) return 'Көрсетілмеген';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('kk-KZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const DETAIL_HEADER_TOP_PADDING = (StatusBar.currentHeight ?? 0) + 28;
const REQUEST_PHOTO_LIMIT = 3;

type PickedPhoto = {
  uri: string;
  name: string;
  type: string;
};

const parseCoordinate = (value?: string | null, fallback = 51.1694) => {
  if (!value) return fallback;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildPhotoFile = (asset: ImagePicker.ImagePickerAsset): PickedPhoto => {
  const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  return {
    uri: asset.uri,
    name: `request-photo.${extension}`,
    type: asset.mimeType || (extension === 'png' ? 'image/png' : 'image/jpeg'),
  };
};

export function RequestsScreen({ auth }: RequestsScreenProps) {
  const [items, setItems] = React.useState<IssueRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [status, setStatus] = React.useState<RequestStatus | ''>('');
  const [categoryId, setCategoryId] = React.useState('');
  const [cityId, setCityId] = React.useState('');
  const [districtId, setDistrictId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [cities, setCities] = React.useState<City[]>([]);
  const [districts, setDistricts] = React.useState<District[]>([]);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<IssueRequest | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [mediaIndex, setMediaIndex] = React.useState(0);
  const [commentText, setCommentText] = React.useState('');
  const [commentBusy, setCommentBusy] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editPriority, setEditPriority] = React.useState<RequestPriority>('medium');
  const [editCategoryId, setEditCategoryId] = React.useState('');
  const [editCityId, setEditCityId] = React.useState('');
  const [editDistrictId, setEditDistrictId] = React.useState('');
  const [editDistricts, setEditDistricts] = React.useState<District[]>([]);
  const [editCoordinate, setEditCoordinate] = React.useState({ latitude: 51.1694, longitude: 71.4491 });
  const [editPhotos, setEditPhotos] = React.useState<PickedPhoto[]>([]);
  const [editBusy, setEditBusy] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    void Promise.all([
      listCategories(auth.accessToken).then(setCategories),
      listCities(auth.accessToken).then(setCities),
    ]).catch(() => undefined);
  }, [auth.accessToken]);

  React.useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      setDistrictId('');
      return;
    }

    void listDistricts(auth.accessToken, cityId)
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }, [auth.accessToken, cityId]);

  React.useEffect(() => {
    if (!editOpen || !editCityId) {
      setEditDistricts([]);
      return;
    }

    void listDistricts(auth.accessToken, editCityId)
      .then(setEditDistricts)
      .catch(() => setEditDistricts([]));
  }, [auth.accessToken, editCityId, editOpen]);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const result = await listRequests(auth.accessToken, {
          page,
          limit: 10,
          status,
          categoryId,
          cityId,
          districtId,
        });

        if (!active) return;
        setItems(result.items);
        setTotalPages(result.meta.totalPages || 1);
      } catch (error) {
        if (active) {
          Alert.alert('Қате', error instanceof Error ? error.message : 'Өтінімдерді жүктеу мүмкін болмады.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [auth.accessToken, categoryId, cityId, districtId, page, reloadKey, status]);

  const visibleItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.title, item.description, item.category?.name, item.city?.name, item.district?.name, item.organization?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [items, search]);

  const statusCounts = React.useMemo(
    () =>
      items.reduce<Record<RequestStatus, number>>(
        (acc, item) => {
          acc[item.status] += 1;
          return acc;
        },
        { accepted: 0, in_progress: 0, resolved: 0 },
      ),
    [items],
  );

  const openDetail = async (request: IssueRequest) => {
    setSelected(request);
    setMediaIndex(0);
    setCommentText('');
    setDetailLoading(true);
    try {
      setSelected(await getRequestDetail(auth.accessToken, request.id));
    } catch {
      setSelected(request);
    } finally {
      setDetailLoading(false);
    }
  };

  const media = selected?.media?.filter((item) => item.type === 'image') ?? [];
  const currentMedia = media[mediaIndex] ?? null;

  const submitComment = async () => {
    if (!selected || commentBusy || !commentText.trim()) return;
    setCommentBusy(true);
    try {
      const comment = await addRequestComment(auth.accessToken, selected.id, commentText.trim());
      setSelected((current) => (current ? { ...current, comments: [...(current.comments ?? []), comment] } : current));
      setCommentText('');
    } catch (error) {
      Alert.alert('Қате', error instanceof Error ? error.message : 'Комментарий жіберілмеді.');
    } finally {
      setCommentBusy(false);
    }
  };

  const openEdit = async (request: IssueRequest) => {
    let detail = request;

    try {
      detail = await getRequestDetail(auth.accessToken, request.id);
    } catch {
      detail = request;
    }

    setEditTitle(detail.title);
    setEditDescription(detail.description);
    setEditPriority(detail.priority ?? 'medium');
    setEditCategoryId(detail.categoryId ?? '');
    setEditCityId(detail.cityId ?? '');
    setEditDistrictId(detail.districtId ?? '');
    setEditCoordinate({
      latitude: parseCoordinate(detail.latitude, parseCoordinate(detail.city?.latitude, 51.1694)),
      longitude: parseCoordinate(detail.longitude, parseCoordinate(detail.city?.longitude, 71.4491)),
    });
    setEditPhotos([]);
    setSelected(detail);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditPhotos([]);
    setSelected(null);
  };

  const selectEditCity = (city: City) => {
    setEditCityId(city.id);
    setEditDistrictId('');
    setEditCoordinate({
      latitude: parseCoordinate(city.latitude, editCoordinate.latitude),
      longitude: parseCoordinate(city.longitude, editCoordinate.longitude),
    });
  };

  const pickEditPhotos = async () => {
    const currentMediaCount = selected?.media?.filter((item) => item.type === 'image' && !item.uploadedByOrganizationId).length ?? 0;
    const remaining = REQUEST_PHOTO_LIMIT - currentMediaCount - editPhotos.length;

    if (remaining <= 0) {
      Alert.alert('Фото', `Бір өтінімге максимум ${REQUEST_PHOTO_LIMIT} фото қосылады.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Рұқсат керек', 'Фото таңдау үшін галереяға рұқсат беріңіз.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      selectionLimit: remaining,
    });

    if (result.canceled) return;
    setEditPhotos((current) => [...current, ...result.assets.map(buildPhotoFile)].slice(0, Math.max(remaining + current.length, current.length)));
  };

  const saveEdit = async () => {
    if (!selected || editBusy) return;
    if (editTitle.trim().length < 4 || editDescription.trim().length < 10 || !editCategoryId || !editCityId) {
      Alert.alert('Қате', 'Тақырып, сипаттама, санат және қала толық толтырылуы керек.');
      return;
    }

    setEditBusy(true);
    try {
      await updateRequest(auth.accessToken, selected.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        categoryId: editCategoryId,
        cityId: editCityId,
        districtId: editDistrictId || null,
        latitude: editCoordinate.latitude.toFixed(6),
        longitude: editCoordinate.longitude.toFixed(6),
        priority: editPriority,
      });

      for (const photo of editPhotos) {
        try {
          await addRequestMedia(auth.accessToken, selected.id, photo);
        } catch {
          // Keep saving the request even if one media upload fails.
        }
      }

      setSelected(null);
      setEditOpen(false);
      setEditPhotos([]);
      setReloadKey((current) => current + 1);
    } catch (error) {
      Alert.alert('Қате', error instanceof Error ? error.message : 'Өтінімді сақтау мүмкін болмады.');
    } finally {
      setEditBusy(false);
    }
  };

  const confirmDelete = (request: IssueRequest) => {
    Alert.alert('Өшіру', 'Өтінімді өшіруді растайсыз ба?', [
      { text: 'Болдырмау', style: 'cancel' },
      {
        text: 'Өшіру',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRequest(auth.accessToken, request.id);
            if (selected?.id === request.id) setSelected(null);
            setReloadKey((current) => current + 1);
          } catch (error) {
            Alert.alert('Қате', error instanceof Error ? error.message : 'Өтінімді өшіру мүмкін болмады.');
          }
        },
      },
    ]);
  };

  const resetFilters = () => {
    setStatus('');
    setCategoryId('');
    setCityId('');
    setDistrictId('');
    setPage(1);
    setFilterOpen(false);
  };

  const editExistingPhotos = selected?.media?.filter((item) => item.type === 'image' && !item.uploadedByOrganizationId) ?? [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>AIQala</Text>
          <Text style={styles.title}>Өтінімдер</Text>
        </View>
        <Pressable style={styles.headerButton} onPress={() => setFilterOpen(true)}>
          <Ionicons name="options-outline" size={22} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Өтінімді іздеу" placeholderTextColor={colors.muted} style={styles.searchInput} />
      </View>

      <View style={styles.statusTabs}>
        <StatusChip label="Барлығы" value={items.length} active={!status} onPress={() => { setStatus(''); setPage(1); }} />
        <StatusChip label="Жаңа" value={statusCounts.accepted} active={status === 'accepted'} tone={statusColors.accepted} onPress={() => { setStatus('accepted'); setPage(1); }} />
        <StatusChip label="Жұмыста" value={statusCounts.in_progress} active={status === 'in_progress'} tone={statusColors.in_progress} onPress={() => { setStatus('in_progress'); setPage(1); }} />
        <StatusChip label="Шешілді" value={statusCounts.resolved} active={status === 'resolved'} tone={statusColors.resolved} onPress={() => { setStatus('resolved'); setPage(1); }} />
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Өтінімдер жүктелуде...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {visibleItems.map((request) => (
            <View style={styles.card} key={request.id}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.cardTitle}>{request.title}</Text>
                  <Text style={styles.cardMeta}>
                    {request.category?.name ?? 'Санат жоқ'} • {request.city?.name ?? 'Қала жоқ'}
                    {request.district?.name ? ` / ${request.district.name}` : ''}
                  </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: statusColors[request.status] }]} />
              </View>
              <Text style={styles.cardDescription} numberOfLines={2}>{request.description}</Text>
              <View style={styles.cardBadges}>
                <Badge label={statusLabels[request.status]} color={statusColors[request.status]} />
                {request.priority ? <Badge label={priorityLabels[request.priority]} color={priorityColors[request.priority]} /> : null}
              </View>
              <Text style={styles.cardFooter}>
                {request.organization?.name ? `Ұйым: ${request.organization.name}` : 'Тағайындалмаған'} • {formatDate(request.createdAt)}
              </Text>
              <View style={styles.cardActions}>
                <Pressable style={styles.secondaryAction} onPress={() => void openDetail(request)}>
                  <Ionicons name="eye-outline" size={17} color={colors.accent} />
                  <Text style={styles.secondaryActionText}>Толығырақ</Text>
                </Pressable>
                <Pressable style={styles.iconAction} onPress={() => void openEdit(request)}>
                  <Ionicons name="create-outline" size={18} color={colors.accent} />
                </Pressable>
                <Pressable style={styles.dangerIconAction} onPress={() => confirmDelete(request)}>
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                </Pressable>
              </View>
            </View>
          ))}
          {!visibleItems.length ? <Text style={styles.emptyText}>Өтінім табылмады</Text> : null}
        </ScrollView>
      )}

      <View style={styles.pagination}>
        <Pressable disabled={page <= 1} style={[styles.pageButton, page <= 1 && styles.disabled]} onPress={() => setPage((current) => Math.max(1, current - 1))}>
          <Ionicons name="chevron-back" size={18} color={colors.accent} />
        </Pressable>
        <Text style={styles.pageText}>{page} / {totalPages}</Text>
        <Pressable disabled={page >= totalPages} style={[styles.pageButton, page >= totalPages && styles.disabled]} onPress={() => setPage((current) => Math.min(totalPages, current + 1))}>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </Pressable>
      </View>

      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Сүзгілер</Text>
              <Pressable onPress={() => setFilterOpen(false)}><Ionicons name="close" size={22} color={colors.text} /></Pressable>
            </View>
            <ScrollView>
              <FilterGroup title="Статус">
                <Option label="Барлығы" active={!status} onPress={() => setStatus('')} />
                <Option label="Жаңа" active={status === 'accepted'} onPress={() => setStatus('accepted')} />
                <Option label="Орындалуда" active={status === 'in_progress'} onPress={() => setStatus('in_progress')} />
                <Option label="Шешілді" active={status === 'resolved'} onPress={() => setStatus('resolved')} />
              </FilterGroup>
              <FilterGroup title="Санат">
                <Option label="Барлығы" active={!categoryId} onPress={() => setCategoryId('')} />
                {categories.map((category) => <Option key={category.id} label={category.name} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />)}
              </FilterGroup>
              <FilterGroup title="Қала">
                <Option label="Барлығы" active={!cityId} onPress={() => setCityId('')} />
                {cities.map((city) => <Option key={city.id} label={city.name} active={cityId === city.id} onPress={() => setCityId(city.id)} />)}
              </FilterGroup>
              {cityId ? (
                <FilterGroup title="Аудан">
                  <Option label="Барлығы" active={!districtId} onPress={() => setDistrictId('')} />
                  {districts.map((district) => <Option key={district.id} label={district.name} active={districtId === district.id} onPress={() => setDistrictId(district.id)} />)}
                </FilterGroup>
              ) : null}
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable style={styles.clearButton} onPress={resetFilters}><Text style={styles.clearText}>Тазалау</Text></Pressable>
              <Pressable style={styles.applyButton} onPress={() => { setPage(1); setFilterOpen(false); }}><Text style={styles.applyText}>Қолдану</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selected) && !editOpen} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected ? (
          <RequestDetailModal
            commentBusy={commentBusy}
            commentText={commentText}
            currentMedia={currentMedia}
            detailLoading={detailLoading}
            mediaCount={media.length}
            mediaIndex={mediaIndex}
            onChangeComment={setCommentText}
            onClose={() => setSelected(null)}
            onEdit={() => void openEdit(selected)}
            onNextMedia={() => setMediaIndex((current) => (current + 1) % media.length)}
            onPreviousMedia={() => setMediaIndex((current) => (current - 1 + media.length) % media.length)}
            onSubmitComment={() => void submitComment()}
            request={selected}
          />
        ) : null}
      </Modal>

      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={closeEdit}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalAvoidingView}>
          <View style={styles.modalBackdrop}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Өтінімді өзгерту</Text>
                <Pressable onPress={closeEdit}><Ionicons name="close" size={22} color={colors.text} /></Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.editSheetContent} keyboardShouldPersistTaps="handled">
                <TextInput value={editTitle} onChangeText={setEditTitle} style={styles.editInput} placeholder="Тақырып" />
                <TextInput value={editDescription} onChangeText={setEditDescription} style={[styles.editInput, styles.editArea]} multiline placeholder="Сипаттама" />
                <Text style={styles.editLabel}>Санат</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editChipRow}>
                  {categories.map((category) => (
                    <Pressable
                      key={category.id}
                      onPress={() => setEditCategoryId(category.id)}
                      style={[styles.editChip, editCategoryId === category.id && styles.editChipActive]}
                    >
                      <Text style={[styles.editChipText, editCategoryId === category.id && styles.editChipTextActive]}>{category.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={styles.editLabel}>Қала</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editChipRow}>
                  {cities.map((city) => (
                    <Pressable
                      key={city.id}
                      onPress={() => selectEditCity(city)}
                      style={[styles.editChip, editCityId === city.id && styles.editChipActive]}
                    >
                      <Text style={[styles.editChipText, editCityId === city.id && styles.editChipTextActive]}>{city.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {editDistricts.length ? (
                  <>
                    <Text style={styles.editLabel}>Аудан</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editChipRow}>
                      <Pressable onPress={() => setEditDistrictId('')} style={[styles.editChip, !editDistrictId && styles.editChipActive]}>
                        <Text style={[styles.editChipText, !editDistrictId && styles.editChipTextActive]}>Таңдалмаған</Text>
                      </Pressable>
                      {editDistricts.map((district) => (
                        <Pressable
                          key={district.id}
                          onPress={() => setEditDistrictId(district.id)}
                          style={[styles.editChip, editDistrictId === district.id && styles.editChipActive]}
                        >
                          <Text style={[styles.editChipText, editDistrictId === district.id && styles.editChipTextActive]}>{district.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                ) : null}
                <Text style={styles.editLabel}>Орналасу нүктесі</Text>
                <View style={styles.editMapBox}>
                  <MapView
                    region={{
                      latitude: editCoordinate.latitude,
                      longitude: editCoordinate.longitude,
                      latitudeDelta: 0.03,
                      longitudeDelta: 0.03,
                    }}
                    onPress={(event) => setEditCoordinate(event.nativeEvent.coordinate)}
                    style={styles.editMap}
                  >
                    <UrlTile maximumZ={19} tileSize={256} urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker coordinate={editCoordinate} />
                  </MapView>
                </View>
                <Text style={styles.editCoordinateText}>{editCoordinate.latitude.toFixed(6)}, {editCoordinate.longitude.toFixed(6)}</Text>
                <View style={styles.priorityRow}>
                  {(['low', 'medium', 'high'] as RequestPriority[]).map((priority) => (
                    <Pressable key={priority} style={[styles.priorityButton, editPriority === priority && { backgroundColor: priorityColors[priority] }]} onPress={() => setEditPriority(priority)}>
                      <Text style={[styles.priorityText, editPriority === priority && { color: colors.white }]}>{priorityLabels[priority]}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.editPhotoHeader}>
                  <Text style={styles.editLabel}>Фото</Text>
                  <Text style={styles.editPhotoCounter}>{editExistingPhotos.length + editPhotos.length}/{REQUEST_PHOTO_LIMIT}</Text>
                </View>
                {editExistingPhotos.length ? (
                  <>
                    <Text style={styles.editPhotoSubLabel}>Қазіргі фото</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editPhotoRow}>
                      {editExistingPhotos.map((photo) => (
                        <View key={photo.id} style={styles.editPhotoPreview}>
                          <Image source={{ uri: `${env.apiUrl}${photo.fileUrl}` }} style={styles.editPhotoImage} />
                        </View>
                      ))}
                    </ScrollView>
                  </>
                ) : null}
                <Pressable style={styles.editPhotoButton} onPress={() => void pickEditPhotos()}>
                  <Ionicons name="image-outline" size={18} color={colors.accent} />
                  <Text style={styles.editPhotoButtonText}>Фото қосу</Text>
                </Pressable>
                {editPhotos.length ? (
                  <>
                    <Text style={styles.editPhotoSubLabel}>Жаңа фото</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editPhotoRow}>
                      {editPhotos.map((photo, index) => (
                        <View key={`${photo.uri}-${index}`} style={styles.editPhotoPreview}>
                          <Image source={{ uri: photo.uri }} style={styles.editPhotoImage} />
                          <Pressable onPress={() => setEditPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={styles.editPhotoRemove}>
                            <Ionicons name="close" size={14} color={colors.white} />
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  </>
                ) : null}
                <Pressable style={styles.applyButton} onPress={() => void saveEdit()}>
                  {editBusy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.applyText}>Сақтау</Text>}
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function RequestDetailModal({
  request,
  currentMedia,
  mediaIndex,
  mediaCount,
  detailLoading,
  commentText,
  commentBusy,
  onChangeComment,
  onClose,
  onEdit,
  onNextMedia,
  onPreviousMedia,
  onSubmitComment,
}: {
  request: IssueRequest;
  currentMedia: RequestMedia | null;
  mediaIndex: number;
  mediaCount: number;
  detailLoading: boolean;
  commentText: string;
  commentBusy: boolean;
  onChangeComment: (value: string) => void;
  onClose: () => void;
  onEdit: () => void;
  onNextMedia: () => void;
  onPreviousMedia: () => void;
  onSubmitComment: () => void;
}) {
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
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

  return (
    <View style={styles.detailScreen}>
      <View style={styles.detailHeader}>
        <Pressable style={styles.headerButton} onPress={onClose}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <Text style={styles.detailHeaderTitle}>Өтінім</Text>
        <Pressable style={styles.headerButton} onPress={onEdit}><Ionicons name="create-outline" size={21} color={colors.accent} /></Pressable>
      </View>
      {detailLoading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 10 }} /> : null}
      <ScrollView contentContainerStyle={[styles.detailContent, { paddingBottom: 170 + keyboardHeight }]} keyboardShouldPersistTaps="handled">
        <View style={styles.cardBadges}>
          <Badge label={statusLabels[request.status]} color={statusColors[request.status]} />
          {request.priority ? <Badge label={priorityLabels[request.priority]} color={priorityColors[request.priority]} /> : null}
        </View>
        <Text style={styles.detailTitle}>{request.title}</Text>
        {currentMedia ? (
          <View style={styles.detailPhotoWrap}>
            <Image source={{ uri: `${env.apiUrl}${currentMedia.fileUrl}` }} style={styles.detailPhoto} />
            {mediaCount > 1 ? (
              <View style={styles.detailPhotoNav}>
                <Pressable style={styles.pageButton} onPress={onPreviousMedia}><Ionicons name="chevron-back" size={18} color={colors.accent} /></Pressable>
                <Text style={styles.pageText}>{mediaIndex + 1} / {mediaCount}</Text>
                <Pressable style={styles.pageButton} onPress={onNextMedia}><Ionicons name="chevron-forward" size={18} color={colors.accent} /></Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.detailDescription}>{request.description}</Text>
        <InfoRow label="Санат" value={request.category?.name ?? 'Көрсетілмеген'} />
        <InfoRow label="Қала" value={`${request.city?.name ?? 'Көрсетілмеген'}${request.district?.name ? ` / ${request.district.name}` : ''}`} />
        <InfoRow label="Ұйым" value={request.organization?.name ?? 'Тағайындалмаған'} />
        <InfoRow label="Құрылған уақыты" value={formatDate(request.createdAt)} />
        <Text style={styles.commentTitle}>Комментарийлер</Text>
        {(request.comments ?? []).filter((comment) => comment.source !== 'chat').map((comment) => (
          <View style={styles.commentItem} key={comment.id}>
            <Text style={styles.commentAuthor}>{comment.authorOrganization?.name ?? comment.authorUser?.fullName ?? 'Белгісіз'}</Text>
            <Text style={styles.commentText}>{comment.text}</Text>
          </View>
        ))}
      </ScrollView>
      {keyboardHeight > 0 ? <View style={[styles.keyboardCover, { height: keyboardHeight + 92 }]} /> : null}
      <View style={[styles.commentComposer, { bottom: keyboardHeight + 8 }]}>
        <TextInput value={commentText} onChangeText={onChangeComment} style={styles.commentInput} placeholder="Комментарий жазу" multiline />
        <Pressable style={[styles.commentSend, (!commentText.trim() || commentBusy) && styles.disabled]} disabled={!commentText.trim() || commentBusy} onPress={onSubmitComment}>
          {commentBusy ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={18} color={colors.white} />}
        </Pressable>
      </View>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function StatusChip({ label, value, active, tone = colors.accent, onPress }: { label: string; value: number; active: boolean; tone?: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.statusChip, active && { borderColor: tone, backgroundColor: colors.accentSoft }]} onPress={onPress}>
      <Text style={[styles.statusChipLabel, active && { color: tone }]}>{label}</Text>
      <Text style={styles.statusChipValue}>{value}</Text>
    </Pressable>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterGroupTitle}>{title}</Text>
      <View style={styles.optionsWrap}>{children}</View>
    </View>
  );
}

function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.option, active && styles.optionActive]} onPress={onPress}>
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow2}>
      <Text style={styles.infoLabel2}>{label}</Text>
      <Text style={styles.infoValue2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 72, paddingHorizontal: 18, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  searchBox: { marginHorizontal: 18, minHeight: 46, borderRadius: 16, backgroundColor: colors.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: colors.text, fontWeight: '700' },
  statusTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 12 },
  statusChip: { flex: 1, minHeight: 58, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 8, justifyContent: 'center' },
  statusChipLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  statusChipValue: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: colors.muted, fontWeight: '700' },
  listContent: { paddingHorizontal: 18, paddingBottom: 18, gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 14 },
  cardHeader: { flexDirection: 'row', gap: 10 },
  cardTitleBlock: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  cardMeta: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  cardDescription: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 10 },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  badge: { minHeight: 24, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 9 },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  cardFooter: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  secondaryAction: { flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: colors.accentSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryActionText: { color: colors.accent, fontWeight: '900' },
  iconAction: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  dangerIconAction: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted, textAlign: 'center', fontWeight: '800', marginTop: 30 },
  pagination: { minHeight: 54, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  pageButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  pageText: { color: colors.text, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalAvoidingView: { flex: 1 },
  sheet: { maxHeight: '86%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.white, padding: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  filterGroup: { marginBottom: 16 },
  filterGroupTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: 8 },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 36, borderRadius: 13, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', paddingHorizontal: 12 },
  optionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  optionText: { color: colors.text, fontWeight: '800' },
  optionTextActive: { color: colors.white },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  clearButton: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  clearText: { color: colors.accent, fontWeight: '900' },
  applyButton: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: colors.white, fontWeight: '900' },
  detailScreen: { flex: 1, backgroundColor: colors.background },
  detailHeader: { minHeight: 64 + DETAIL_HEADER_TOP_PADDING, paddingTop: DETAIL_HEADER_TOP_PADDING, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  detailHeaderTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  detailContent: { padding: 18, paddingBottom: 100 },
  detailTitle: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '900', marginTop: 10 },
  detailDescription: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '600', marginVertical: 14 },
  detailPhotoWrap: { marginTop: 14 },
  detailPhoto: { width: '100%', height: 220, borderRadius: 18, backgroundColor: colors.accentSoft },
  detailPhotoNav: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  infoRow2: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 },
  infoLabel2: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  infoValue2: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 4 },
  commentTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 16, marginBottom: 10 },
  commentItem: { borderRadius: 14, backgroundColor: colors.accentSoft, padding: 10, marginBottom: 8 },
  commentAuthor: { color: colors.accent, fontSize: 12, fontWeight: '900', marginBottom: 4 },
  commentText: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  commentComposer: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 72, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12 },
  keyboardCover: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white },
  commentInput: { flex: 1, minHeight: 44, maxHeight: 96, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontWeight: '600' },
  commentSend: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  editInput: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, fontWeight: '700', marginBottom: 10 },
  editSheetContent: { paddingBottom: 18 },
  editArea: { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
  editLabel: { color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: 8 },
  editChipRow: { gap: 8, paddingRight: 18, marginBottom: 12 },
  editChip: {
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  editChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  editChipText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  editChipTextActive: { color: colors.white },
  editMapBox: { height: 210, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  editMap: { flex: 1 },
  editCoordinateText: { color: colors.muted, fontSize: 12, fontWeight: '800', marginBottom: 12 },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  priorityButton: { flex: 1, minHeight: 40, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  priorityText: { color: colors.accent, fontWeight: '900' },
  editPhotoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editPhotoCounter: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  editPhotoSubLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', marginBottom: 8 },
  editPhotoButton: {
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  editPhotoButtonText: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  editPhotoRow: { gap: 10, paddingRight: 18, marginBottom: 12 },
  editPhotoPreview: { width: 82, height: 82, borderRadius: 17, overflow: 'hidden', backgroundColor: colors.accentSoft },
  editPhotoImage: { width: '100%', height: '100%' },
  editPhotoRemove: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
});
