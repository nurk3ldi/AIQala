import { ArrowLeft, ImagePlus, MapPin, Trash2 } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

import type { AppShellOutletContext } from '../components/layout/AppShellBare';
import { Button } from '../components/ui/Button';
import { InputField, SelectField, TextareaField } from '../components/ui/Fields';
import { LoadingState } from '../components/ui/LoadingState';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import type { Category, District } from '../types/api';

const REQUEST_PHOTO_LIMIT = 5;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_LATITUDE = '51.1694';
const DEFAULT_LONGITUDE = '71.4491';

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

const CREATE_PAGE_COPY = {
  kk: {
    title: 'Жаңа өтінім',
    subtitle: 'Тек маңызды өрістерді толтырыңыз да, өтінімді жіберіңіз.',
    details: 'Мәселе сипаттамасы',
    classify: 'Санат және орын',
    location: 'Орналасу нүктесі',
    photos: 'Фотолар',
    photosHint: 'Міндетті емес, максимум 5 фото.',
    noDistrict: 'Аудан таңдалмаған',
    cityCenter: 'Қала центрін қою',
    back: 'Қайту',
    submit: 'Жіберу',
    invalidPhotoType: 'Тек JPG, PNG, WEBP форматтары қолданылады.',
    photoLimit: 'Бір өтінімге максимум 5 фото қосылады.',
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
    photosHint: 'Необязательно, максимум 5 фото.',
    noDistrict: 'Район не выбран',
    cityCenter: 'Поставить центр города',
    back: 'Назад',
    submit: 'Отправить',
    invalidPhotoType: 'Поддерживаются только JPG, PNG, WEBP.',
    photoLimit: 'Максимум 5 фото для одной заявки.',
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
    photosHint: 'Optional, up to 5 photos.',
    noDistrict: 'No district selected',
    cityCenter: 'Use city center',
    back: 'Back',
    submit: 'Submit',
    invalidPhotoType: 'Only JPG, PNG, WEBP files are supported.',
    photoLimit: 'Maximum 5 photos per request.',
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

  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    cityId: '',
    districtId: '',
    latitude: '',
    longitude: '',
  });

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
    hasValidCoordinates;

  const handleCityChange = (cityId: string) => {
    const city = cities.find((item) => item.id === cityId) ?? null;

    setForm((current) => ({
      ...current,
      cityId,
      districtId: '',
      latitude: city ? cityCoordinate(city.latitude, current.latitude || DEFAULT_LATITUDE) : current.latitude,
      longitude: city ? cityCoordinate(city.longitude, current.longitude || DEFAULT_LONGITUDE) : current.longitude,
    }));
  };

  const setCityCenterCoordinates = () => {
    const nextLatitude = selectedCity ? cityCoordinate(selectedCity.latitude, DEFAULT_LATITUDE) : DEFAULT_LATITUDE;
    const nextLongitude = selectedCity ? cityCoordinate(selectedCity.longitude, DEFAULT_LONGITUDE) : DEFAULT_LONGITUDE;

    setForm((current) => ({
      ...current,
      latitude: nextLatitude,
      longitude: nextLongitude,
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
          description: copy.photoLimit,
        });
      }

      return combined.slice(0, REQUEST_PHOTO_LIMIT);
    });

    event.currentTarget.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
          <p>{copy.subtitle}</p>
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
            <div />
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
          <div className="request-create-minimal__grid request-create-minimal__grid--coords">
            <InputField
              label={t('common.latitude')}
              value={form.latitude}
              onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
              required
            />
            <InputField
              label={t('common.longitude')}
              value={form.longitude}
              onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
              required
            />
          </div>
          <div className="request-create-minimal__coords-actions">
            <Button type="button" variant="secondary" onClick={setCityCenterCoordinates}>
              <MapPin size={15} />
              {copy.cityCenter}
            </Button>
          </div>
        </section>

        <section className="request-create-minimal__section">
          <h3>{copy.photos}</h3>
          <p className="request-create-minimal__hint">{copy.photosHint}</p>
          <InputField label={copy.photos} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoSelect} />
          {photos.length ? (
            <div className="request-create-minimal__photos-list">
              {photos.map((file, index) => (
                <div key={`${file.name}-${index}`} className="request-create-minimal__photo-item">
                  <span>{file.name}</span>
                  <button type="button" onClick={() => removePhoto(index)} aria-label={t('common.remove')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
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
    </div>
  );
};
