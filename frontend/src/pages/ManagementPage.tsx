import { Building2, LayoutGrid, Link2, MapPin, MapPinned, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { InputField, SelectField, TextareaField } from '../components/ui/Fields';
import { LoadingState } from '../components/ui/LoadingState';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import type { Language } from '../lib/i18n';
import type { Category, City, District, Organization } from '../types/api';

type ManagementSection = 'categories' | 'cities' | 'districts';

type ModalState =
  | { type: 'create-category' }
  | { type: 'create-city' }
  | { type: 'create-district' }
  | { type: 'edit-category'; category: Category }
  | { type: 'edit-city'; city: City }
  | { type: 'edit-district'; district: District }
  | { type: 'bind-category'; category: Category }
  | { type: 'delete-category'; category: Category }
  | { type: 'delete-city'; city: City }
  | { type: 'delete-district'; district: District }
  | null;

const DEFAULT_CENTER: [number, number] = [48.0196, 66.9237];
const DEFAULT_ZOOM = 5;
const PICKER_ZOOM = 12;

const parseCoordinate = (value?: string | null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const coordinatePickerIcon = L.divIcon({
  className: 'management-map-picker__pin-wrap',
  html: '<span class="management-map-picker__pin"></span>',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
});

const CoordinatePickerViewport = ({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) => {
  const map = useMap();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize();

      if (latitude !== null && longitude !== null) {
        map.setView([latitude, longitude], Math.max(map.getZoom(), PICKER_ZOOM), { animate: false });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [latitude, longitude, map]);

  return null;
};

const CoordinatePickerEvents = ({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void;
}) => {
  useMapEvents({
    click: (event) => {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
};

const CoordinateMapPicker = ({
  label,
  latitude,
  longitude,
  fallbackLatitude,
  fallbackLongitude,
  onSelect,
}: {
  label: string;
  latitude: string;
  longitude: string;
  fallbackLatitude?: string | null;
  fallbackLongitude?: string | null;
  onSelect: (latitude: string, longitude: string) => void;
}) => {
  const selectedLatitude = parseCoordinate(latitude);
  const selectedLongitude = parseCoordinate(longitude);
  const fallbackLat = parseCoordinate(fallbackLatitude);
  const fallbackLng = parseCoordinate(fallbackLongitude);
  const center: [number, number] =
    selectedLatitude !== null && selectedLongitude !== null
      ? [selectedLatitude, selectedLongitude]
      : fallbackLat !== null && fallbackLng !== null
        ? [fallbackLat, fallbackLng]
        : DEFAULT_CENTER;

  return (
    <div className="management-map-picker">
      <div className="management-map-picker__viewport">
        <MapContainer
          center={center}
          zoom={selectedLatitude !== null && selectedLongitude !== null ? PICKER_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom
          className="management-map-picker__leaflet"
        >
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <CoordinatePickerViewport latitude={selectedLatitude} longitude={selectedLongitude} />
          <CoordinatePickerEvents
            onSelect={(nextLatitude, nextLongitude) => {
              onSelect(nextLatitude.toFixed(6), nextLongitude.toFixed(6));
            }}
          />
          {selectedLatitude !== null && selectedLongitude !== null ? (
            <Marker position={[selectedLatitude, selectedLongitude]} icon={coordinatePickerIcon} />
          ) : null}
        </MapContainer>
      </div>

      <div className="management-map-picker__meta">
        <span className="management-chip management-map-picker__chip">
          <MapPin size={14} />
          {label}:{' '}
          {selectedLatitude !== null && selectedLongitude !== null
            ? `${selectedLatitude.toFixed(6)}, ${selectedLongitude.toFixed(6)}`
            : '--'}
        </span>
      </div>
    </div>
  );
};

const MANAGEMENT_UI: Record<
  Language,
  {
    subtitle: string;
    createCategory: string;
    createCity: string;
    createDistrict: string;
    editCategory: string;
    editCity: string;
    editDistrict: string;
    bindCategory: string;
    bindSubtitle: string;
    cancel: string;
    tabs: Record<ManagementSection, string>;
    empty: Record<ManagementSection, { title: string; description: string }>;
    regionFallback: string;
    cityFallback: string;
    noDescription: string;
    coordinates: string;
    actions: {
      edit: string;
      delete: string;
      bind: string;
    };
  }
> = {
  kk: {
    subtitle: 'Санаттар, қалалар және аудандарды осы жерден жылдам басқарасыз.',
    createCategory: 'Жаңа санат',
    createCity: 'Жаңа қала',
    createDistrict: 'Жаңа аудан',
    editCategory: 'Санатты өзгерту',
    editCity: 'Қаланы өзгерту',
    editDistrict: 'Ауданды өзгерту',
    bindCategory: 'Санатты ұйымға бекіту',
    bindSubtitle: 'Таңдалған санатты ұйыммен байланыстырыңыз.',
    cancel: 'Бас тарту',
    tabs: {
      categories: 'Санаттар',
      cities: 'Қалалар',
      districts: 'Аудандар',
    },
    empty: {
      categories: {
        title: 'Санаттар жоқ',
        description: 'Жаңа санат қосып, жүйедегі бағыттарды қалыптастырыңыз.',
      },
      cities: {
        title: 'Қалалар жоқ',
        description: 'Жаңа қала қосып, аймақтық құрылымды бастаңыз.',
      },
      districts: {
        title: 'Аудандар жоқ',
        description: 'Қалаға байланған аудан қосу үшін жаңа жазба ашыңыз.',
      },
    },
    regionFallback: 'Аймақ көрсетілмеген',
    cityFallback: 'Қала көрсетілмеген',
    noDescription: 'Сипаттама жоқ',
    coordinates: 'Координаттар',
    actions: {
      edit: 'Өңдеу',
      delete: 'Өшіру',
      bind: 'Байланыстыру',
    },
  },
  ru: {
    subtitle: 'Быстро управляйте категориями, городами и районами отсюда.',
    createCategory: 'Новая категория',
    createCity: 'Новый город',
    createDistrict: 'Новый район',
    editCategory: 'Изменить категорию',
    editCity: 'Изменить город',
    editDistrict: 'Изменить район',
    bindCategory: 'Привязать категорию к организации',
    bindSubtitle: 'Свяжите выбранную категорию с организацией.',
    cancel: 'Отмена',
    tabs: {
      categories: 'Категории',
      cities: 'Города',
      districts: 'Районы',
    },
    empty: {
      categories: {
        title: 'Категорий нет',
        description: 'Добавьте первую категорию, чтобы задать направления работы.',
      },
      cities: {
        title: 'Городов нет',
        description: 'Добавьте город, чтобы начать строить географию платформы.',
      },
      districts: {
        title: 'Районов нет',
        description: 'Создайте район, привязанный к городу.',
      },
    },
    regionFallback: 'Регион не указан',
    cityFallback: 'Город не указан',
    noDescription: 'Без описания',
    coordinates: 'Координаты',
    actions: {
      edit: 'Редактировать',
      delete: 'Удалить',
      bind: 'Связать',
    },
  },
  en: {
    subtitle: 'Quickly manage categories, cities, and districts from here.',
    createCategory: 'New category',
    createCity: 'New city',
    createDistrict: 'New district',
    editCategory: 'Edit category',
    editCity: 'Edit city',
    editDistrict: 'Edit district',
    bindCategory: 'Bind category to organization',
    bindSubtitle: 'Connect the selected category to an organization.',
    cancel: 'Cancel',
    tabs: {
      categories: 'Categories',
      cities: 'Cities',
      districts: 'Districts',
    },
    empty: {
      categories: {
        title: 'No categories yet',
        description: 'Create a category to shape the service map.',
      },
      cities: {
        title: 'No cities yet',
        description: 'Add a city to start building the platform geography.',
      },
      districts: {
        title: 'No districts yet',
        description: 'Create a district linked to a city.',
      },
    },
    regionFallback: 'Region not specified',
    cityFallback: 'City not specified',
    noDescription: 'No description',
    coordinates: 'Coordinates',
    actions: {
      edit: 'Edit',
      delete: 'Delete',
      bind: 'Bind',
    },
  },
};

const initialCategoryForm = () => ({ name: '', description: '' });
const initialCityForm = () => ({ name: '', region: '', latitude: '', longitude: '' });
const initialDistrictForm = () => ({ name: '', cityId: '', latitude: '', longitude: '' });
const initialBindForm = () => ({ categoryId: '', cityId: '', organizationId: '' });
const MAP_MODAL_TYPES = new Set(['create-city', 'edit-city', 'create-district', 'edit-district']);
const DELETE_MODAL_TYPES = new Set(['delete-category', 'delete-city', 'delete-district']);
const ORGANIZATION_PAGE_LIMIT = 100;

export const ManagementPage = () => {
  const { language, t } = useTranslation();
  const { pushToast } = useToast();
  const copy = MANAGEMENT_UI[language];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bindingActionBusyId, setBindingActionBusyId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ManagementSection>('categories');
  const [modalState, setModalState] = useState<ModalState>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [categoryOrganizations, setCategoryOrganizations] = useState<Record<string, Organization[]>>({});

  const [categoryForm, setCategoryForm] = useState(initialCategoryForm());
  const [cityForm, setCityForm] = useState(initialCityForm());
  const [districtForm, setDistrictForm] = useState(initialDistrictForm());
  const [bindForm, setBindForm] = useState(initialBindForm());

  const fetchAllOrganizations = async () => {
    const firstPage = await api.organizations.list({ page: 1, limit: ORGANIZATION_PAGE_LIMIT });
    const items = [...firstPage.items];

    if (firstPage.meta.totalPages <= 1) {
      return items;
    }

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
        api.organizations.list({
          page: index + 2,
          limit: ORGANIZATION_PAGE_LIMIT,
        }),
      ),
    );

    remainingPages.forEach((page) => {
      items.push(...page.items);
    });

    return items;
  };

  const refresh = async () => {
    const [categoryResult, cityResult, districtResult, organizationItems] = await Promise.all([
      api.categories.list(),
      api.locations.cities.list(),
      api.locations.districts.list(),
      fetchAllOrganizations(),
    ]);

    const categoryOrganizationEntries = await Promise.all(
      categoryResult.map(async (category) => [
        category.id,
        await api.categories.listOrganizations(category.id),
      ] as const),
    );

    setCategories(categoryResult);
    setCities(cityResult);
    setDistricts(districtResult);
    setOrganizations(organizationItems);
    setCategoryOrganizations(Object.fromEntries(categoryOrganizationEntries));
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await refresh();
      } catch (error) {
        if (active) {
          pushToast({
            tone: 'error',
            title: t('catalog.loadFailed'),
            description: getErrorMessage(error),
          });
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
  }, [pushToast, t]);

  const categoryBindingsByCategoryId = useMemo(() => {
    const bindings = new Map<string, Organization[]>();

    categories.forEach((category) => {
      bindings.set(category.id, categoryOrganizations[category.id] ?? []);
    });

    return bindings;
  }, [categories, categoryOrganizations]);

  const closeModal = () => {
    setModalState(null);
    setSubmitting(false);
    setBindingActionBusyId(null);
  };

  const openCreateCategory = () => {
    setActiveSection('categories');
    setCategoryForm(initialCategoryForm());
    setModalState({ type: 'create-category' });
  };

  const openCreateCity = () => {
    setActiveSection('cities');
    setCityForm(initialCityForm());
    setModalState({ type: 'create-city' });
  };

  const openCreateDistrict = () => {
    setActiveSection('districts');
    setDistrictForm(initialDistrictForm());
    setModalState({ type: 'create-district' });
  };

  const openEditCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description ?? '',
    });
    setModalState({ type: 'edit-category', category });
  };

  const openEditCity = (city: City) => {
    setCityForm({
      name: city.name,
      region: city.region ?? '',
      latitude: city.latitude ?? '',
      longitude: city.longitude ?? '',
    });
    setModalState({ type: 'edit-city', city });
  };

  const openEditDistrict = (district: District) => {
    setDistrictForm({
      name: district.name,
      cityId: district.cityId,
      latitude: district.latitude ?? '',
      longitude: district.longitude ?? '',
    });
    setModalState({ type: 'edit-district', district });
  };

  const openBindCategory = (category: Category) => {
    setBindForm({
      categoryId: category.id,
      cityId: '',
      organizationId: '',
    });
    setModalState({ type: 'bind-category', category });
  };

  const openDeleteCategory = (category: Category) => {
    setModalState({ type: 'delete-category', category });
  };

  const openDeleteCity = (city: City) => {
    setModalState({ type: 'delete-city', city });
  };

  const openDeleteDistrict = (district: District) => {
    setModalState({ type: 'delete-district', district });
  };

  const unbindCategoryFromOrganization = async (categoryId: string, organizationId: string) => {
    const actionId = `${categoryId}:${organizationId}`;
    setBindingActionBusyId(actionId);

    try {
      await api.categories.unbindOrganization(categoryId, organizationId);
      await refresh();
      setBindForm((current) =>
        current.organizationId === organizationId ? { ...current, organizationId: '' } : current,
      );
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('catalog.bindOrganization'),
        description: getErrorMessage(error),
      });
    } finally {
      setBindingActionBusyId(null);
    }
  };

  const submitModal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!modalState) {
      return;
    }

    setSubmitting(true);

    try {
      let shouldCloseModal = true;

      switch (modalState.type) {
        case 'create-category':
          await api.categories.create({
            name: categoryForm.name,
            description: categoryForm.description || undefined,
          });
          pushToast({ tone: 'success', title: t('catalog.categoryCreated') });
          break;
        case 'edit-category':
          await api.categories.update(modalState.category.id, {
            name: categoryForm.name,
            description: categoryForm.description || undefined,
          });
          pushToast({ tone: 'success', title: t('catalog.categoryUpdated') });
          break;
        case 'create-city':
          await api.locations.cities.create({
            name: cityForm.name,
            region: cityForm.region || undefined,
            latitude: cityForm.latitude || undefined,
            longitude: cityForm.longitude || undefined,
          });
          pushToast({ tone: 'success', title: t('catalog.cityCreated') });
          break;
        case 'edit-city':
          await api.locations.cities.update(modalState.city.id, {
            name: cityForm.name,
            region: cityForm.region || undefined,
            latitude: cityForm.latitude || undefined,
            longitude: cityForm.longitude || undefined,
          });
          pushToast({ tone: 'success', title: t('catalog.cityUpdated') });
          break;
        case 'create-district':
          await api.locations.districts.create({
            name: districtForm.name,
            cityId: districtForm.cityId,
            latitude: districtForm.latitude || undefined,
            longitude: districtForm.longitude || undefined,
          });
          pushToast({ tone: 'success', title: t('catalog.districtCreated') });
          break;
        case 'edit-district':
          await api.locations.districts.update(modalState.district.id, {
            name: districtForm.name,
            cityId: districtForm.cityId,
            latitude: districtForm.latitude || undefined,
            longitude: districtForm.longitude || undefined,
          });
          pushToast({ tone: 'success', title: t('catalog.districtUpdated') });
          break;
        case 'bind-category':
          await api.categories.bindOrganization(bindForm.categoryId, bindForm.organizationId);
          pushToast({ tone: 'success', title: t('catalog.boundSuccess') });
          shouldCloseModal = false;
          break;
        case 'delete-category':
          await api.categories.remove(modalState.category.id);
          pushToast({ tone: 'success', title: t('catalog.categoryDeleted') });
          break;
        case 'delete-city':
          await api.locations.cities.remove(modalState.city.id);
          pushToast({ tone: 'success', title: t('catalog.cityDeleted') });
          break;
        case 'delete-district':
          await api.locations.districts.remove(modalState.district.id);
          pushToast({ tone: 'success', title: t('catalog.districtDeleted') });
          break;
      }

      await refresh();

      if (modalState.type === 'bind-category') {
        setBindForm((current) => ({
          ...current,
          organizationId: '',
        }));
      }

      if (shouldCloseModal) {
        closeModal();
      } else {
        setSubmitting(false);
      }
    } catch (error) {
      pushToast({
        tone: 'error',
        title: DELETE_MODAL_TYPES.has(modalState.type)
          ? t('catalog.deleteFailed')
          : modalState.type === 'bind-category'
            ? t('catalog.bindOrganization')
            : t('common.save'),
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = (() => {
    if (!modalState) {
      return '';
    }

    switch (modalState.type) {
      case 'create-category':
        return copy.createCategory;
      case 'create-city':
        return copy.createCity;
      case 'create-district':
        return copy.createDistrict;
      case 'edit-category':
        return copy.editCategory;
      case 'edit-city':
        return copy.editCity;
      case 'edit-district':
        return copy.editDistrict;
      case 'bind-category':
        return copy.bindCategory;
      case 'delete-category':
      case 'delete-city':
      case 'delete-district':
        return t('common.delete');
    }
  })();

  const renderModalFields = () => {
    if (!modalState) {
      return null;
    }

    const boundOrganizations =
      modalState.type === 'bind-category'
        ? (categoryBindingsByCategoryId.get(modalState.category.id) ?? []).filter(
            (organization) => !bindForm.cityId || organization.cityId === bindForm.cityId,
          )
        : [];
    const boundOrganizationIds = new Set(
      modalState.type === 'bind-category'
        ? (categoryBindingsByCategoryId.get(modalState.category.id) ?? []).map((organization) => organization.id)
        : [],
    );
    const bindableOrganizations = organizations.filter(
      (organization) =>
        organization.isActive &&
        (!bindForm.cityId || organization.cityId === bindForm.cityId) &&
        !boundOrganizationIds.has(organization.id),
    );

    switch (modalState.type) {
      case 'create-category':
      case 'edit-category':
        return (
          <>
            <InputField
              label={t('common.title')}
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <TextareaField
              label={t('common.description')}
              value={categoryForm.description}
              onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
            />
          </>
        );
      case 'create-city':
      case 'edit-city':
        return (
          <div className="management-modal__layout">
            <div className="management-modal__map-column">
              <CoordinateMapPicker
                label={copy.coordinates}
                latitude={cityForm.latitude}
                longitude={cityForm.longitude}
                onSelect={(latitude, longitude) =>
                  setCityForm((current) => ({
                    ...current,
                    latitude,
                    longitude,
                  }))
                }
              />
            </div>
            <div className="management-modal__info-column management-modal__info-column--stack">
              <InputField
                label={t('common.title')}
                value={cityForm.name}
                onChange={(event) => setCityForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <InputField
                label={t('catalog.editRegion')}
                value={cityForm.region}
                onChange={(event) => setCityForm((current) => ({ ...current, region: event.target.value }))}
              />
              <InputField
                label={t('common.latitude')}
                value={cityForm.latitude}
                onChange={(event) => setCityForm((current) => ({ ...current, latitude: event.target.value }))}
              />
              <InputField
                label={t('common.longitude')}
                value={cityForm.longitude}
                onChange={(event) => setCityForm((current) => ({ ...current, longitude: event.target.value }))}
              />
            </div>
          </div>
        );
      case 'create-district':
      case 'edit-district': {
        const selectedCity = cities.find((city) => city.id === districtForm.cityId);

        return (
          <div className="management-modal__layout">
            <div className="management-modal__map-column">
              <CoordinateMapPicker
                label={copy.coordinates}
                latitude={districtForm.latitude}
                longitude={districtForm.longitude}
                fallbackLatitude={selectedCity?.latitude ?? null}
                fallbackLongitude={selectedCity?.longitude ?? null}
                onSelect={(latitude, longitude) =>
                  setDistrictForm((current) => ({
                    ...current,
                    latitude,
                    longitude,
                  }))
                }
              />
            </div>
            <div className="management-modal__info-column management-modal__info-column--stack">
              <InputField
                label={t('common.title')}
                value={districtForm.name}
                onChange={(event) => setDistrictForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <SelectField
                label={t('common.city')}
                value={districtForm.cityId}
                onChange={(event) => setDistrictForm((current) => ({ ...current, cityId: event.target.value }))}
                required
              >
                <option value="">{t('catalog.chooseCity')}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </SelectField>
              <InputField
                label={t('common.latitude')}
                value={districtForm.latitude}
                onChange={(event) => setDistrictForm((current) => ({ ...current, latitude: event.target.value }))}
              />
              <InputField
                label={t('common.longitude')}
                value={districtForm.longitude}
                onChange={(event) => setDistrictForm((current) => ({ ...current, longitude: event.target.value }))}
              />
            </div>
          </div>
        );
      }
      case 'bind-category':
        return (
          <>
            <div className="management-binding-panel">
              <div className="management-binding-panel__head">
                <strong>{t('common.organization')}</strong>
                <span>{boundOrganizations.length}</span>
              </div>

              {boundOrganizations.length ? (
                <div className="management-binding-list">
                  {boundOrganizations.map((organization) => (
                    <div key={organization.id} className="management-binding-row">
                      <div className="management-binding-row__copy">
                        <strong>{organization.name}</strong>
                        <span>{organization.city?.name ?? copy.cityFallback}</span>
                      </div>
                      <button
                        type="button"
                        className="management-binding-row__remove"
                        onClick={() => void unbindCategoryFromOrganization(modalState.category.id, organization.id)}
                        disabled={bindingActionBusyId === `${modalState.category.id}:${organization.id}`}
                        aria-label={t('common.remove')}
                        title={t('common.remove')}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="management-modal__hint">{t('common.notSpecified')}</p>
              )}
            </div>

            <SelectField
              label={t('common.city')}
              value={bindForm.cityId}
              onChange={(event) =>
                setBindForm((current) => ({
                  ...current,
                  cityId: event.target.value,
                  organizationId: '',
                }))
              }
              required
            >
              <option value="">{t('catalog.chooseCity')}</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label={t('common.organization')}
              value={bindForm.organizationId}
              onChange={(event) => setBindForm((current) => ({ ...current, organizationId: event.target.value }))}
              disabled={!bindForm.cityId}
              required
            >
              <option value="">{t('catalog.chooseOrganization')}</option>
              {bindableOrganizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </SelectField>
          </>
        );
      case 'delete-category':
        return (
          <div className="management-confirm">
            <p className="management-modal__hint">{t('catalog.categoryDeleteConfirm')}</p>
            <strong className="management-confirm__target">{modalState.category.name}</strong>
          </div>
        );
      case 'delete-city':
        return (
          <div className="management-confirm">
            <p className="management-modal__hint">{t('catalog.cityDeleteConfirm')}</p>
            <strong className="management-confirm__target">{modalState.city.name}</strong>
          </div>
        );
      case 'delete-district':
        return (
          <div className="management-confirm">
            <p className="management-modal__hint">{t('catalog.districtDeleteConfirm')}</p>
            <strong className="management-confirm__target">{modalState.district.name}</strong>
          </div>
        );
    }
  };

  const renderSectionContent = () => {
    if (activeSection === 'categories') {
      if (!categories.length) {
        return <EmptyState title={copy.empty.categories.title} description={copy.empty.categories.description} />;
      }

      return (
        <div className="management-grid">
          {categories.map((category) => (
            <article key={category.id} className="management-card glass-card">
              <div className="management-card__head">
                <div className="management-card__identity">
                  <span className="management-card__glyph">
                    <LayoutGrid size={18} />
                  </span>
                  <div className="management-card__copy">
                    <strong>{category.name}</strong>
                    {category.description ? <p>{category.description}</p> : null}
                  </div>
                </div>
                <div className="management-card__actions">
                  <button
                    type="button"
                    className="management-icon-button"
                    onClick={() => openBindCategory(category)}
                    title={copy.actions.bind}
                    aria-label={copy.actions.bind}
                  >
                    <Link2 size={16} />
                  </button>
                  <button
                    type="button"
                    className="management-icon-button"
                    onClick={() => openEditCategory(category)}
                    title={copy.actions.edit}
                    aria-label={copy.actions.edit}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="management-icon-button management-icon-button--danger"
                    onClick={() => openDeleteCategory(category)}
                    title={copy.actions.delete}
                    aria-label={copy.actions.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {!category.description ? (
                <div className="management-card__meta">
                  <span className="management-chip">{copy.noDescription}</span>
                </div>
              ) : null}
              <div className="management-card__meta management-card__meta--stack">
                {(categoryBindingsByCategoryId.get(category.id) ?? []).length ? (
                  (categoryBindingsByCategoryId.get(category.id) ?? []).slice(0, 4).map((organization) => (
                    <span key={organization.id} className="management-chip">
                      <Building2 size={13} />
                      {organization.name}
                    </span>
                  ))
                ) : (
                  <span className="management-chip">{t('common.notSpecified')}</span>
                )}
                {(categoryBindingsByCategoryId.get(category.id) ?? []).length > 4 ? (
                  <span className="management-chip">
                    +{(categoryBindingsByCategoryId.get(category.id) ?? []).length - 4}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      );
    }

    if (activeSection === 'cities') {
      if (!cities.length) {
        return <EmptyState title={copy.empty.cities.title} description={copy.empty.cities.description} />;
      }

      return (
        <div className="management-grid">
          {cities.map((city) => (
            <article key={city.id} className="management-card glass-card">
              <div className="management-card__head">
                <div className="management-card__identity">
                  <span className="management-card__glyph management-card__glyph--city">
                    <Building2 size={18} />
                  </span>
                  <div className="management-card__copy">
                    <strong>{city.name}</strong>
                    <p>{city.region ?? copy.regionFallback}</p>
                  </div>
                </div>
                <div className="management-card__actions">
                  <button
                    type="button"
                    className="management-icon-button"
                    onClick={() => openEditCity(city)}
                    title={copy.actions.edit}
                    aria-label={copy.actions.edit}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="management-icon-button management-icon-button--danger"
                    onClick={() => openDeleteCity(city)}
                    title={copy.actions.delete}
                    aria-label={copy.actions.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="management-card__meta">
                {city.latitude && city.longitude ? (
                  <span className="management-chip">
                    {copy.coordinates}: {city.latitude}, {city.longitude}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      );
    }

    if (!districts.length) {
      return <EmptyState title={copy.empty.districts.title} description={copy.empty.districts.description} />;
    }

    return (
      <div className="management-grid">
        {districts.map((district) => (
          <article key={district.id} className="management-card glass-card">
            <div className="management-card__head">
              <div className="management-card__identity">
                <span className="management-card__glyph management-card__glyph--district">
                  <MapPinned size={18} />
                </span>
                <div className="management-card__copy">
                  <strong>{district.name}</strong>
                  <p>{district.city?.name ?? copy.cityFallback}</p>
                </div>
              </div>
              <div className="management-card__actions">
                <button
                  type="button"
                  className="management-icon-button"
                  onClick={() => openEditDistrict(district)}
                  title={copy.actions.edit}
                  aria-label={copy.actions.edit}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="management-icon-button management-icon-button--danger"
                  onClick={() => openDeleteDistrict(district)}
                  title={copy.actions.delete}
                  aria-label={copy.actions.delete}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="management-card__meta">
              {district.latitude && district.longitude ? (
                <span className="management-chip">
                  {copy.coordinates}: {district.latitude}, {district.longitude}
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    );
  };

  if (loading) {
    return <LoadingState label={t('catalog.loading')} />;
  }

  const isMapModal = modalState ? MAP_MODAL_TYPES.has(modalState.type) : false;
  const isDeleteModal = modalState ? DELETE_MODAL_TYPES.has(modalState.type) : false;
  const deleteConfirmMessage = (() => {
    if (!modalState) {
      return '';
    }

    switch (modalState.type) {
      case 'delete-category':
        return t('catalog.categoryDeleteConfirm');
      case 'delete-city':
        return t('catalog.cityDeleteConfirm');
      case 'delete-district':
        return t('catalog.districtDeleteConfirm');
      default:
        return '';
    }
  })();

  const sectionTabs = [
    {
      key: 'categories' as const,
      label: copy.tabs.categories,
      count: categories.length,
      icon: LayoutGrid,
    },
    {
      key: 'cities' as const,
      label: copy.tabs.cities,
      count: cities.length,
      icon: Building2,
    },
    {
      key: 'districts' as const,
      label: copy.tabs.districts,
      count: districts.length,
      icon: MapPin,
    },
  ];

  return (
    <div className="page management-page">
      <section className="page-header glass-card">
        <div>
          <p className="catalog-page__subtitle">{copy.subtitle}</p>
        </div>
      </section>

      <section className="management-toolbar glass-card">
        <div className="management-toolbar__actions">
          <Button type="button" variant="secondary" className="management-quick-action" onClick={openCreateCategory}>
            <LayoutGrid size={18} />
            <span>{copy.createCategory}</span>
          </Button>
          <Button type="button" variant="secondary" className="management-quick-action" onClick={openCreateCity}>
            <Building2 size={18} />
            <span>{copy.createCity}</span>
          </Button>
          <Button type="button" variant="secondary" className="management-quick-action" onClick={openCreateDistrict}>
            <MapPinned size={18} />
            <span>{copy.createDistrict}</span>
          </Button>
        </div>

        <div className="management-tabs">
          {sectionTabs.map((section) => {
            const Icon = section.icon;

            return (
              <button
                key={section.key}
                type="button"
                className={`management-tab ${activeSection === section.key ? 'management-tab--active' : ''}`}
                onClick={() => setActiveSection(section.key)}
              >
                <span className="management-tab__icon">
                  <Icon size={18} />
                </span>
                <span className="management-tab__copy">
                  <strong>{section.label}</strong>
                  <span>{section.count}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {renderSectionContent()}

      {modalState ? (
        <div className="profile-modal management-modal">
          <button type="button" className="profile-modal__backdrop" aria-label={copy.cancel} onClick={closeModal} />
          {isDeleteModal ? (
            <article className="profile-modal__card glass-card management-modal__card management-modal__card--confirm">
              <button
                type="button"
                className="profile-modal__close management-confirm__close"
                onClick={closeModal}
                aria-label={copy.cancel}
              >
                <X size={16} />
              </button>

              <form className="management-confirm management-confirm--modal" onSubmit={submitModal}>
                <span className="management-confirm__icon" aria-hidden="true">
                  <Trash2 size={24} />
                </span>
                <div className="management-confirm__copy">
                  <h3>{t('common.delete')}</h3>
                  <p>{deleteConfirmMessage}</p>
                </div>
                <div className="management-confirm__actions">
                  <Button type="button" variant="secondary" className="management-confirm__button" onClick={closeModal}>
                    {copy.cancel}
                  </Button>
                  <Button type="submit" variant="danger" className="management-confirm__button" busy={submitting}>
                    {t('common.delete')}
                  </Button>
                </div>
              </form>
            </article>
          ) : (
            <article
              className={`profile-modal__card glass-card management-modal__card ${
                isMapModal ? 'management-modal__card--map' : ''
              }`.trim()}
            >
              <div className="profile-modal__header">
                <div className="management-modal__header-copy">
                  <h3>{modalTitle}</h3>
                </div>
                <button type="button" className="profile-modal__close" onClick={closeModal} aria-label={copy.cancel}>
                  <X size={18} />
                </button>
              </div>

              <form
                className={`profile-modal__form ${isMapModal ? 'profile-modal__form--map' : ''}`.trim()}
                onSubmit={submitModal}
              >
                {renderModalFields()}

                <div className="profile-modal__actions">
                  <Button type="button" variant="ghost" onClick={closeModal}>
                    {copy.cancel}
                  </Button>
                  <Button type="submit" busy={submitting}>
                    {modalState.type === 'bind-category' ? t('catalog.bindOrganization') : t('common.save')}
                  </Button>
                </div>
              </form>
            </article>
          )}
        </div>
      ) : null}
    </div>
  );
};
