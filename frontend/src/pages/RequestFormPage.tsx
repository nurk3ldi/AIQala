import { ArrowLeft, ChevronLeft, ChevronRight, Expand, ImagePlus, Trash2, X } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import type { AppShellOutletContext } from '../components/layout/AppShellBare';
import { Button } from '../components/ui/Button';
import { InputField, SelectField, TextareaField } from '../components/ui/Fields';
import { LoadingState } from '../components/ui/LoadingState';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import type { Category, District } from '../types/api';

const REQUEST_PHOTO_LIMIT = 3;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_LATITUDE = '51.1694';
const DEFAULT_LONGITUDE = '71.4491';
const CREATE_MAP_PICKER_ZOOM = 13;

const normalizeCoordinate = (value: string) => value.trim().replace(',', '.');

const parseCoordinate = (value: string) => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(normalizeCoordinate(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const cityCoordinate = (value: string | null | undefined, fallback: string) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return normalizeCoordinate(String(value));
};

const CreateMapViewportSync = ({ latitude, longitude }: { latitude: number | null; longitude: number | null }) => {
  const map = useMap();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();

      if (latitude !== null && longitude !== null) {
        map.setView([latitude, longitude], Math.max(map.getZoom(), CREATE_MAP_PICKER_ZOOM), { animate: false });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [latitude, longitude, map]);

  return null;
};

const CreateMapCoordinateEvents = ({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) => {
  useMapEvents({
    click: (event) => {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
};

const CREATE_PAGE_COPY = {
  kk: {
    title: 'Жаңа өтінім',
    subtitle: 'Тек маңызды өрістерді толтырыңыз да, өтінімді жіберіңіз.',
    details: 'Мәселе сипаттамасы',
    classify: 'Санат және орын',
    location: 'Орналасу нүктесі',
    photos: 'Фотолар',
    photosHint: 'Міндетті емес, максимум 3 фото.',
    noDistrict: 'Аудан таңдалмаған',
    cityCenter: 'Қала центрін қою',
    back: 'Қайту',
    submit: 'Жіберу',
    pickFiles: 'Файл таңдау',
    mapHint: 'Картадан мәселе орнын белгілеңіз.',
    previousPhoto: 'Алдыңғы фото',
    nextPhoto: 'Келесі фото',
    openPhoto: 'Толық ашу',
    closePhoto: 'Жабу',
    photoIndex: 'Фото {current}/{total}',
    confirmPoint: 'Нүктені растау',
    pointSelected: 'Таңдалды: {latitude}, {longitude}',
    pointPending: 'Алдымен картадан нүктені таңдаңыз.',
    confirmSelectedPoint: 'Картадан таңдалған нүктені растау батырмасымен бекітіңіз.',
    invalidPhotoType: 'Тек JPG, PNG, WEBP форматтары қолданылады.',
    photoLimit: 'Бір өтінімге максимум 3 фото қосылады.',
    coordsInvalid: 'Координатаны дұрыс енгізіңіз.',
    validationTitle: 'Өрістер толық емес',
    validationDescription: 'Тақырып, сипаттама, санат, қала және координата міндетті.',
    uploadPartialTitle: 'Өтінім жіберілді, бірақ кей фото жүктелмеді',
    uploadPartialDescription: 'Фото саны: {uploaded}/{total}',
  },
  ru: {
    title: 'Новая заявка',
    subtitle: 'Заполните только важные поля и отправьте заявку.',
    details: 'Описание проблемы',
    classify: 'Категория и место',
    location: 'Точка на карте',
    photos: 'Фото',
    photosHint: 'Необязательно, максимум 3 фото.',
    noDistrict: 'Район не выбран',
    cityCenter: 'Поставить центр города',
    back: 'Назад',
    submit: 'Отправить',
    pickFiles: 'Выбрать файл',
    mapHint: 'Отметьте место проблемы на карте.',
    previousPhoto: 'Предыдущее фото',
    nextPhoto: 'Следующее фото',
    openPhoto: 'Открыть полностью',
    closePhoto: 'Закрыть',
    photoIndex: 'Фото {current}/{total}',
    confirmPoint: 'Подтвердить точку',
    pointSelected: 'Выбрано: {latitude}, {longitude}',
    pointPending: 'Сначала выберите точку на карте.',
    confirmSelectedPoint: 'Подтвердите выбранную на карте точку кнопкой подтверждения.',
    invalidPhotoType: 'Поддерживаются только JPG, PNG, WEBP.',
    photoLimit: 'Максимум 3 фото для одной заявки.',
    coordsInvalid: 'Проверьте корректность координат.',
    validationTitle: 'Поля заполнены не полностью',
    validationDescription: 'Заголовок, описание, категория, город и координаты обязательны.',
    uploadPartialTitle: 'Заявка отправлена, но часть фото не загрузилась',
    uploadPartialDescription: 'Фото: {uploaded}/{total}',
  },
  en: {
    title: 'New request',
    subtitle: 'Fill only essential fields and submit.',
    details: 'Issue details',
    classify: 'Category and place',
    location: 'Location point',
    photos: 'Photos',
    photosHint: 'Optional, up to 3 photos.',
    noDistrict: 'No district selected',
    cityCenter: 'Use city center',
    back: 'Back',
    submit: 'Submit',
    pickFiles: 'Choose file',
    mapHint: 'Mark issue location on the map.',
    previousPhoto: 'Previous photo',
    nextPhoto: 'Next photo',
    openPhoto: 'Open full size',
    closePhoto: 'Close',
    photoIndex: 'Photo {current}/{total}',
    confirmPoint: 'Confirm point',
    pointSelected: 'Selected: {latitude}, {longitude}',
    pointPending: 'Select a point on the map first.',
    confirmSelectedPoint: 'Confirm the point selected on the map before submitting.',
    invalidPhotoType: 'Only JPG, PNG, WEBP files are supported.',
    photoLimit: 'Maximum 3 photos per request.',
    coordsInvalid: 'Please check coordinate values.',
    validationTitle: 'Required fields are missing',
    validationDescription: 'Title, description, category, city, and coordinates are required.',
    uploadPartialTitle: 'Request was submitted but some photos failed',
    uploadPartialDescription: 'Photos: {uploaded}/{total}',
  },
} as const;

export const RequestFormPage = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { pushToast } = useToast();
  const { cities, selectedCityId } = useOutletContext<AppShellOutletContext>();
  const copy = CREATE_PAGE_COPY[language];
  const photoLimitText = copy.photoLimit.replace(/\d+/, String(REQUEST_PHOTO_LIMIT));

  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [pendingCreateCoordinates, setPendingCreateCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    cityId: '',
    districtId: '',
    latitude: '',
    longitude: '',
  });

  const photoUrls = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);

  useEffect(
    () => () => {
      photoUrls.forEach((url) => URL.revokeObjectURL(url));
    },
    [photoUrls],
  );

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      setLoading(true);

      try {
        const categoryItems = await api.categories.list();

        if (!active) {
          return;
        }

        setCategories(categoryItems);
      } catch (error) {
        if (active) {
          pushToast({
            tone: 'error',
            title: t('requestForm.loadFailed'),
            description: getErrorMessage(error),
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      active = false;
    };
  }, [pushToast, t]);

  useEffect(() => {
    if (!selectedCityId || form.cityId || cities.length === 0) {
      return;
    }

    const selectedCity = cities.find((city) => city.id === selectedCityId);

    if (!selectedCity) {
      return;
    }

    setForm((current) => ({
      ...current,
      cityId: selectedCity.id,
      latitude: cityCoordinate(selectedCity.latitude, DEFAULT_LATITUDE),
      longitude: cityCoordinate(selectedCity.longitude, DEFAULT_LONGITUDE),
    }));
  }, [cities, form.cityId, selectedCityId]);

  useEffect(() => {
    let active = true;

    const loadDistricts = async () => {
      if (!form.cityId) {
        setDistricts([]);
        setForm((current) => (current.districtId ? { ...current, districtId: '' } : current));
        return;
      }

      try {
        const districtItems = await api.locations.districts.list({ cityId: form.cityId });

        if (!active) {
          return;
        }

        setDistricts(districtItems);
      } catch {
        if (active) {
          setDistricts([]);
        }
      }
    };

    void loadDistricts();

    return () => {
      active = false;
    };
  }, [form.cityId]);

  const selectedCity = useMemo(() => cities.find((city) => city.id === form.cityId) ?? null, [cities, form.cityId]);

  const latitudeNumber = parseCoordinate(form.latitude);
  const longitudeNumber = parseCoordinate(form.longitude);
  const selectedCityLatitude = selectedCity ? parseCoordinate(cityCoordinate(selectedCity.latitude, DEFAULT_LATITUDE)) : null;
  const selectedCityLongitude = selectedCity ? parseCoordinate(cityCoordinate(selectedCity.longitude, DEFAULT_LONGITUDE)) : null;
  const mapCenterLatitude = latitudeNumber ?? selectedCityLatitude ?? parseCoordinate(DEFAULT_LATITUDE) ?? 51.1694;
  const mapCenterLongitude = longitudeNumber ?? selectedCityLongitude ?? parseCoordinate(DEFAULT_LONGITUDE) ?? 71.4491;
  const mapCenter: [number, number] = [mapCenterLatitude, mapCenterLongitude];
  const hasValidCoordinates =
    latitudeNumber !== null &&
    longitudeNumber !== null &&
    latitudeNumber >= -90 &&
    latitudeNumber <= 90 &&
    longitudeNumber >= -180 &&
    longitudeNumber <= 180;

  const canSubmit =
    form.title.trim().length >= 4 &&
    form.description.trim().length >= 10 &&
    Boolean(form.categoryId) &&
    Boolean(form.cityId) &&
    hasValidCoordinates &&
    !pendingCreateCoordinates;

  const currentPhotoIndex = photos.length > 0 ? Math.min(activePhotoIndex, photos.length - 1) : 0;
  const currentPhotoUrl = photos.length > 0 ? photoUrls[currentPhotoIndex] : null;
  const currentPhoto = photos.length > 0 ? photos[currentPhotoIndex] : null;
  const currentPhotoCounter = copy.photoIndex
    .replace('{current}', String(photos.length > 0 ? currentPhotoIndex + 1 : 0))
    .replace('{total}', String(photos.length));
  const mapSelectionPendingText = pendingCreateCoordinates
    ? copy.pointSelected
        .replace('{latitude}', pendingCreateCoordinates.latitude.toFixed(6))
        .replace('{longitude}', pendingCreateCoordinates.longitude.toFixed(6))
    : copy.pointPending;

  useEffect(() => {
    if (photos.length === 0) {
      setActivePhotoIndex(0);
      setPhotoPreviewOpen(false);
      return;
    }

    setActivePhotoIndex((current) => Math.min(current, photos.length - 1));
  }, [photos.length]);

  const handleCityChange = (cityId: string) => {
    const city = cities.find((item) => item.id === cityId) ?? null;

    setPendingCreateCoordinates(null);
    setForm((current) => ({
      ...current,
      cityId,
      districtId: '',
      latitude: city ? cityCoordinate(city.latitude, current.latitude || DEFAULT_LATITUDE) : current.latitude,
      longitude: city ? cityCoordinate(city.longitude, current.longitude || DEFAULT_LONGITUDE) : current.longitude,
    }));
  };

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    const validFiles = nextFiles.filter((file) => ALLOWED_PHOTO_TYPES.has(file.type));

    if (validFiles.length !== nextFiles.length) {
      pushToast({
        tone: 'error',
        title: copy.photos,
        description: copy.invalidPhotoType,
      });
    }

    setPhotos((current) => {
      const combined = [...current, ...validFiles];

      if (combined.length > REQUEST_PHOTO_LIMIT) {
        pushToast({
          tone: 'error',
          title: copy.photos,
          description: photoLimitText,
        });
      }

      return combined.slice(0, REQUEST_PHOTO_LIMIT);
    });

    event.currentTarget.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const movePhoto = (direction: 'prev' | 'next') => {
    if (photos.length <= 1) {
      return;
    }

    setActivePhotoIndex((current) => {
      if (direction === 'prev') {
        return (current - 1 + photos.length) % photos.length;
      }

      return (current + 1) % photos.length;
    });
  };

  const confirmMapSelection = () => {
    if (!pendingCreateCoordinates) {
      return;
    }

    setForm((current) => ({
      ...current,
      latitude: pendingCreateCoordinates.latitude.toFixed(6),
      longitude: pendingCreateCoordinates.longitude.toFixed(6),
    }));
    setPendingCreateCoordinates(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pendingCreateCoordinates) {
      pushToast({
        tone: 'error',
        title: copy.location,
        description: copy.confirmSelectedPoint,
      });
      return;
    }

    if (!canSubmit) {
      pushToast({
        tone: 'error',
        title: copy.validationTitle,
        description: copy.validationDescription,
      });
      return;
    }

    if (!hasValidCoordinates) {
      pushToast({
        tone: 'error',
        title: copy.location,
        description: copy.coordsInvalid,
      });
      return;
    }

    setSubmitBusy(true);

    try {
      const result = await api.requests.create({
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        cityId: form.cityId,
        districtId: form.districtId || undefined,
        latitude: normalizeCoordinate(form.latitude),
        longitude: normalizeCoordinate(form.longitude),
      });

      let uploaded = 0;

      for (const photo of photos) {
        try {
          await api.requests.addMedia(result.id, photo);
          uploaded += 1;
        } catch {
          // Keep submitting other photos even if one upload fails.
        }
      }

      pushToast({
        tone: 'success',
        title: t('requestForm.submitSuccessTitle'),
        description: t('requestForm.submitSuccessDescription'),
      });

      if (uploaded < photos.length) {
        pushToast({
          tone: 'info',
          title: copy.uploadPartialTitle,
          description: copy.uploadPartialDescription
            .replace('{uploaded}', String(uploaded))
            .replace('{total}', String(photos.length)),
        });
      }

      navigate(`/requests/${result.id}`);
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestForm.submitFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitBusy(false);
    }
  };

  if (loading) {
    return <LoadingState label={t('requestForm.loading')} />;
  }

  return (
    <div className="page request-create-minimal">
      <header className="request-create-minimal__hero">
        <div className="request-create-minimal__hero-copy">
          <strong>{copy.title}</strong>
        </div>
        <Button type="button" variant="secondary" className="request-create-minimal__back-button" onClick={() => navigate('/requests')}>
          <ArrowLeft size={15} />
          {copy.back}
        </Button>
      </header>

      <form className="request-create-minimal__form" onSubmit={submit}>
        <section className="request-create-minimal__section">
          <h3>{copy.details}</h3>
          <div className="request-create-minimal__grid">
            <InputField
              label={t('common.title')}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
              minLength={4}
            />
          </div>
          <TextareaField
            label={t('common.description')}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            required
            minLength={10}
          />
        </section>

        <section className="request-create-minimal__section">
          <h3>{copy.classify}</h3>
          <div className="request-create-minimal__grid">
            <SelectField
              label={t('common.category')}
              value={form.categoryId}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
              required
            >
              <option value="">{t('requestForm.chooseCategory')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>

            <SelectField label={t('common.city')} value={form.cityId} onChange={(event) => handleCityChange(event.target.value)} required>
              <option value="">{t('requestForm.chooseCity')}</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              label={t('common.district')}
              value={form.districtId}
              onChange={(event) => setForm((current) => ({ ...current, districtId: event.target.value }))}
              disabled={!form.cityId}
            >
              <option value="">{copy.noDistrict}</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </SelectField>
          </div>
        </section>

        <section className="request-create-minimal__section">
          <h3>{copy.location}</h3>
          <div className="request-create-map__viewport request-create-minimal__map-viewport">
            <MapContainer
              center={mapCenter}
              zoom={hasValidCoordinates ? CREATE_MAP_PICKER_ZOOM : 11}
              scrollWheelZoom
              className="request-create-map__leaflet"
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <CreateMapViewportSync latitude={mapCenterLatitude} longitude={mapCenterLongitude} />
              <CreateMapCoordinateEvents
                onSelect={(latitude, longitude) => setPendingCreateCoordinates({ latitude, longitude })}
              />
              {hasValidCoordinates ? (
                <CircleMarker
                  center={[latitudeNumber, longitudeNumber]}
                  radius={7}
                  pathOptions={{
                    color: '#0f172a',
                    weight: 2,
                    fillColor: '#facc15',
                    fillOpacity: 0.92,
                  }}
                />
              ) : null}
              {pendingCreateCoordinates ? (
                <>
                  <CircleMarker
                    center={[pendingCreateCoordinates.latitude, pendingCreateCoordinates.longitude]}
                    radius={11}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 2,
                      fillColor: 'transparent',
                      fillOpacity: 0,
                      dashArray: '4 4',
                    }}
                  />
                  <CircleMarker
                    center={[pendingCreateCoordinates.latitude, pendingCreateCoordinates.longitude]}
                    radius={5}
                    pathOptions={{
                      color: '#facc15',
                      weight: 2,
                      fillColor: '#0f172a',
                      fillOpacity: 0.95,
                    }}
                  />
                </>
              ) : null}
            </MapContainer>
          </div>
          <div className="request-create-minimal__map-actions">
            <span className="request-create-minimal__map-selection">{mapSelectionPendingText}</span>
            <Button type="button" variant="secondary" onClick={confirmMapSelection} disabled={!pendingCreateCoordinates}>
              {copy.confirmPoint}
            </Button>
          </div>
        </section>

        <section className="request-create-minimal__section">
          <input
            ref={photoInputRef}
            className="request-create-minimal__file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handlePhotoSelect}
          />
          <div className="request-create-minimal__file-row">
            <button
              type="button"
              className="request-create-minimal__file-button"
              onClick={() => photoInputRef.current?.click()}
            >
              {copy.pickFiles}
            </button>
          </div>
          {currentPhoto && currentPhotoUrl ? (
            <div className="request-create-minimal__photo-carousel">
              <div className="request-create-minimal__photo-stage">
                <img src={currentPhotoUrl} alt={currentPhoto.name} />
                <button
                  type="button"
                  className="request-create-minimal__photo-remove"
                  onClick={() => removePhoto(currentPhotoIndex)}
                  aria-label={t('common.remove')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="request-create-minimal__photo-toolbar">
                <button
                  type="button"
                  className="request-create-minimal__photo-nav"
                  onClick={() => movePhoto('prev')}
                  aria-label={copy.previousPhoto}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="request-create-minimal__photo-counter">{currentPhotoCounter}</span>
                <button
                  type="button"
                  className="request-create-minimal__photo-nav"
                  onClick={() => movePhoto('next')}
                  aria-label={copy.nextPhoto}
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="request-create-minimal__photo-open"
                  onClick={() => setPhotoPreviewOpen(true)}
                  aria-label={copy.openPhoto}
                >
                  <Expand size={15} />
                  {copy.openPhoto}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div className="request-create-minimal__actions">
          <Button type="button" variant="ghost" onClick={() => navigate('/requests')}>
            {copy.back}
          </Button>
          <Button type="submit" busy={submitBusy} disabled={!canSubmit}>
            <ImagePlus size={15} />
            {copy.submit}
          </Button>
        </div>
      </form>

      {photoPreviewOpen && currentPhoto && currentPhotoUrl && typeof document !== 'undefined'
        ? createPortal(
            <div className="profile-modal request-create-photo-modal" role="dialog" aria-modal="true" aria-label={copy.openPhoto}>
              <button
                type="button"
                className="profile-modal__backdrop"
                aria-label={copy.closePhoto}
                onClick={() => setPhotoPreviewOpen(false)}
              />
              <article className="profile-modal__card glass-card request-create-photo-modal__card">
                <button type="button" className="profile-modal__close" onClick={() => setPhotoPreviewOpen(false)} aria-label={copy.closePhoto}>
                  <X size={18} />
                </button>
                <div className="request-create-photo-modal__image-wrap">
                  <img src={currentPhotoUrl} alt={currentPhoto.name} className="request-create-photo-modal__image" />
                </div>
                <div className="request-create-photo-modal__toolbar">
                  <button
                    type="button"
                    className="request-create-minimal__photo-nav"
                    onClick={() => movePhoto('prev')}
                    aria-label={copy.previousPhoto}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="request-create-minimal__photo-counter">{currentPhotoCounter}</span>
                  <button
                    type="button"
                    className="request-create-minimal__photo-nav"
                    onClick={() => movePhoto('next')}
                    aria-label={copy.nextPhoto}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </article>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};
