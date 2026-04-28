import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';

import { AuthResult } from '../services/auth';
import {
  Category,
  City,
  District,
  addRequestMedia,
  createRequest,
  listCategories,
  listCities,
  listDistricts,
} from '../services/requests';
import { colors } from '../theme/colors';

type CreateRequestScreenProps = {
  auth: AuthResult;
  onCreated?: () => void;
};

type PickedPhoto = {
  uri: string;
  name: string;
  type: string;
};

const DEFAULT_LATITUDE = 51.1694;
const DEFAULT_LONGITUDE = 71.4491;
const PHOTO_LIMIT = 3;

const parseCoordinate = (value?: string | null) => {
  if (!value) return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const buildPhotoFile = (asset: ImagePicker.ImagePickerAsset): PickedPhoto => {
  const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  return {
    uri: asset.uri,
    name: `request-photo.${extension}`,
    type: asset.mimeType || (extension === 'png' ? 'image/png' : 'image/jpeg'),
  };
};

export function CreateRequestScreen({ auth, onCreated }: CreateRequestScreenProps) {
  const [loading, setLoading] = React.useState(true);
  const [submitBusy, setSubmitBusy] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [cities, setCities] = React.useState<City[]>([]);
  const [districts, setDistricts] = React.useState<District[]>([]);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [cityId, setCityId] = React.useState('');
  const [districtId, setDistrictId] = React.useState('');
  const [coordinate, setCoordinate] = React.useState({
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
  });
  const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [categoryItems, cityItems] = await Promise.all([
          listCategories(auth.accessToken),
          listCities(auth.accessToken),
        ]);

        if (!active) return;
        setCategories(categoryItems);
        setCities(cityItems);

        const firstCity = cityItems[0];
        if (firstCity) {
          setCityId(firstCity.id);
          setCoordinate({
            latitude: parseCoordinate(firstCity.latitude) ?? DEFAULT_LATITUDE,
            longitude: parseCoordinate(firstCity.longitude) ?? DEFAULT_LONGITUDE,
          });
        }
      } catch (error) {
        Alert.alert('Қате', error instanceof Error ? error.message : 'Деректер жүктелмеді.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [auth.accessToken]);

  React.useEffect(() => {
    let active = true;

    const loadDistricts = async () => {
      setDistrictId('');
      if (!cityId) {
        setDistricts([]);
        return;
      }

      try {
        const districtItems = await listDistricts(auth.accessToken, cityId);
        if (active) setDistricts(districtItems);
      } catch {
        if (active) setDistricts([]);
      }
    };

    void loadDistricts();

    return () => {
      active = false;
    };
  }, [auth.accessToken, cityId]);

  const selectedCity = React.useMemo(() => cities.find((city) => city.id === cityId) ?? null, [cities, cityId]);

  const canSubmit =
    title.trim().length >= 4 &&
    description.trim().length >= 10 &&
    Boolean(categoryId) &&
    Boolean(cityId) &&
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    !submitBusy;

  const selectCity = (city: City) => {
    setCityId(city.id);
    setCoordinate({
      latitude: parseCoordinate(city.latitude) ?? coordinate.latitude,
      longitude: parseCoordinate(city.longitude) ?? coordinate.longitude,
    });
  };

  const centerOnUser = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Рұқсат керек', 'Орныңызды белгілеу үшін геолокацияға рұқсат беріңіз.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setCoordinate({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  };

  const pickPhotos = async () => {
    if (photos.length >= PHOTO_LIMIT) {
      Alert.alert('Фото', `Бір өтінімге максимум ${PHOTO_LIMIT} фото қосылады.`);
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
      selectionLimit: PHOTO_LIMIT - photos.length,
    });

    if (result.canceled) return;
    setPhotos((current) => [...current, ...result.assets.map(buildPhotoFile)].slice(0, PHOTO_LIMIT));
  };

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert('Өрістер толық емес', 'Тақырып, сипаттама, санат, қала және картадағы орын міндетті.');
      return;
    }

    setSubmitBusy(true);
    try {
      const request = await createRequest(auth.accessToken, {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        cityId,
        districtId: districtId || undefined,
        latitude: coordinate.latitude.toFixed(6),
        longitude: coordinate.longitude.toFixed(6),
      });

      let uploaded = 0;
      for (const photo of photos) {
        try {
          await addRequestMedia(auth.accessToken, request.id, photo);
          uploaded += 1;
        } catch {
          // Continue with the remaining photos.
        }
      }

      setTitle('');
      setDescription('');
      setCategoryId('');
      setDistrictId('');
      setPhotos([]);
      Alert.alert(
        'Өтінім жіберілді',
        uploaded < photos.length ? `Өтінім құрылды, бірақ фото ${uploaded}/${photos.length} жүктелді.` : 'Өтінім сәтті құрылды.',
      );
      onCreated?.();
    } catch (error) {
      Alert.alert('Қате', error instanceof Error ? error.message : 'Өтінімді жіберу мүмкін болмады.');
    } finally {
      setSubmitBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Құру беті жүктелуде...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Жаңа өтінім</Text>
        <Text style={styles.headerSubtitle}>Мәселені сипаттап, картадан орнын белгілеңіз.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Мәселе сипаттамасы</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Тақырып"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Сипаттама"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.textArea]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Санат</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setCategoryId(category.id)}
                style={[styles.chip, categoryId === category.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, categoryId === category.id && styles.chipTextActive]}>{category.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Қала</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {cities.map((city) => (
              <Pressable key={city.id} onPress={() => selectCity(city)} style={[styles.chip, cityId === city.id && styles.chipActive]}>
                <Text style={[styles.chipText, cityId === city.id && styles.chipTextActive]}>{city.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {districts.length ? (
            <>
              <Text style={styles.inlineLabel}>Аудан</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Pressable onPress={() => setDistrictId('')} style={[styles.chip, !districtId && styles.chipActive]}>
                  <Text style={[styles.chipText, !districtId && styles.chipTextActive]}>Таңдалмаған</Text>
                </Pressable>
                {districts.map((district) => (
                  <Pressable
                    key={district.id}
                    onPress={() => setDistrictId(district.id)}
                    style={[styles.chip, districtId === district.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, districtId === district.id && styles.chipTextActive]}>{district.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.mapHeader}>
            <Text style={styles.sectionTitle}>Орналасу нүктесі</Text>
            <Pressable onPress={() => void centerOnUser()} style={styles.locationButton}>
              <Ionicons name="locate-outline" size={17} color={colors.accent} />
              <Text style={styles.locationButtonText}>Менің орным</Text>
            </Pressable>
          </View>
          <View style={styles.mapBox}>
            <MapView
              region={{
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
              onPress={(event) => setCoordinate(event.nativeEvent.coordinate)}
              style={styles.map}
            >
              <UrlTile maximumZ={19} tileSize={256} urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker coordinate={coordinate} />
            </MapView>
          </View>
          <Text style={styles.coordinateText}>
            {selectedCity?.name ? `${selectedCity.name} • ` : ''}
            {coordinate.latitude.toFixed(6)}, {coordinate.longitude.toFixed(6)}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.mapHeader}>
            <Text style={styles.sectionTitle}>Фотолар</Text>
            <Text style={styles.photoLimit}>{photos.length}/{PHOTO_LIMIT}</Text>
          </View>
          <Pressable onPress={() => void pickPhotos()} style={styles.photoButton}>
            <Ionicons name="image-outline" size={18} color={colors.accent} />
            <Text style={styles.photoButtonText}>Фото таңдау</Text>
          </Pressable>
          {photos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {photos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`} style={styles.photoPreview}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <Pressable onPress={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={styles.photoRemove}>
                    <Ionicons name="close" size={14} color={colors.white} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable disabled={!canSubmit} onPress={() => void submit()} style={[styles.submitButton, !canSubmit && styles.disabled]}>
          {submitBusy ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={18} color={colors.white} />}
          <Text style={styles.submitText}>Жіберу</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: colors.muted, fontWeight: '800' },
  header: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 },
  headerTitle: { color: colors.text, fontSize: 28, fontWeight: '900' },
  headerSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 4 },
  content: { paddingHorizontal: 18, paddingBottom: 110, gap: 16 },
  section: { gap: 10 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
  },
  textArea: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' },
  chipRow: { gap: 8, paddingRight: 18 },
  chip: {
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  chipTextActive: { color: colors.white },
  inlineLabel: { color: colors.muted, fontSize: 13, fontWeight: '800', marginTop: 6 },
  mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  locationButton: { minHeight: 34, borderRadius: 13, backgroundColor: colors.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10 },
  locationButtonText: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  mapBox: { height: 230, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { flex: 1 },
  coordinateText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  photoLimit: { color: colors.accent, fontSize: 13, fontWeight: '900' },
  photoButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoButtonText: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  photoRow: { gap: 10, paddingRight: 18 },
  photoPreview: { width: 86, height: 86, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.accentSoft },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    padding: 12,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  submitText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.45 },
});
