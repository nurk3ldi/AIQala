import {
  Bot,
  Building2,
  Check,
  CircleAlert,
  Crosshair,
  FileText,
  ImagePlus,
  Images,
  Layers3,
  LocateFixed,
  MapPin,
  MapPinned,
  Maximize2,
  Navigation,
  Pencil,
  Sparkles,
  Target,
  Trash2,
  Workflow,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import type { AppShellOutletContext } from '../components/layout/AppShellBare';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { InputField, TextareaField } from '../components/ui/Fields';
import { LoadingState } from '../components/ui/LoadingState';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { formatPriorityLabel } from '../lib/format';
import type { Language } from '../lib/i18n';
import type { Category, City, District, Organization, RequestAnalysisResult, RequestPriority } from '../types/api';

type ModalState = 'category' | 'city' | 'district' | 'organization' | 'priority' | 'map' | null;

interface RequestPhotoDraft {
  id: string;
  file: File;
  previewUrl: string;
}

const DEFAULT_CENTER: [number, number] = [48.0196, 66.9237];
const DEFAULT_ZOOM = 5;
const PICKER_ZOOM = 14;
const REQUEST_PHOTO_LIMIT = 5;
const ALLOWED_REQUEST_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const REQUEST_CREATE_UI: Record<
  Language,
  {
    subtitle: string;
    issueCard: string;
    selectorsCard: string;
    locationCard: string;
    summaryCard: string;
    analysisCard: string;
    analysisEmpty: string;
    analysisHint: string;
    useAi: string;
    submit: string;
    chooseOnMap: string;
    changePoint: string;
    savePoint: string;
    cancel: string;
    ready: string;
    pending: string;
    noSelection: string;
    optionalDistrict: string;
    optionalOrganization: string;
    autoPriority: string;
    pointMissing: string;
    validationTitle: string;
    validationDescription: string;
    coordinatesTitle: string;
    mapModalTitle: string;
    selectCategory: string;
    selectCity: string;
    selectDistrict: string;
    selectOrganization: string;
    selectPriority: string;
    districtEmptyTitle: string;
    districtEmptyDescription: string;
    organizationEmptyTitle: string;
    organizationEmptyDescription: string;
    pickerEmptyTitle: string;
    pickerEmptyDescription: string;
    exactPoint: string;
    aiSuggested: string;
  }
> = {
  kk: {
    subtitle: 'Мәселені қысқа сипаттап, санат пен орынды терезелер арқылы таңдап, нақты нүктені картадан белгілеңіз.',
    issueCard: 'Мәселе',
    selectorsCard: 'Параметрлер',
    locationCard: 'Орны',
    summaryCard: 'Жіберуге дайындық',
    analysisCard: 'AI шолу',
    analysisEmpty: 'AI талдауы әлі іске қосылған жоқ.',
    analysisHint: 'Қысымдылық пен ұсынысты көру үшін талдауды іске қосыңыз.',
    useAi: 'AI талдау',
    submit: 'Өтінім жіберу',
    chooseOnMap: 'Картадан белгілеу',
    changePoint: 'Нүктені өзгерту',
    savePoint: 'Нүктені сақтау',
    cancel: 'Бас тарту',
    ready: 'Дайын',
    pending: 'Толық емес',
    noSelection: 'Таңдалмаған',
    optionalDistrict: 'Аудансыз',
    optionalOrganization: 'Ұйымсыз',
    autoPriority: 'Автоматты',
    pointMissing: 'Нүкте белгіленбеген',
    validationTitle: 'Форма толық емес',
    validationDescription: 'Тақырып, сипаттама, санат, қала және картадағы нүкте міндетті.',
    coordinatesTitle: 'Координата',
    mapModalTitle: 'Картадан орынды таңдау',
    selectCategory: 'Санатты таңдау',
    selectCity: 'Қаланы таңдау',
    selectDistrict: 'Ауданды таңдау',
    selectOrganization: 'Ұйымды таңдау',
    selectPriority: 'Маңыздылықты таңдау',
    districtEmptyTitle: 'Алдымен қаланы таңдаңыз',
    districtEmptyDescription: 'Аудан тізімі таңдалған қалаға байланысты ашылады.',
    organizationEmptyTitle: 'Сәйкес ұйым табылмады',
    organizationEmptyDescription: 'Ұйымдар санат пен қала бірге таңдалғанда ғана көрінеді.',
    pickerEmptyTitle: 'Тізім бос',
    pickerEmptyDescription: 'Қазір бұл бөлімде таңдайтын жазба жоқ.',
    exactPoint: 'Нақты жерді картадан басып белгілеңіз',
    aiSuggested: 'Ұсыныс',
  },
  ru: {
    subtitle: 'Кратко опишите проблему, выберите параметры через окна и отметьте точную точку на карте.',
    issueCard: 'Проблема',
    selectorsCard: 'Параметры',
    locationCard: 'Место',
    summaryCard: 'Готовность',
    analysisCard: 'AI обзор',
    analysisEmpty: 'AI-анализ еще не запускался.',
    analysisHint: 'Запустите анализ, чтобы увидеть приоритет и подсказки.',
    useAi: 'AI анализ',
    submit: 'Отправить заявку',
    chooseOnMap: 'Отметить на карте',
    changePoint: 'Изменить точку',
    savePoint: 'Сохранить точку',
    cancel: 'Отмена',
    ready: 'Готово',
    pending: 'Не заполнено',
    noSelection: 'Не выбрано',
    optionalDistrict: 'Без района',
    optionalOrganization: 'Без организации',
    autoPriority: 'Авто',
    pointMissing: 'Точка не указана',
    validationTitle: 'Форма заполнена не полностью',
    validationDescription: 'Заголовок, описание, категория, город и точка на карте обязательны.',
    coordinatesTitle: 'Координаты',
    mapModalTitle: 'Выбор точки на карте',
    selectCategory: 'Выбрать категорию',
    selectCity: 'Выбрать город',
    selectDistrict: 'Выбрать район',
    selectOrganization: 'Выбрать организацию',
    selectPriority: 'Выбрать приоритет',
    districtEmptyTitle: 'Сначала выберите город',
    districtEmptyDescription: 'Список районов открывается только для выбранного города.',
    organizationEmptyTitle: 'Подходящие организации не найдены',
    organizationEmptyDescription: 'Организации появляются только после выбора категории и города.',
    pickerEmptyTitle: 'Список пуст',
    pickerEmptyDescription: 'Сейчас в этом разделе нет доступных записей.',
    exactPoint: 'Нажмите на карту, чтобы поставить точную точку',
    aiSuggested: 'Подсказка',
  },
  en: {
    subtitle: 'Describe the issue, choose the right parameters through modals, and mark the exact point on the map.',
    issueCard: 'Issue',
    selectorsCard: 'Parameters',
    locationCard: 'Location',
    summaryCard: 'Ready to send',
    analysisCard: 'AI overview',
    analysisEmpty: 'AI analysis has not been run yet.',
    analysisHint: 'Run analysis to get priority and routing hints.',
    useAi: 'Run AI',
    submit: 'Submit request',
    chooseOnMap: 'Mark on map',
    changePoint: 'Change point',
    savePoint: 'Save point',
    cancel: 'Cancel',
    ready: 'Ready',
    pending: 'Incomplete',
    noSelection: 'Not selected',
    optionalDistrict: 'No district',
    optionalOrganization: 'No organization',
    autoPriority: 'Auto',
    pointMissing: 'No point selected',
    validationTitle: 'Form is incomplete',
    validationDescription: 'Title, description, category, city, and a map point are required.',
    coordinatesTitle: 'Coordinates',
    mapModalTitle: 'Choose point on map',
    selectCategory: 'Choose category',
    selectCity: 'Choose city',
    selectDistrict: 'Choose district',
    selectOrganization: 'Choose organization',
    selectPriority: 'Choose priority',
    districtEmptyTitle: 'Choose a city first',
    districtEmptyDescription: 'Districts open only after a city has been selected.',
    organizationEmptyTitle: 'No matching organizations',
    organizationEmptyDescription: 'Organizations appear only after both city and category are selected.',
    pickerEmptyTitle: 'Nothing to show',
    pickerEmptyDescription: 'There are no available options in this section yet.',
    exactPoint: 'Click the map to place the exact point',
    aiSuggested: 'Suggested',
  },
};

const parseCoordinate = (value?: string | null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const requestLocationPinIcon = L.divIcon({
  className: 'management-map-picker__pin-wrap',
  html: '<span class="management-map-picker__pin"></span>',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
});

const RequestLocationViewport = ({
  latitude,
  longitude,
  fallbackLatitude,
  fallbackLongitude,
}: {
  latitude: number | null;
  longitude: number | null;
  fallbackLatitude: number | null;
  fallbackLongitude: number | null;
}) => {
  const map = useMap();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize();

      if (latitude !== null && longitude !== null) {
        map.setView([latitude, longitude], PICKER_ZOOM, { animate: false });
        return;
      }

      if (fallbackLatitude !== null && fallbackLongitude !== null) {
        map.setView([fallbackLatitude, fallbackLongitude], 11, { animate: false });
        return;
      }

      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [fallbackLatitude, fallbackLongitude, latitude, longitude, map]);

  return null;
};

const RequestLocationEvents = ({
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

const RequestLocationMap = ({
  latitude,
  longitude,
  fallbackLatitude,
  fallbackLongitude,
  interactive = false,
  onSelect,
  className,
}: {
  latitude: string;
  longitude: string;
  fallbackLatitude?: string | null;
  fallbackLongitude?: string | null;
  interactive?: boolean;
  onSelect?: (latitude: string, longitude: string) => void;
  className: string;
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
    <div className={className}>
      <MapContainer
        center={center}
        zoom={selectedLatitude !== null && selectedLongitude !== null ? PICKER_ZOOM : fallbackLat !== null && fallbackLng !== null ? 11 : DEFAULT_ZOOM}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        zoomControl={interactive}
        className="request-create-map__leaflet"
      >
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RequestLocationViewport
          latitude={selectedLatitude}
          longitude={selectedLongitude}
          fallbackLatitude={fallbackLat}
          fallbackLongitude={fallbackLng}
        />
        {interactive && onSelect ? (
          <RequestLocationEvents
            onSelect={(nextLatitude, nextLongitude) => {
              onSelect(nextLatitude.toFixed(6), nextLongitude.toFixed(6));
            }}
          />
        ) : null}
        {selectedLatitude !== null && selectedLongitude !== null ? (
          <Marker position={[selectedLatitude, selectedLongitude]} icon={requestLocationPinIcon} />
        ) : null}
      </MapContainer>
    </div>
  );
};

export const RequestFormPage = () => {
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const { pushToast } = useToast();
  const { selectedCity: shellSelectedCity, selectedCityId: shellSelectedCityId } =
    useOutletContext<AppShellOutletContext>();
  const copy = REQUEST_CREATE_UI[language];
  const photoCopy =
    language === 'ru'
      ? {
          card: 'Фотографии',
          add: 'Загрузить фото',
          change: 'Заменить фото',
          remove: 'Удалить фото',
          preview: 'Открыть',
          limit: 'Максимум 5 фото',
          ready: 'фото готово',
          empty: 'Фотографии пока не добавлены',
          invalid: 'Разрешены только JPG, PNG и WEBP изображения',
          limitReached: 'К одной заявке можно добавить не более 5 фото',
          partialTitle: 'Заявка создана, но часть фото не загрузилась',
          partialDescription: 'Оставшиеся фотографии нужно будет загрузить повторно.',
        }
      : language === 'en'
        ? {
            card: 'Photos',
            add: 'Upload photos',
            change: 'Replace photo',
            remove: 'Remove photo',
            preview: 'Open preview',
            limit: 'Up to 5 photos',
            ready: 'photos ready',
            empty: 'No photos added yet',
            invalid: 'Only JPG, PNG, and WEBP images are allowed',
            limitReached: 'Only 5 photos can be attached to one request',
            partialTitle: 'Request saved, but some photos failed to upload',
            partialDescription: 'You may need to upload the remaining files again later.',
          }
        : {
            card: 'Фотолар',
            add: 'Фото жүктеу',
            change: 'Фото ауыстыру',
            remove: 'Фотоны жою',
            preview: 'Толық қарау',
            limit: 'Ең көбі 5 фото',
            ready: 'фото дайын',
            empty: 'Фото әлі қосылған жоқ',
            invalid: 'Тек JPG, PNG және WEBP фотолары рұқсат етіледі',
            limitReached: 'Бір өтінімге 5 фотоға дейін ғана қосуға болады',
            partialTitle: 'Өтінім сақталды, бірақ фотолардың бір бөлігі жүктелмеді',
            partialDescription: 'Қалған фотоларды кейін қайта жүктеу қажет болуы мүмкін.',
          };
  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [locationDraft, setLocationDraft] = useState({ latitude: '', longitude: '' });
  const [photoPreviewIndex, setPhotoPreviewIndex] = useState<number | null>(null);
  const [replacePhotoIndex, setReplacePhotoIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [analysis, setAnalysis] = useState<RequestAnalysisResult | null>(null);
  const [photos, setPhotos] = useState<RequestPhotoDraft[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    cityId: '',
    districtId: '',
    organizationId: '',
    latitude: '',
    longitude: '',
    priority: '',
  });
  const addPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const replacePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<RequestPhotoDraft[]>([]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(
    () => () => {
      photosRef.current.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl);
      });
    },
    [],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [categoriesResponse, citiesResponse] = await Promise.all([api.categories.list(), api.locations.cities.list()]);

        if (!active) {
          return;
        }

        setCategories(categoriesResponse);
        setCities(citiesResponse);
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

    void load();

    return () => {
      active = false;
    };
  }, [pushToast, t]);

  useEffect(() => {
    if (!shellSelectedCityId) {
      return;
    }

    setForm((current) => (current.cityId ? current : { ...current, cityId: shellSelectedCityId }));
  }, [shellSelectedCityId]);

  useEffect(() => {
    if (!form.cityId) {
      setDistricts([]);
      setForm((current) =>
        current.districtId || current.organizationId ? { ...current, districtId: '', organizationId: '' } : current,
      );
      return;
    }

    let active = true;

    void api.locations.districts
      .list({ cityId: form.cityId })
      .then((items) => {
        if (active) {
          setDistricts(items);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [form.cityId]);

  useEffect(() => {
    if (!form.cityId || !form.categoryId) {
      setOrganizations([]);
      setForm((current) => (current.organizationId ? { ...current, organizationId: '' } : current));
      return;
    }

    let active = true;

    void api.categories
      .listOrganizations(form.categoryId, { cityId: form.cityId, isActive: true })
      .then((items) => {
        if (!active) {
          return;
        }

        setOrganizations(items);
        setForm((current) =>
          current.organizationId && !items.some((organization) => organization.id === current.organizationId)
            ? { ...current, organizationId: '' }
            : current,
        );
      })
      .catch(() => {
        if (active) {
          setOrganizations([]);
        }
      });

    return () => {
      active = false;
    };
  }, [form.categoryId, form.cityId]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId) ?? null,
    [categories, form.categoryId],
  );
  const selectedCity = useMemo(
    () => cities.find((city) => city.id === form.cityId) ?? shellSelectedCity ?? null,
    [cities, form.cityId, shellSelectedCity],
  );
  const selectedDistrict = useMemo(
    () => districts.find((district) => district.id === form.districtId) ?? null,
    [districts, form.districtId],
  );
  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === form.organizationId) ?? null,
    [form.organizationId, organizations],
  );
  const previewPhoto =
    photoPreviewIndex !== null && photoPreviewIndex >= 0 && photoPreviewIndex < photos.length
      ? photos[photoPreviewIndex]
      : null;
  const isLocationPicked = parseCoordinate(form.latitude) !== null && parseCoordinate(form.longitude) !== null;
  const canSubmit =
    form.title.trim().length >= 4 &&
    form.description.trim().length >= 10 &&
    Boolean(form.categoryId) &&
    Boolean(form.cityId) &&
    isLocationPicked;

  const priorityCards: Array<{
    value: '' | RequestPriority;
    icon: typeof Sparkles;
    label: string;
    toneClassName: string;
  }> = [
    { value: '', icon: Sparkles, label: copy.autoPriority, toneClassName: 'auto' },
    { value: 'low', icon: Navigation, label: t('requestPriority.low'), toneClassName: 'low' },
    { value: 'medium', icon: Workflow, label: t('requestPriority.medium'), toneClassName: 'medium' },
    { value: 'high', icon: CircleAlert, label: t('requestPriority.high'), toneClassName: 'high' },
  ];

  const openModal = (nextModal: Exclude<ModalState, null>) => {
    if (nextModal === 'map') {
      setLocationDraft({
        latitude: form.latitude,
        longitude: form.longitude,
      });
    }

    setModalState(nextModal);
  };

  const closeModal = () => {
    setModalState(null);
  };

  const removePhotoDraft = (index: number) => {
    setPhotos((current) => {
      const target = current[index];

      if (!target) {
        return current;
      }

      URL.revokeObjectURL(target.previewUrl);

      const next = current.filter((_, currentIndex) => currentIndex !== index);

      if (photoPreviewIndex !== null) {
        if (current.length === 1) {
          setPhotoPreviewIndex(null);
        } else if (index < photoPreviewIndex) {
          setPhotoPreviewIndex(photoPreviewIndex - 1);
        } else if (index === photoPreviewIndex) {
          setPhotoPreviewIndex(Math.min(photoPreviewIndex, next.length - 1));
        }
      }

      return next;
    });
  };

  const appendPhotos = (incoming: FileList | File[] | null) => {
    const files = Array.from(incoming ?? []);

    if (!files.length) {
      return;
    }

    const validFiles = files.filter((file) => ALLOWED_REQUEST_PHOTO_TYPES.includes(file.type));

    if (validFiles.length !== files.length) {
      pushToast({
        tone: 'error',
        title: photoCopy.add,
        description: photoCopy.invalid,
      });
    }

    const availableSlots = Math.max(REQUEST_PHOTO_LIMIT - photos.length, 0);

    if (availableSlots === 0) {
      pushToast({
        tone: 'error',
        title: photoCopy.add,
        description: photoCopy.limitReached,
      });
      return;
    }

    const nextFiles = validFiles.slice(0, availableSlots);

    if (validFiles.length > availableSlots) {
      pushToast({
        tone: 'info',
        title: photoCopy.add,
        description: photoCopy.limitReached,
      });
    }

    if (!nextFiles.length) {
      return;
    }

    setPhotos((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const replacePhotoDraft = (index: number, file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!ALLOWED_REQUEST_PHOTO_TYPES.includes(file.type)) {
      pushToast({
        tone: 'error',
        title: photoCopy.change,
        description: photoCopy.invalid,
      });
      return;
    }

    setPhotos((current) =>
      current.map((photo, currentIndex) => {
        if (currentIndex !== index) {
          return photo;
        }

        URL.revokeObjectURL(photo.previewUrl);

        return {
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        };
      }),
    );
  };

  const handleAddPhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    appendPhotos(event.target.files);
    event.target.value = '';
  };

  const handleReplacePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (replacePhotoIndex === null) {
      event.target.value = '';
      return;
    }

    replacePhotoDraft(replacePhotoIndex, event.target.files?.[0]);
    setReplacePhotoIndex(null);
    event.target.value = '';
  };

  const runAnalysis = async () => {
    setAnalysisBusy(true);

    try {
      const result = await api.ai.analyzeRequest({
        title: form.title,
        description: form.description,
        cityId: form.cityId || undefined,
        districtId: form.districtId || undefined,
      });

      setAnalysis(result);

      if (!form.priority) {
        setForm((current) => ({ ...current, priority: result.priority }));
      }
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestForm.analysisFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setAnalysisBusy(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      pushToast({
        tone: 'error',
        title: copy.validationTitle,
        description: copy.validationDescription,
      });
      return;
    }

    setSubmitBusy(true);

    try {
      const result = await api.requests.create({
        title: form.title,
        description: form.description,
        categoryId: form.categoryId,
        cityId: form.cityId,
        districtId: form.districtId || undefined,
        organizationId: form.organizationId || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        priority: form.priority ? (form.priority as 'low' | 'medium' | 'high') : undefined,
      });

      let failedPhotoUploads = 0;

      for (const photo of photos) {
        try {
          await api.requests.addMedia(result.id, photo.file);
        } catch (_error) {
          failedPhotoUploads += 1;
        }
      }

      pushToast({
        tone: 'success',
        title: t('requestForm.submitSuccessTitle'),
        description: t('requestForm.submitSuccessDescription'),
      });

      if (failedPhotoUploads > 0) {
        pushToast({
          tone: 'info',
          title: photoCopy.partialTitle,
          description: photoCopy.partialDescription,
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

  const saveLocation = () => {
    if (parseCoordinate(locationDraft.latitude) === null || parseCoordinate(locationDraft.longitude) === null) {
      pushToast({
        tone: 'error',
        title: copy.validationTitle,
        description: copy.pointMissing,
      });
      return;
    }

    setForm((current) => ({
      ...current,
      latitude: locationDraft.latitude,
      longitude: locationDraft.longitude,
    }));
    closeModal();
  };

  const pickerCards = [
    {
      key: 'category' as const,
      icon: Layers3,
      label: t('common.category'),
      value: selectedCategory?.name ?? copy.noSelection,
      onClick: () => openModal('category'),
      toneClassName: selectedCategory ? 'is-active' : '',
    },
    {
      key: 'city' as const,
      icon: MapPinned,
      label: t('common.city'),
      value: selectedCity?.name ?? copy.noSelection,
      onClick: () => openModal('city'),
      toneClassName: selectedCity ? 'is-active' : '',
    },
    {
      key: 'district' as const,
      icon: MapPin,
      label: t('common.district'),
      value: selectedDistrict?.name ?? copy.optionalDistrict,
      onClick: () => openModal('district'),
      toneClassName: selectedDistrict ? 'is-active' : '',
    },
    {
      key: 'organization' as const,
      icon: Building2,
      label: t('common.organization'),
      value: selectedOrganization?.name ?? copy.optionalOrganization,
      onClick: () => openModal('organization'),
      toneClassName: selectedOrganization ? 'is-active' : '',
    },
    {
      key: 'priority' as const,
      icon: Target,
      label: t('common.priority'),
      value: form.priority ? formatPriorityLabel(form.priority as RequestPriority) : copy.autoPriority,
      onClick: () => openModal('priority'),
      toneClassName: form.priority ? 'is-active' : '',
    },
  ];

  const summaryItems = [
    { icon: Layers3, label: t('common.category'), value: selectedCategory?.name ?? copy.noSelection },
    { icon: MapPinned, label: t('common.city'), value: selectedCity?.name ?? copy.noSelection },
    { icon: MapPin, label: t('common.district'), value: selectedDistrict?.name ?? copy.optionalDistrict },
    { icon: Building2, label: t('common.organization'), value: selectedOrganization?.name ?? copy.optionalOrganization },
    {
      icon: Images,
      label: photoCopy.card,
      value: photos.length ? `${photos.length} / ${REQUEST_PHOTO_LIMIT}` : copy.noSelection,
    },
    {
      icon: Target,
      label: t('common.priority'),
      value: form.priority ? formatPriorityLabel(form.priority as RequestPriority) : copy.autoPriority,
    },
    {
      icon: LocateFixed,
      label: copy.coordinatesTitle,
      value: isLocationPicked ? `${form.latitude}, ${form.longitude}` : copy.pointMissing,
    },
  ];

  const renderPickerModal = () => {
    if (!modalState || modalState === 'map') {
      return null;
    }

    if (modalState === 'district' && !form.cityId) {
      return <EmptyState title={copy.districtEmptyTitle} description={copy.districtEmptyDescription} />;
    }

    if (modalState === 'organization' && (!form.cityId || !form.categoryId || organizations.length === 0)) {
      return <EmptyState title={copy.organizationEmptyTitle} description={copy.organizationEmptyDescription} />;
    }

    const optionClassName = 'request-create-modal__option';

    switch (modalState) {
      case 'category':
        return categories.length ? (
          <div className="request-create-modal__options">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`${optionClassName} ${form.categoryId === category.id ? 'is-active' : ''}`.trim()}
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    categoryId: category.id,
                    organizationId: '',
                  }));
                  closeModal();
                }}
              >
                <span className="request-create-modal__option-icon">
                  <Layers3 size={17} />
                </span>
                <span className="request-create-modal__option-copy">
                  <strong>{category.name}</strong>
                  <small>{category.description ?? t('common.notSpecified')}</small>
                </span>
                {form.categoryId === category.id ? <Check size={16} /> : null}
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title={copy.pickerEmptyTitle} description={copy.pickerEmptyDescription} />
        );
      case 'city':
        return cities.length ? (
          <div className="request-create-modal__options">
            {cities.map((city) => (
              <button
                key={city.id}
                type="button"
                className={`${optionClassName} ${form.cityId === city.id ? 'is-active' : ''}`.trim()}
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    cityId: city.id,
                    districtId: '',
                    organizationId: '',
                  }));
                  closeModal();
                }}
              >
                <span className="request-create-modal__option-icon">
                  <MapPinned size={17} />
                </span>
                <span className="request-create-modal__option-copy">
                  <strong>{city.name}</strong>
                  <small>{city.region ?? t('common.notSpecified')}</small>
                </span>
                {form.cityId === city.id ? <Check size={16} /> : null}
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title={copy.pickerEmptyTitle} description={copy.pickerEmptyDescription} />
        );
      case 'district':
        return (
          <div className="request-create-modal__options">
            <button
              type="button"
              className={`${optionClassName} ${!form.districtId ? 'is-active' : ''}`.trim()}
              onClick={() => {
                setForm((current) => ({ ...current, districtId: '' }));
                closeModal();
              }}
            >
              <span className="request-create-modal__option-icon">
                <MapPin size={17} />
              </span>
              <span className="request-create-modal__option-copy">
                <strong>{copy.optionalDistrict}</strong>
                <small>{selectedCity?.name ?? copy.noSelection}</small>
              </span>
              {!form.districtId ? <Check size={16} /> : null}
            </button>

            {districts.map((district) => (
              <button
                key={district.id}
                type="button"
                className={`${optionClassName} ${form.districtId === district.id ? 'is-active' : ''}`.trim()}
                onClick={() => {
                  setForm((current) => ({ ...current, districtId: district.id }));
                  closeModal();
                }}
              >
                <span className="request-create-modal__option-icon">
                  <MapPin size={17} />
                </span>
                <span className="request-create-modal__option-copy">
                  <strong>{district.name}</strong>
                  <small>{selectedCity?.name ?? copy.noSelection}</small>
                </span>
                {form.districtId === district.id ? <Check size={16} /> : null}
              </button>
            ))}
          </div>
        );
      case 'organization':
        return (
          <div className="request-create-modal__options">
            <button
              type="button"
              className={`${optionClassName} ${!form.organizationId ? 'is-active' : ''}`.trim()}
              onClick={() => {
                setForm((current) => ({ ...current, organizationId: '' }));
                closeModal();
              }}
            >
              <span className="request-create-modal__option-icon">
                <Building2 size={17} />
              </span>
              <span className="request-create-modal__option-copy">
                <strong>{copy.optionalOrganization}</strong>
                <small>{selectedCity?.name ?? copy.noSelection}</small>
              </span>
              {!form.organizationId ? <Check size={16} /> : null}
            </button>

            {organizations.map((organization) => (
              <button
                key={organization.id}
                type="button"
                className={`${optionClassName} ${form.organizationId === organization.id ? 'is-active' : ''}`.trim()}
                onClick={() => {
                  setForm((current) => ({ ...current, organizationId: organization.id }));
                  closeModal();
                }}
              >
                <span className="request-create-modal__option-icon">
                  <Building2 size={17} />
                </span>
                <span className="request-create-modal__option-copy">
                  <strong>{organization.name}</strong>
                  <small>{organization.address}</small>
                </span>
                {form.organizationId === organization.id ? <Check size={16} /> : null}
              </button>
            ))}
          </div>
        );
      case 'priority':
        return (
          <div className="request-create-modal__options">
            {priorityCards.map((priority) => {
              const Icon = priority.icon;

              return (
                <button
                  key={priority.value || 'auto'}
                  type="button"
                  className={`${optionClassName} ${form.priority === priority.value ? 'is-active' : ''}`.trim()}
                  onClick={() => {
                    setForm((current) => ({ ...current, priority: priority.value }));
                    closeModal();
                  }}
                >
                  <span className={`request-create-modal__option-icon request-create-modal__option-icon--${priority.toneClassName}`}>
                    <Icon size={17} />
                  </span>
                  <span className="request-create-modal__option-copy">
                    <strong>{priority.label}</strong>
                    <small>{copy.aiSuggested}</small>
                  </span>
                  {form.priority === priority.value ? <Check size={16} /> : null}
                </button>
              );
            })}
          </div>
        );
    }
  };

  const pickerTitle =
    modalState === 'category'
      ? copy.selectCategory
      : modalState === 'city'
        ? copy.selectCity
        : modalState === 'district'
          ? copy.selectDistrict
          : modalState === 'organization'
            ? copy.selectOrganization
            : modalState === 'priority'
              ? copy.selectPriority
              : '';

  if (loading) {
    return <LoadingState label={t('requestForm.loading')} />;
  }

  return (
    <div className="page request-create-page">
      <section className="page-header glass-card request-create-header">
        <div className="request-create-header__copy">
          <span className="eyebrow">{t('requestForm.eyebrow')}</span>
          <p>{copy.subtitle}</p>
        </div>
      </section>

      <div className="request-create-layout">
        <form id="request-create-form" className="request-create-main" onSubmit={submit}>
          <input
            ref={addPhotoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="request-create-photo-input"
            onChange={handleAddPhotos}
          />
          <input
            ref={replacePhotoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="request-create-photo-input"
            onChange={handleReplacePhoto}
          />

          <article className="request-create-card glass-card">
            <div className="request-create-card__head">
              <div className="request-create-card__title">
                <span className="request-create-card__glyph">
                  <FileText size={18} />
                </span>
                <div>
                  <h3>{copy.issueCard}</h3>
                </div>
              </div>
            </div>

            <div className="request-create-card__body request-create-card__body--stack">
              <InputField
                label={t('common.title')}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                minLength={4}
              />
              <TextareaField
                label={t('common.description')}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                required
                minLength={10}
              />
            </div>
          </article>

          <article className="request-create-card glass-card">
            <div className="request-create-card__head">
              <div className="request-create-card__title">
                <span className="request-create-card__glyph">
                  <Layers3 size={18} />
                </span>
                <div>
                  <h3>{copy.selectorsCard}</h3>
                </div>
              </div>
            </div>

            <div className="request-create-picker-grid">
              {pickerCards.map((picker) => {
                const Icon = picker.icon;

                return (
                  <button
                    key={picker.key}
                    type="button"
                    className={`request-create-picker ${picker.toneClassName}`.trim()}
                    onClick={picker.onClick}
                  >
                    <span className="request-create-picker__icon">
                      <Icon size={18} />
                    </span>
                    <span className="request-create-picker__copy">
                      <small>{picker.label}</small>
                      <strong>{picker.value}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="request-create-card glass-card">
            <div className="request-create-card__head">
              <div className="request-create-card__title">
                <span className="request-create-card__glyph">
                  <MapPinned size={18} />
                </span>
                <div>
                  <h3>{copy.locationCard}</h3>
                </div>
              </div>

              <Button type="button" variant="secondary" size="sm" onClick={() => openModal('map')}>
                {isLocationPicked ? copy.changePoint : copy.chooseOnMap}
              </Button>
            </div>

            <div className="request-create-map-card">
              <div className="request-create-map-card__viewport">
                <RequestLocationMap
                  latitude={form.latitude}
                  longitude={form.longitude}
                  fallbackLatitude={selectedCity?.latitude ?? null}
                  fallbackLongitude={selectedCity?.longitude ?? null}
                  className="request-create-map__viewport"
                />
                {!isLocationPicked ? (
                  <div className="request-create-map-card__empty">
                    <Crosshair size={20} />
                    <span>{copy.exactPoint}</span>
                  </div>
                ) : null}
              </div>

              <div className="request-create-map-card__meta">
                <span className="request-create-map-card__chip">
                  <LocateFixed size={14} />
                  {isLocationPicked ? `${form.latitude}, ${form.longitude}` : copy.pointMissing}
                </span>
              </div>
            </div>
          </article>

          <article className="request-create-card glass-card">
            <div className="request-create-card__head">
              <div className="request-create-card__title">
                <span className="request-create-card__glyph">
                  <Images size={18} />
                </span>
                <div>
                  <h3>{photoCopy.card}</h3>
                </div>
              </div>

              <div className="request-create-photo-card__actions">
                <Badge tone="accent">{`${photos.length}/${REQUEST_PHOTO_LIMIT}`}</Badge>
                <Button type="button" variant="secondary" size="sm" onClick={() => addPhotoInputRef.current?.click()}>
                  <ImagePlus size={16} />
                  {photoCopy.add}
                </Button>
              </div>
            </div>

            <div className="request-create-photo-card">
              {photos.length ? (
                <div className="request-create-photo-grid">
                  {photos.map((photo, index) => (
                    <article key={photo.id} className="request-create-photo-tile">
                      <img src={photo.previewUrl} alt={`${photoCopy.card} ${index + 1}`} className="request-create-photo-tile__image" />
                      <div className="request-create-photo-tile__overlay">
                        <button
                          type="button"
                          className="request-create-photo-tile__action"
                          onClick={() => setPhotoPreviewIndex(index)}
                          title={photoCopy.preview}
                          aria-label={photoCopy.preview}
                        >
                          <Maximize2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="request-create-photo-tile__action"
                          onClick={() => {
                            setReplacePhotoIndex(index);
                            replacePhotoInputRef.current?.click();
                          }}
                          title={photoCopy.change}
                          aria-label={photoCopy.change}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="request-create-photo-tile__action request-create-photo-tile__action--danger"
                          onClick={() => removePhotoDraft(index)}
                          title={photoCopy.remove}
                          aria-label={photoCopy.remove}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="request-create-photo-empty">
                  <Images size={20} />
                  <strong>{photoCopy.empty}</strong>
                  <span>{photoCopy.limit}</span>
                </div>
              )}
            </div>
          </article>
        </form>

        <aside className="request-create-side">
          <article className="request-create-side__card glass-card">
            <div className="request-create-card__head">
              <div className="request-create-card__title">
                <span className="request-create-card__glyph">
                  <Target size={18} />
                </span>
                <div>
                  <h3>{copy.summaryCard}</h3>
                </div>
              </div>
              <Badge tone={canSubmit ? 'success' : 'warning'}>{canSubmit ? copy.ready : copy.pending}</Badge>
            </div>

            <div className="request-create-summary">
              {summaryItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="request-create-summary__item">
                    <span className="request-create-summary__icon">
                      <Icon size={16} />
                    </span>
                    <div className="request-create-summary__copy">
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="request-create-side__actions">
              <Button
                type="button"
                variant="secondary"
                busy={analysisBusy}
                block
                onClick={runAnalysis}
                disabled={form.title.trim().length < 4 || form.description.trim().length < 10}
              >
                <Sparkles size={16} />
                {copy.useAi}
              </Button>
              <Button type="submit" form="request-create-form" busy={submitBusy} block>
                <Navigation size={16} />
                {copy.submit}
              </Button>
            </div>
          </article>

          <article className="request-create-side__card glass-card">
            <div className="request-create-card__head">
              <div className="request-create-card__title">
                <span className="request-create-card__glyph">
                  <Bot size={18} />
                </span>
                <div>
                  <h3>{copy.analysisCard}</h3>
                </div>
              </div>
            </div>

            {analysis ? (
              <div className="request-create-analysis">
                <div className="request-create-analysis__badges">
                  <Badge tone="accent">{analysis.issueType}</Badge>
                  <Badge tone="warning">{formatPriorityLabel(analysis.priority)}</Badge>
                </div>
                <p className="request-create-analysis__summary">{analysis.summary}</p>
                <div className="request-create-analysis__grid">
                  <div className="request-create-analysis__item">
                    <small>{t('common.suggestedCategory')}</small>
                    <strong>{analysis.suggestedCategory?.name ?? copy.noSelection}</strong>
                  </div>
                  <div className="request-create-analysis__item">
                    <small>{t('common.suggestedOrganization')}</small>
                    <strong>{analysis.suggestedOrganization?.name ?? copy.optionalOrganization}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="request-create-analysis request-create-analysis--empty">
                <Sparkles size={20} />
                <strong>{copy.analysisEmpty}</strong>
                <p>{copy.analysisHint}</p>
              </div>
            )}
          </article>
        </aside>
      </div>

      {previewPhoto ? (
        <div className="profile-modal request-create-modal-shell" role="dialog" aria-modal="true" aria-labelledby="request-create-photo-preview-title">
          <button
            type="button"
            className="profile-modal__backdrop"
            aria-label={t('common.close')}
            onClick={() => {
              setPhotoPreviewIndex(null);
              setReplacePhotoIndex(null);
            }}
          />
          <article className="profile-modal__card glass-card request-create-modal request-create-modal--photo">
            <div className="profile-modal__header">
              <h3 id="request-create-photo-preview-title">{photoCopy.preview}</h3>
              <button
                type="button"
                className="profile-modal__close"
                onClick={() => {
                  setPhotoPreviewIndex(null);
                  setReplacePhotoIndex(null);
                }}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="request-create-photo-preview">
              <div className="request-create-photo-preview__image-wrap">
                <img src={previewPhoto.previewUrl} alt={previewPhoto.file.name} className="request-create-photo-preview__image" />
              </div>
              <div className="request-create-photo-preview__meta">
                <strong>{previewPhoto.file.name}</strong>
                <span>{`${photoPreviewIndex! + 1} / ${photos.length}`}</span>
              </div>
            </div>

            <div className="profile-modal__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setReplacePhotoIndex(photoPreviewIndex!);
                  replacePhotoInputRef.current?.click();
                }}
              >
                <Pencil size={16} />
                {photoCopy.change}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  removePhotoDraft(photoPreviewIndex!);
                }}
              >
                <Trash2 size={16} />
                {photoCopy.remove}
              </Button>
            </div>
          </article>
        </div>
      ) : null}

      {modalState === 'map' ? (
        <div className="profile-modal request-create-modal-shell" role="dialog" aria-modal="true" aria-labelledby="request-create-map-modal-title">
          <button type="button" className="profile-modal__backdrop" aria-label={copy.cancel} onClick={closeModal} />
          <article className="profile-modal__card glass-card request-create-modal request-create-modal--map">
            <div className="profile-modal__header">
              <h3 id="request-create-map-modal-title">{copy.mapModalTitle}</h3>
              <button type="button" className="profile-modal__close" onClick={closeModal} aria-label={copy.cancel}>
                <X size={18} />
              </button>
            </div>

            <div className="request-create-map-modal__layout">
              <div className="request-create-map-modal__map">
                <RequestLocationMap
                  latitude={locationDraft.latitude}
                  longitude={locationDraft.longitude}
                  fallbackLatitude={selectedCity?.latitude ?? null}
                  fallbackLongitude={selectedCity?.longitude ?? null}
                  interactive
                  onSelect={(latitude, longitude) => setLocationDraft({ latitude, longitude })}
                  className="request-create-map__viewport request-create-map__viewport--modal"
                />
              </div>

              <div className="request-create-map-modal__form">
                <InputField
                  label={t('common.latitude')}
                  value={locationDraft.latitude}
                  onChange={(event) => setLocationDraft((current) => ({ ...current, latitude: event.target.value }))}
                />
                <InputField
                  label={t('common.longitude')}
                  value={locationDraft.longitude}
                  onChange={(event) => setLocationDraft((current) => ({ ...current, longitude: event.target.value }))}
                />
                <div className="request-create-map-modal__hint">
                  <MapPin size={15} />
                  <span>{copy.exactPoint}</span>
                </div>
              </div>
            </div>

            <div className="profile-modal__actions">
              <Button type="button" variant="ghost" onClick={closeModal}>
                {copy.cancel}
              </Button>
              <Button type="button" onClick={saveLocation}>
                {copy.savePoint}
              </Button>
            </div>
          </article>
        </div>
      ) : modalState ? (
        <div className="profile-modal request-create-modal-shell" role="dialog" aria-modal="true" aria-labelledby="request-create-picker-modal-title">
          <button type="button" className="profile-modal__backdrop" aria-label={copy.cancel} onClick={closeModal} />
          <article className="profile-modal__card glass-card request-create-modal">
            <div className="profile-modal__header">
              <h3 id="request-create-picker-modal-title">{pickerTitle}</h3>
              <button type="button" className="profile-modal__close" onClick={closeModal} aria-label={copy.cancel}>
                <X size={18} />
              </button>
            </div>
            {renderPickerModal()}
          </article>
        </div>
      ) : null}
    </div>
  );
};
