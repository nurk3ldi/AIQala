import { Building2, CircleOff, Layers3, MapPin, Pencil, Phone, Power, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { ImageUp, Trash2 } from 'lucide-react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Eye } from 'lucide-react';
import type { AppShellOutletContext } from '../components/layout/AppShellBare';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { InputField, SelectField, TextareaField } from '../components/ui/Fields';
import { LoadingState } from '../components/ui/LoadingState';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { resolveFileUrl } from '../lib/format';
import type { Language } from '../lib/i18n';
import type { Category, City, District, Organization } from '../types/api';

type ModalState =
  | { type: 'create-organization' }
  | { type: 'edit-organization'; organizationId: string }
  | { type: 'create-account'; organizationId: string }
  | { type: 'organization-details'; organizationId: string }
  | { type: 'filters' }
  | null;

type OrganizationFilter = 'all' | 'active' | 'inactive';

type ConfirmState =
  | { type: 'organization-toggle'; organization: Organization }
  | { type: 'account-toggle'; organizationId: string; accountId: string; isActive: boolean }
  | null;

const initialOrganizationForm = () => ({
  name: '',
  description: '',
  cityId: '',
  districtId: '',
  address: '',
  phone: '',
  categoryIds: [] as string[],
  account: {
    fullName: '',
    email: '',
    password: '',
  },
});

const initialAccountForm = () => ({
  fullName: '',
  email: '',
  password: '',
});

const ORGANIZATIONS_POLISH_UI: Record<
  Language,
  {
    subtitle: string;
    chooseCityTitle: string;
    chooseCityDescription: string;
    filteredTitle: string;
    filteredDescription: string;
    detailsAction: string;
    detailsTitle: string;
    searchPlaceholder: string;
    filterAction: string;
    filterTitle: string;
    filterStatus: string;
    filterCategory: string;
    clear: string;
    apply: string;
    photoTitle: string;
    addPhoto: string;
    changePhoto: string;
    removePhoto: string;
    photoUploadFailed: string;
    tabs: {
      all: string;
      active: string;
      inactive: string;
    };
    empty: {
      activeTitle: string;
      activeDescription: string;
      inactiveTitle: string;
      inactiveDescription: string;
    };
    confirm: {
      cancel: string;
      confirm: string;
      disableOrganizationTitle: string;
      disableOrganizationDescription: string;
      enableOrganizationTitle: string;
      enableOrganizationDescription: string;
      disableAccountTitle: string;
      disableAccountDescription: string;
      enableAccountTitle: string;
      enableAccountDescription: string;
    };
  }
> = {
  kk: {
    subtitle: 'Ұйымдар мен оператор аккаунттарын осы жерден ықшам басқарасыз.',
    chooseCityTitle: 'Қаланы таңдаңыз',
    chooseCityDescription: 'Ұйымдар тізімі шығуы үшін жоғарғы панельден қаланы таңдаңыз.',
    filteredTitle: 'Сәйкес ұйым табылмады',
    filteredDescription: 'Іздеуді немесе фильтрді өзгертіп көріңіз.',
    detailsAction: 'Ақпаратты ашу',
    detailsTitle: 'Ұйым ақпараты',
    searchPlaceholder: 'Ұйымды іздеу',
    filterAction: 'Фильтр',
    filterTitle: 'Ұйым фильтрі',
    filterStatus: 'Күйі',
    filterCategory: 'Санаты',
    clear: 'Тазалау',
    apply: 'Қолдану',
    photoTitle: 'Ұйым фотосы',
    addPhoto: 'Фото жүктеу',
    changePhoto: 'Фото өзгерту',
    removePhoto: 'Фотоны жою',
    photoUploadFailed: 'Фотоны сақтау сәтсіз аяқталды',
    tabs: {
      all: 'Барлығы',
      active: 'Белсенді',
      inactive: 'Өшірілген',
    },
    empty: {
      activeTitle: 'Белсенді ұйым жоқ',
      activeDescription: 'Белсенді ұйымдар осы тізімде көрінеді.',
      inactiveTitle: 'Өшірілген ұйым жоқ',
      inactiveDescription: 'Өшірілген ұйымдар осы тізімде көрінеді.',
    },
    confirm: {
      cancel: 'Бас тарту',
      confirm: 'Растау',
      disableOrganizationTitle: 'Ұйымды өшіру',
      disableOrganizationDescription: 'Осы ұйымды уақытша өшіргіңіз келе ме?',
      enableOrganizationTitle: 'Ұйымды қосу',
      enableOrganizationDescription: 'Осы ұйымды қайта қосуды растайсыз ба?',
      disableAccountTitle: 'Операторды өшіру',
      disableAccountDescription: 'Осы оператор аккаунтын уақытша өшіргіңіз келе ме?',
      enableAccountTitle: 'Операторды қосу',
      enableAccountDescription: 'Осы оператор аккаунтын қайта қосуды растайсыз ба?',
    },
  },
  ru: {
    subtitle: 'Компактная панель для организаций и операторских аккаунтов.',
    chooseCityTitle: 'Выберите город',
    chooseCityDescription: 'Чтобы увидеть список организаций, выберите город на верхней панели.',
    filteredTitle: 'Организации не найдены',
    filteredDescription: 'Измените поиск или параметры фильтра.',
    detailsAction: 'Открыть информацию',
    detailsTitle: 'Информация об организации',
    searchPlaceholder: 'Поиск организации',
    filterAction: 'Фильтр',
    filterTitle: 'Фильтр организаций',
    filterStatus: 'Статус',
    filterCategory: 'Категория',
    clear: 'Сбросить',
    apply: 'Применить',
    photoTitle: 'Фото организации',
    addPhoto: 'Загрузить фото',
    changePhoto: 'Изменить фото',
    removePhoto: 'Удалить фото',
    photoUploadFailed: 'Не удалось сохранить фото',
    tabs: {
      all: 'Все',
      active: 'Активные',
      inactive: 'Отключенные',
    },
    empty: {
      activeTitle: 'Нет активных организаций',
      activeDescription: 'Активные организации появятся в этом списке.',
      inactiveTitle: 'Нет отключенных организаций',
      inactiveDescription: 'Отключенные организации появятся в этом списке.',
    },
    confirm: {
      cancel: 'Отмена',
      confirm: 'Подтвердить',
      disableOrganizationTitle: 'Отключить организацию',
      disableOrganizationDescription: 'Временно отключить эту организацию?',
      enableOrganizationTitle: 'Включить организацию',
      enableOrganizationDescription: 'Подтвердите повторное включение организации.',
      disableAccountTitle: 'Отключить оператора',
      disableAccountDescription: 'Временно отключить этот операторский аккаунт?',
      enableAccountTitle: 'Включить оператора',
      enableAccountDescription: 'Подтвердите повторное включение операторского аккаунта.',
    },
  },
  en: {
    subtitle: 'Compact control over organizations and operator accounts.',
    chooseCityTitle: 'Choose a city',
    chooseCityDescription: 'Select a city from the top bar to see organizations.',
    filteredTitle: 'No organizations found',
    filteredDescription: 'Adjust the search or filter options.',
    detailsAction: 'Open details',
    detailsTitle: 'Organization details',
    searchPlaceholder: 'Search organizations',
    filterAction: 'Filter',
    filterTitle: 'Organization filter',
    filterStatus: 'Status',
    filterCategory: 'Category',
    clear: 'Clear',
    apply: 'Apply',
    photoTitle: 'Organization photo',
    addPhoto: 'Upload photo',
    changePhoto: 'Change photo',
    removePhoto: 'Remove photo',
    photoUploadFailed: 'Failed to save photo',
    tabs: {
      all: 'All',
      active: 'Active',
      inactive: 'Disabled',
    },
    empty: {
      activeTitle: 'No active organizations',
      activeDescription: 'Active organizations will appear in this list.',
      inactiveTitle: 'No disabled organizations',
      inactiveDescription: 'Disabled organizations will appear in this list.',
    },
    confirm: {
      cancel: 'Cancel',
      confirm: 'Confirm',
      disableOrganizationTitle: 'Disable organization',
      disableOrganizationDescription: 'Do you want to temporarily disable this organization?',
      enableOrganizationTitle: 'Enable organization',
      enableOrganizationDescription: 'Confirm enabling this organization again.',
      disableAccountTitle: 'Disable operator',
      disableAccountDescription: 'Do you want to temporarily disable this operator account?',
      enableAccountTitle: 'Enable operator',
      enableAccountDescription: 'Confirm enabling this operator account again.',
    },
  },
};

const ORGANIZATIONS_UI: Record<
  Language,
  {
    subtitle: string;
    createOrganization: string;
    createAccount: string;
    activate: string;
    deactivate: string;
    emptyTitle: string;
    emptyDescription: string;
    workspaceTitle: string;
    workspaceDescription: string;
    noDescription: string;
    noCategories: string;
    allDistricts: string;
    noPhone: string;
    noAddress: string;
    linkedCategories: string;
    primaryAccount: string;
    accounts: string;
    operatorCount: string;
    categoryCount: string;
    modal: {
      createOrganization: string;
      editOrganization: string;
      createAccount: string;
      cancel: string;
    };
    actions: {
      edit: string;
      toggle: string;
      createAccount: string;
    };
    accountsEmpty: {
      title: string;
      description: string;
    };
  }
> = {
  kk: {
    subtitle: 'Т°Р№С‹РјРґР°СЂ РјРµРЅ РѕРїРµСЂР°С‚РѕСЂ Р°РєРєР°СѓРЅС‚С‚Р°СЂС‹РЅ С‹Т›С€Р°Рј Р±Р°СЃТ›Р°СЂСѓ Р°Р№РјР°Т“С‹.',
    createOrganization: 'Р–Р°ТЈР° Т±Р№С‹Рј',
    createAccount: 'Р–Р°ТЈР° РѕРїРµСЂР°С‚РѕСЂ',
    activate: 'Р†СЃРєРµ Т›РѕСЃСѓ',
    deactivate: 'РЎУ©РЅРґС–СЂСѓ',
    emptyTitle: 'Т°Р№С‹РјРґР°СЂ Р¶РѕТ›',
    emptyDescription: 'РђР»Т“Р°С€Т›С‹ Т±Р№С‹РјРґС‹ Т›РѕСЃС‹Рї, Р±Р°Т“С‹С‚С‚Р°СѓРґС‹ С–СЃРєРµ Т›РѕСЃС‹ТЈС‹Р·.',
    workspaceTitle: 'Р–Т±РјС‹СЃ Р°Р№РјР°Т“С‹',
    workspaceDescription: 'РўР°ТЈРґР°Р»Т“Р°РЅ Т±Р№С‹РјРЅС‹ТЈ РЅРµРіС–Р·РіС– РїР°СЂР°РјРµС‚СЂР»РµСЂС– РјРµРЅ Р°РєРєР°СѓРЅС‚С‚Р°СЂС‹.',
    noDescription: 'РЎРёРїР°С‚С‚Р°РјР° Р¶РѕТ›',
    noCategories: 'РЎР°РЅР°С‚ Р±Р°Р№Р»Р°РЅР±Р°Т“Р°РЅ',
    allDistricts: 'Р‘Р°СЂР»С‹Т› Р°СѓРґР°РЅ',
    noPhone: 'РўРµР»РµС„РѕРЅ Р¶РѕТ›',
    noAddress: 'РњРµРєРµРЅР¶Р°Р№ Р¶РѕТ›',
    linkedCategories: 'Р‘РµРєС–С‚С–Р»РіРµРЅ СЃР°РЅР°С‚С‚Р°СЂ',
    primaryAccount: 'Р‘Р°СЃС‚Р°РїТ›С‹ Р°РєРєР°СѓРЅС‚',
    accounts: 'РћРїРµСЂР°С‚РѕСЂР»Р°СЂ',
    operatorCount: 'РћРїРµСЂР°С‚РѕСЂ',
    categoryCount: 'РЎР°РЅР°С‚',
    modal: {
      createOrganization: 'Р–Р°ТЈР° Т±Р№С‹Рј',
      editOrganization: 'Т°Р№С‹РјРґС‹ У©ТЈРґРµСѓ',
      createAccount: 'Р–Р°ТЈР° РѕРїРµСЂР°С‚РѕСЂ',
      cancel: 'Р‘Р°СЃ С‚Р°СЂС‚Сѓ',
    },
    actions: {
      edit: 'УЁТЈРґРµСѓ',
      toggle: 'РљТЇР№С–РЅ У©Р·РіРµСЂС‚Сѓ',
      createAccount: 'РћРїРµСЂР°С‚РѕСЂ Т›РѕСЃСѓ',
    },
    accountsEmpty: {
      title: 'РћРїРµСЂР°С‚РѕСЂР»Р°СЂ Р¶РѕТ›',
      description: 'РћСЃС‹ Т±Р№С‹РјТ“Р° Р°Р»Т“Р°С€Т›С‹ РѕРїРµСЂР°С‚РѕСЂ Р°РєРєР°СѓРЅС‚С‹РЅ Т›РѕСЃС‹ТЈС‹Р·.',
    },
  },
  ru: {
    subtitle: 'РљРѕРјРїР°РєС‚РЅР°СЏ РїР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ РѕСЂРіР°РЅРёР·Р°С†РёСЏРјРё Рё РѕРїРµСЂР°С‚РѕСЂСЃРєРёРјРё Р°РєРєР°СѓРЅС‚Р°РјРё.',
    createOrganization: 'РќРѕРІР°СЏ РѕСЂРіР°РЅРёР·Р°С†РёСЏ',
    createAccount: 'РќРѕРІС‹Р№ РѕРїРµСЂР°С‚РѕСЂ',
    activate: 'Р’РєР»СЋС‡РёС‚СЊ',
    deactivate: 'РћС‚РєР»СЋС‡РёС‚СЊ',
    emptyTitle: 'РћСЂРіР°РЅРёР·Р°С†РёР№ РЅРµС‚',
    emptyDescription: 'Р”РѕР±Р°РІСЊС‚Рµ РїРµСЂРІСѓСЋ РѕСЂРіР°РЅРёР·Р°С†РёСЋ, С‡С‚РѕР±С‹ Р·Р°РїСѓСЃС‚РёС‚СЊ РјР°СЂС€СЂСѓС‚РёР·Р°С†РёСЋ.',
    workspaceTitle: 'Р Р°Р±РѕС‡Р°СЏ Р·РѕРЅР°',
    workspaceDescription: 'РљР»СЋС‡РµРІС‹Рµ РїР°СЂР°РјРµС‚СЂС‹ Рё Р°РєРєР°СѓРЅС‚С‹ РІС‹Р±СЂР°РЅРЅРѕР№ РѕСЂРіР°РЅРёР·Р°С†РёРё.',
    noDescription: 'РќРµС‚ РѕРїРёСЃР°РЅРёСЏ',
    noCategories: 'РљР°С‚РµРіРѕСЂРёРё РЅРµ РїСЂРёРІСЏР·Р°РЅС‹',
    allDistricts: 'Р’СЃРµ СЂР°Р№РѕРЅС‹',
    noPhone: 'Р‘РµР· С‚РµР»РµС„РѕРЅР°',
    noAddress: 'Р‘РµР· Р°РґСЂРµСЃР°',
    linkedCategories: 'РџСЂРёРІСЏР·Р°РЅРЅС‹Рµ РєР°С‚РµРіРѕСЂРёРё',
    primaryAccount: 'РћСЃРЅРѕРІРЅРѕР№ Р°РєРєР°СѓРЅС‚',
    accounts: 'РћРїРµСЂР°С‚РѕСЂС‹',
    operatorCount: 'РћРїРµСЂР°С‚РѕСЂ',
    categoryCount: 'РљР°С‚РµРіРѕСЂРёСЏ',
    modal: {
      createOrganization: 'РќРѕРІР°СЏ РѕСЂРіР°РЅРёР·Р°С†РёСЏ',
      editOrganization: 'Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РѕСЂРіР°РЅРёР·Р°С†РёРё',
      createAccount: 'РќРѕРІС‹Р№ РѕРїРµСЂР°С‚РѕСЂ',
      cancel: 'РћС‚РјРµРЅР°',
    },
    actions: {
      edit: 'Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ',
      toggle: 'РР·РјРµРЅРёС‚СЊ СЃС‚Р°С‚СѓСЃ',
      createAccount: 'Р”РѕР±Р°РІРёС‚СЊ РѕРїРµСЂР°С‚РѕСЂР°',
    },
    accountsEmpty: {
      title: 'РћРїРµСЂР°С‚РѕСЂРѕРІ РЅРµС‚',
      description: 'Р”РѕР±Р°РІСЊС‚Рµ РїРµСЂРІС‹Р№ РѕРїРµСЂР°С‚РѕСЂСЃРєРёР№ Р°РєРєР°СѓРЅС‚ РґР»СЏ СЌС‚РѕР№ РѕСЂРіР°РЅРёР·Р°С†РёРё.',
    },
  },
  en: {
    subtitle: 'A compact control surface for organizations and operator accounts.',
    createOrganization: 'New organization',
    createAccount: 'New operator',
    activate: 'Enable',
    deactivate: 'Disable',
    emptyTitle: 'No organizations yet',
    emptyDescription: 'Create the first organization to start routing requests.',
    workspaceTitle: 'Workspace',
    workspaceDescription: 'Core settings and linked accounts for the selected organization.',
    noDescription: 'No description',
    noCategories: 'No linked categories',
    allDistricts: 'All districts',
    noPhone: 'No phone',
    noAddress: 'No address',
    linkedCategories: 'Linked categories',
    primaryAccount: 'Primary account',
    accounts: 'Operators',
    operatorCount: 'Operators',
    categoryCount: 'Categories',
    modal: {
      createOrganization: 'New organization',
      editOrganization: 'Edit organization',
      createAccount: 'New operator',
      cancel: 'Cancel',
    },
    actions: {
      edit: 'Edit',
      toggle: 'Toggle status',
      createAccount: 'Add operator',
    },
    accountsEmpty: {
      title: 'No operators yet',
      description: 'Add the first operator account for this organization.',
    },
  },
};

const toggleCategoryId = (items: string[], categoryId: string) =>
  items.includes(categoryId) ? items.filter((item) => item !== categoryId) : [...items, categoryId];

const getAvatarLetter = (value: string) => value.trim().charAt(0).toUpperCase() || 'O';

export const OrganizationsPage = () => {
  const { language, t } = useTranslation();
  const { pushToast } = useToast();
  const { selectedCityId } = useOutletContext<AppShellOutletContext>();
  const baseCopy = ORGANIZATIONS_UI[language];
  const polishCopy = ORGANIZATIONS_POLISH_UI[language];
  const copy = {
    ...baseCopy,
    subtitle: polishCopy.subtitle,
    createOrganization: t('organizations.createTitle'),
    createAccount: t('organizations.createAccount'),
    activate: t('organizations.enableOrganization'),
    deactivate: t('organizations.disableOrganization'),
    emptyTitle: t('organizations.emptyTitle'),
    emptyDescription: t('organizations.emptyDescription'),
    workspaceTitle: t('organizations.selectedEyebrow'),
    workspaceDescription: t('organizations.accessTitle'),
    noDescription: t('common.notSpecified'),
    noCategories: t('organizations.noCategories'),
    allDistricts: t('organizationProfile.allDistricts'),
    noPhone: t('common.notSpecified'),
    noAddress: t('common.notSpecified'),
    linkedCategories: t('organizations.categoriesTitle'),
    primaryAccount: t('organizations.primaryAccountTitle'),
    accounts: t('organizations.accessTitle'),
    operatorCount: t('organizations.accessEyebrow'),
    categoryCount: t('organizations.categoriesTitle'),
    modal: {
      ...baseCopy.modal,
      createOrganization: t('organizations.createTitle'),
      editOrganization: t('common.edit'),
      createAccount: t('organizations.createAccount'),
      cancel: polishCopy.confirm.cancel,
    },
    actions: {
      ...baseCopy.actions,
      edit: t('common.edit'),
      toggle: t('common.update'),
      createAccount: t('organizations.createAccount'),
    },
    accountsEmpty: {
      title: t('organizationProfile.emptyTitle'),
      description: t('organizationProfile.emptyDescription'),
    },
  };
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [organizationDistricts, setOrganizationDistricts] = useState<District[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [organizationForm, setOrganizationForm] = useState(initialOrganizationForm());
  const [accountForm, setAccountForm] = useState(initialAccountForm());
  const [modalState, setModalState] = useState<ModalState>(null);
  const [organizationLogoFile, setOrganizationLogoFile] = useState<File | null>(null);
  const [organizationLogoPreview, setOrganizationLogoPreview] = useState<string | null>(null);
  const [organizationLogoRemoved, setOrganizationLogoRemoved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<OrganizationFilter>('all');
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [filterDraft, setFilterDraft] = useState<{ status: OrganizationFilter; categoryId: string }>({
    status: 'all',
    categoryId: '',
  });
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirming, setConfirming] = useState(false);
  const organizationLogoInputRef = useRef<HTMLInputElement | null>(null);

  const resetOrganizationLogoState = () => {
    if (organizationLogoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(organizationLogoPreview);
    }

    setOrganizationLogoFile(null);
    setOrganizationLogoPreview(null);
    setOrganizationLogoRemoved(false);

    if (organizationLogoInputRef.current) {
      organizationLogoInputRef.current.value = '';
    }
  };

  const hydrateOrganizationLogoState = (organization?: Organization | null) => {
    if (organizationLogoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(organizationLogoPreview);
    }

    setOrganizationLogoFile(null);
    setOrganizationLogoPreview(organization?.logoUrl ?? null);
    setOrganizationLogoRemoved(false);

    if (organizationLogoInputRef.current) {
      organizationLogoInputRef.current.value = '';
    }
  };

  const hydrateOrganizationForm = (organization: Organization) => {
    setOrganizationForm({
      name: organization.name,
      description: organization.description ?? '',
      cityId: organization.cityId,
      districtId: organization.districtId ?? '',
      address: organization.address,
      phone: organization.phone ?? '',
      categoryIds: (organization.categories ?? []).map((item) => item.id),
      account: {
        fullName: '',
        email: '',
        password: '',
      },
    });
  };

  const refreshOrganizations = async (preserveId?: string) => {
    const [categoryResult, cityResult] = await Promise.all([api.categories.list(), api.locations.cities.list()]);

    setCategories(categoryResult);
    setCities(cityResult);

    if (!selectedCityId) {
      setOrganizations([]);
      setSelectedOrganizationId('');
      setSelectedOrganization(null);
      return;
    }

    const organizationResult = await api.organizations.list({ page: 1, limit: 100, cityId: selectedCityId });
    setOrganizations(organizationResult.items);

    const candidateId = preserveId ?? selectedOrganizationId ?? '';
    const nextId = organizationResult.items.some((organization) => organization.id === candidateId) ? candidateId : '';

    if (!nextId) {
      setSelectedOrganizationId('');
      setSelectedOrganization(null);
      return;
    }

    const detail = await api.organizations.detail(nextId);
    setSelectedOrganization(detail);
    setSelectedOrganizationId(detail.id);
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await refreshOrganizations();
      } catch (error) {
        if (active) {
          pushToast({
            tone: 'error',
            title: t('organizations.loadFailed'),
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
  }, [pushToast, selectedCityId, t]);

  useEffect(() => {
    if (!organizationForm.cityId) {
      setOrganizationDistricts([]);
      setOrganizationForm((current) => (current.districtId ? { ...current, districtId: '' } : current));
      return;
    }

    let active = true;

    void api.locations.districts
      .list({ cityId: organizationForm.cityId })
      .then((items) => {
        if (!active) {
          return;
        }

        setOrganizationDistricts(items);
        setOrganizationForm((current) =>
          current.districtId && !items.some((district) => district.id === current.districtId)
            ? { ...current, districtId: '' }
            : current,
        );
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [organizationForm.cityId]);

  useEffect(
    () => () => {
      if (organizationLogoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(organizationLogoPreview);
      }
    },
    [organizationLogoPreview],
  );

  const closeModal = () => {
    resetOrganizationLogoState();
    setModalState(null);
    setSubmitting(false);
  };

  const closeConfirm = () => {
    setConfirmState(null);
    setConfirming(false);
  };

  const openCreateOrganization = () => {
    setOrganizationForm(initialOrganizationForm());
    setOrganizationDistricts([]);
    resetOrganizationLogoState();
    setModalState({ type: 'create-organization' });
  };

  const openEditOrganization = async (organizationId: string) => {
    try {
      const detail =
        selectedOrganization?.id === organizationId ? selectedOrganization : await api.organizations.detail(organizationId);

      setSelectedOrganizationId(detail.id);
      setSelectedOrganization(detail);
      hydrateOrganizationForm(detail);
      hydrateOrganizationLogoState(detail);
      setModalState({ type: 'edit-organization', organizationId });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('organizations.selectFailed'),
        description: getErrorMessage(error),
      });
    }
  };

  const openCreateAccount = (organizationId: string) => {
    setAccountForm(initialAccountForm());
    setModalState({ type: 'create-account', organizationId });
  };

  const openFilters = () => {
    setFilterDraft({
      status: activeFilter,
      categoryId: activeCategoryId,
    });
    setModalState({ type: 'filters' });
  };

  const openOrganizationDetails = async (organizationId: string) => {
    try {
      const detail =
        selectedOrganization?.id === organizationId ? selectedOrganization : await api.organizations.detail(organizationId);

      setSelectedOrganizationId(detail.id);
      setSelectedOrganization(detail);
      setModalState({ type: 'organization-details', organizationId });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('organizations.selectFailed'),
        description: getErrorMessage(error),
      });
    }
  };

  const openOrganizationToggleConfirm = (organization: Organization) => {
    setConfirmState({ type: 'organization-toggle', organization });
  };

  const openAccountToggleConfirm = (accountId: string, isActive: boolean) => {
    if (!selectedOrganizationId) {
      return;
    }

    setConfirmState({
      type: 'account-toggle',
      organizationId: selectedOrganizationId,
      accountId,
      isActive,
    });
  };

  const handleOrganizationLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (organizationLogoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(organizationLogoPreview);
    }

    setOrganizationLogoFile(file);
    setOrganizationLogoPreview(URL.createObjectURL(file));
    setOrganizationLogoRemoved(false);
  };

  const removeOrganizationLogo = () => {
    if (organizationLogoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(organizationLogoPreview);
    }

    setOrganizationLogoFile(null);
    setOrganizationLogoPreview(null);
    setOrganizationLogoRemoved(true);

    if (organizationLogoInputRef.current) {
      organizationLogoInputRef.current.value = '';
    }
  };

  const syncOrganizationLogo = async (organizationId: string) => {
    if (organizationLogoFile) {
      await api.organizations.uploadLogo(organizationId, organizationLogoFile);
      return;
    }

    if (organizationLogoRemoved) {
      await api.organizations.deleteLogo(organizationId);
    }
  };

  const submitOrganizationModal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modalState || (modalState.type !== 'create-organization' && modalState.type !== 'edit-organization')) {
      return;
    }

    setSubmitting(true);

    try {
      if (modalState.type === 'create-organization') {
        const created = await api.organizations.create({
          name: organizationForm.name,
          description: organizationForm.description || undefined,
          cityId: organizationForm.cityId,
          districtId: organizationForm.districtId || undefined,
          address: organizationForm.address,
          phone: organizationForm.phone || undefined,
          categoryIds: organizationForm.categoryIds,
          account: organizationForm.account,
        });

        try {
          await syncOrganizationLogo(created.id);
        } catch (error) {
          pushToast({
            tone: 'error',
            title: polishCopy.photoUploadFailed,
            description: getErrorMessage(error),
          });
        }

        pushToast({ tone: 'success', title: t('organizations.createSuccess') });
        closeModal();
        await refreshOrganizations(created.id);
        return;
      }

      await api.organizations.update(modalState.organizationId, {
        name: organizationForm.name,
        description: organizationForm.description || undefined,
        cityId: organizationForm.cityId,
        districtId: organizationForm.districtId || undefined,
        address: organizationForm.address,
        phone: organizationForm.phone || undefined,
        categoryIds: organizationForm.categoryIds,
      });

      try {
        await syncOrganizationLogo(modalState.organizationId);
      } catch (error) {
        pushToast({
          tone: 'error',
          title: polishCopy.photoUploadFailed,
          description: getErrorMessage(error),
        });
      }

      pushToast({ tone: 'success', title: t('organizations.updateSuccess') });
      closeModal();
      await refreshOrganizations(modalState.organizationId);
    } catch (error) {
      pushToast({
        tone: 'error',
        title: modalState.type === 'create-organization' ? t('organizations.createFailed') : t('organizations.updateFailed'),
        description: getErrorMessage(error),
      });
      setSubmitting(false);
    }
  };

  const submitAccountModal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modalState || modalState.type !== 'create-account') {
      return;
    }

    setSubmitting(true);

    try {
      await api.organizations.createAccount(modalState.organizationId, accountForm);
      pushToast({ tone: 'success', title: t('organizations.accountCreateSuccess') });
      closeModal();
      await refreshOrganizations(modalState.organizationId);
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('organizations.accountCreateFailed'),
        description: getErrorMessage(error),
      });
      setSubmitting(false);
    }
  };

  const submitConfirm = async () => {
    if (!confirmState) {
      return;
    }

    setConfirming(true);

    try {
      if (confirmState.type === 'organization-toggle') {
        await api.organizations.toggleActive(confirmState.organization.id, !confirmState.organization.isActive);
        await refreshOrganizations(confirmState.organization.id);
      } else {
        await api.organizations.toggleAccount(confirmState.organizationId, confirmState.accountId, !confirmState.isActive);
        await refreshOrganizations(confirmState.organizationId);
      }

      closeConfirm();
    } catch (error) {
      pushToast({
        tone: 'error',
        title:
          confirmState.type === 'organization-toggle'
            ? t('organizations.toggleFailed')
            : t('organizations.accountToggleFailed'),
        description: getErrorMessage(error),
      });
      setConfirming(false);
    }
  };

  const applyFilters = () => {
    setActiveFilter(filterDraft.status);
    setActiveCategoryId(filterDraft.categoryId);
    closeModal();
  };

  const clearFilters = () => {
    setFilterDraft({
      status: 'all',
      categoryId: '',
    });
    setActiveFilter('all');
    setActiveCategoryId('');
    closeModal();
  };

  if (loading) {
    return <LoadingState label={t('organizations.loading')} />;
  }

  const filteredOrganizations = organizations.filter((organization) => {
    const matchesSearch =
      !searchQuery.trim() ||
      [organization.name, organization.description ?? '', organization.address, organization.phone ?? '']
        .join(' ')
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());

    const matchesCategory =
      !activeCategoryId || (organization.categories ?? []).some((category) => category.id === activeCategoryId);

    if (activeFilter === 'active') {
      return organization.isActive && matchesSearch && matchesCategory;
    }

    if (activeFilter === 'inactive') {
      return !organization.isActive && matchesSearch && matchesCategory;
    }

    return matchesSearch && matchesCategory;
  });
  const selectedCategories = selectedOrganization?.categories ?? [];
  const selectedAccounts = selectedOrganization?.accounts ?? [];
  const selectedCityName = selectedOrganization?.city?.name ?? t('organizations.cityFallback');
  const selectedDistrictName = selectedOrganization?.district?.name ?? copy.allDistricts;
  const organizationLogoSource = organizationLogoPreview
    ? organizationLogoPreview.startsWith('blob:')
      ? organizationLogoPreview
      : resolveFileUrl(organizationLogoPreview)
    : null;
  const emptyStateCopy = (() => {
    if (!selectedCityId) {
      return {
        title: polishCopy.chooseCityTitle,
        description: polishCopy.chooseCityDescription,
      };
    }

    if (activeFilter === 'active' && !searchQuery.trim() && !activeCategoryId) {
      return {
        title: polishCopy.empty.activeTitle,
        description: polishCopy.empty.activeDescription,
      };
    }

    if (activeFilter === 'inactive' && !searchQuery.trim() && !activeCategoryId) {
      return {
        title: polishCopy.empty.inactiveTitle,
        description: polishCopy.empty.inactiveDescription,
      };
    }

    if (searchQuery.trim() || activeCategoryId || activeFilter !== 'all') {
      return {
        title: polishCopy.filteredTitle,
        description: polishCopy.filteredDescription,
      };
    }

    return {
      title: copy.emptyTitle,
      description: copy.emptyDescription,
    };
  })();
  const confirmCopy = (() => {
    if (!confirmState) {
      return null;
    }

    if (confirmState.type === 'organization-toggle') {
      return confirmState.organization.isActive
        ? {
            title: polishCopy.confirm.disableOrganizationTitle,
            description: polishCopy.confirm.disableOrganizationDescription,
          }
        : {
            title: polishCopy.confirm.enableOrganizationTitle,
            description: polishCopy.confirm.enableOrganizationDescription,
          };
    }

    return confirmState.isActive
      ? {
          title: polishCopy.confirm.disableAccountTitle,
          description: polishCopy.confirm.disableAccountDescription,
        }
      : {
          title: polishCopy.confirm.enableAccountTitle,
          description: polishCopy.confirm.enableAccountDescription,
        };
  })();

  return (
    <div className="page organizations-page">
      <section className="page-header glass-card">
        <div>
          <p className="organizations-page__subtitle">{copy.subtitle}</p>
        </div>
      </section>

      <section className="management-toolbar glass-card">
        <div className="management-toolbar__actions organizations-toolbar__actions">
          <Button type="button" variant="secondary" className="management-quick-action" onClick={openCreateOrganization}>
            <Building2 size={18} />
            <span>{copy.createOrganization}</span>
          </Button>
          <label className="organizations-search">
            <Search size={18} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={polishCopy.searchPlaceholder}
              aria-label={polishCopy.searchPlaceholder}
            />
          </label>
          <Button type="button" variant="secondary" className="management-quick-action organizations-filter-button" onClick={openFilters}>
            <SlidersHorizontal size={18} />
            <span>{polishCopy.filterAction}</span>
          </Button>
        </div>
      </section>

      {filteredOrganizations.length ? (
        <div className="management-grid organizations-grid">
          {filteredOrganizations.map((organization) => {
            const isSelected = organization.id === selectedOrganizationId;
            const categoryCount =
              organization.id === selectedOrganization?.id
                ? selectedCategories.length
                : organization.categories?.length ?? 0;
            const accountCount =
              organization.id === selectedOrganization?.id ? selectedAccounts.length : organization.accounts?.length ?? 0;

            return (
              <article
                key={organization.id}
                className={`management-card glass-card organizations-card ${
                  isSelected ? 'organizations-card--selected' : ''
                }`.trim()}
              >
                <div className="management-card__head">
                  <div className="management-card__identity">
                    <span className="management-card__glyph management-card__glyph--organization organizations-logo">
                      {organization.logoUrl ? (
                        <img src={resolveFileUrl(organization.logoUrl)} alt={organization.name} />
                      ) : (
                        <Building2 size={18} />
                      )}
                    </span>
                    <div className="management-card__copy">
                      <strong>{organization.name}</strong>
                      <p>{organization.city?.name ?? t('organizations.cityFallback')}</p>
                    </div>
                  </div>

                  <div className="management-card__actions">
                    <button
                      type="button"
                      className="management-icon-button"
                      title={polishCopy.detailsAction}
                      aria-label={polishCopy.detailsAction}
                      onClick={() => void openOrganizationDetails(organization.id)}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      className="management-icon-button"
                      title={copy.actions.edit}
                      aria-label={copy.actions.edit}
                      onClick={() => void openEditOrganization(organization.id)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className={`management-icon-button ${organization.isActive ? 'management-icon-button--danger' : ''}`.trim()}
                      title={copy.actions.toggle}
                      aria-label={copy.actions.toggle}
                      onClick={() => openOrganizationToggleConfirm(organization)}
                    >
                      {organization.isActive ? <CircleOff size={16} /> : <Power size={16} />}
                    </button>
                  </div>
                </div>

                <div className="management-card__meta organizations-card__meta">
                  <Badge tone={organization.isActive ? 'success' : 'danger'}>
                    {organization.isActive ? t('common.active') : t('common.disabled')}
                  </Badge>
                  <span className="management-chip">
                    <Layers3 size={14} />
                    {categoryCount} {copy.categoryCount}
                  </span>
                  <span className="management-chip">
                    <Users size={14} />
                    {accountCount} {copy.operatorCount}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title={emptyStateCopy.title} description={emptyStateCopy.description} />
      )}

      {confirmState && confirmCopy ? (
        <div className="profile-modal management-modal organizations-confirm-modal">
          <button
            type="button"
            className="profile-modal__backdrop"
            aria-label={polishCopy.confirm.cancel}
            onClick={closeConfirm}
          />

          <article className="profile-modal__card glass-card management-modal__card management-modal__card--confirm">
            <button
              type="button"
              className="profile-modal__close management-confirm__close"
              onClick={closeConfirm}
              aria-label={polishCopy.confirm.cancel}
            >
              <X size={16} />
            </button>

            <form
              className="management-confirm management-confirm--modal"
              onSubmit={(event) => {
                event.preventDefault();
                void submitConfirm();
              }}
            >
              <span className="management-confirm__icon" aria-hidden="true">
                {confirmState.type === 'organization-toggle' ? <Building2 size={22} /> : <Users size={22} />}
              </span>
              <div className="management-confirm__copy">
                <h3>{confirmCopy.title}</h3>
                <p>{confirmCopy.description}</p>
              </div>
              <div className="management-confirm__actions">
                <Button type="button" variant="secondary" className="management-confirm__button" onClick={closeConfirm}>
                  {polishCopy.confirm.cancel}
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="management-confirm__button"
                  busy={confirming}
                >
                  {polishCopy.confirm.confirm}
                </Button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      {modalState ? (
        <div className="profile-modal">
          <button type="button" className="profile-modal__backdrop" aria-label={copy.modal.cancel} onClick={closeModal} />

          {modalState.type === 'filters' ? (
            <article className="profile-modal__card glass-card organizations-modal__card organizations-modal__card--filter">
              <div className="profile-modal__header">
                <h3>{polishCopy.filterTitle}</h3>
                <button type="button" className="profile-modal__close" onClick={closeModal} aria-label={copy.modal.cancel}>
                  <X size={18} />
                </button>
              </div>

              <div className="profile-modal__form organizations-modal__form organizations-modal__form--stack">
                <SelectField
                  label={polishCopy.filterStatus}
                  value={filterDraft.status}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      status: event.target.value as OrganizationFilter,
                    }))
                  }
                >
                  <option value="all">{polishCopy.tabs.all}</option>
                  <option value="active">{polishCopy.tabs.active}</option>
                  <option value="inactive">{polishCopy.tabs.inactive}</option>
                </SelectField>

                <SelectField
                  label={polishCopy.filterCategory}
                  value={filterDraft.categoryId}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  <option value="">{t('common.allCategories')}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectField>

                <div className="profile-modal__actions">
                  <Button type="button" variant="ghost" onClick={clearFilters}>
                    {polishCopy.clear}
                  </Button>
                  <Button type="button" variant="secondary" onClick={closeModal}>
                    {copy.modal.cancel}
                  </Button>
                  <Button type="button" onClick={applyFilters}>
                    {polishCopy.apply}
                  </Button>
                </div>
              </div>
            </article>
          ) : modalState.type === 'organization-details' && selectedOrganization ? (
            <article className="profile-modal__card glass-card organizations-modal__card organizations-modal__card--details">
              <div className="profile-modal__header">
                <h3>{polishCopy.detailsTitle}</h3>
                <button type="button" className="profile-modal__close" onClick={closeModal} aria-label={copy.modal.cancel}>
                  <X size={18} />
                </button>
              </div>

              <div className="organizations-details">
                <div className="organizations-details__hero">
                  <div className="organizations-details__head">
                    <div className="organizations-workspace__identity">
                      <span className="organizations-workspace__glyph organizations-logo organizations-logo--large">
                        {selectedOrganization.logoUrl ? (
                          <img src={resolveFileUrl(selectedOrganization.logoUrl)} alt={selectedOrganization.name} />
                        ) : (
                          <Building2 size={22} />
                        )}
                      </span>
                      <div className="organizations-workspace__copy">
                        <strong>{selectedOrganization.name}</strong>
                        {selectedOrganization.description ? <p>{selectedOrganization.description}</p> : null}
                      </div>
                    </div>

                    <Badge tone={selectedOrganization.isActive ? 'success' : 'danger'}>
                      {selectedOrganization.isActive ? t('common.active') : t('common.disabled')}
                    </Badge>
                  </div>

                  <div className="organizations-workspace__actions">
                    <button
                      type="button"
                      className="management-icon-button"
                      title={copy.actions.edit}
                      aria-label={copy.actions.edit}
                      onClick={() => void openEditOrganization(selectedOrganization.id)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className={`management-icon-button ${selectedOrganization.isActive ? 'management-icon-button--danger' : ''}`.trim()}
                      title={copy.actions.toggle}
                      aria-label={copy.actions.toggle}
                      onClick={() => openOrganizationToggleConfirm(selectedOrganization)}
                    >
                      {selectedOrganization.isActive ? <CircleOff size={16} /> : <Power size={16} />}
                    </button>
                    <button
                      type="button"
                      className="management-icon-button"
                      title={copy.actions.createAccount}
                      aria-label={copy.actions.createAccount}
                      onClick={() => openCreateAccount(selectedOrganization.id)}
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>
                </div>

                <div className="profile-sheet__grid organizations-details__grid">
                  <div className="profile-sheet__item">
                    <span>
                      <MapPin size={13} />
                      {t('common.city')}
                    </span>
                    <strong>{selectedCityName}</strong>
                  </div>
                  {selectedOrganization.district ? (
                    <div className="profile-sheet__item">
                      <span>{t('common.district')}</span>
                      <strong>{selectedDistrictName}</strong>
                    </div>
                  ) : null}
                  {selectedOrganization.phone ? (
                    <div className="profile-sheet__item">
                      <span>
                        <Phone size={13} />
                        {t('common.phone')}
                      </span>
                      <strong>{selectedOrganization.phone}</strong>
                    </div>
                  ) : null}
                  {selectedOrganization.address ? (
                    <div className="profile-sheet__item">
                      <span>{t('common.address')}</span>
                      <strong>{selectedOrganization.address}</strong>
                    </div>
                  ) : null}
                </div>

                {selectedCategories.length ? (
                  <div className="organizations-workspace__section">
                    <div className="organizations-workspace__section-head">
                      <strong>{copy.linkedCategories}</strong>
                    </div>
                    <div className="organizations-workspace__tags">
                      {selectedCategories.map((category) => (
                        <span key={category.id} className="management-chip">
                          <Layers3 size={14} />
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="organizations-workspace__section organizations-details__section">
                  <div className="organizations-workspace__section-head">
                    <strong>{copy.accounts}</strong>
                    <Button type="button" variant="secondary" size="sm" onClick={() => openCreateAccount(selectedOrganization.id)}>
                      <UserPlus size={16} />
                      <span>{copy.createAccount}</span>
                    </Button>
                  </div>

                  {selectedAccounts.length ? (
                    <div className="organizations-account-grid">
                      {selectedAccounts.map((account) => (
                        <article key={account.id} className="organizations-account-card">
                          <div className="organizations-account-card__head">
                            <div className="organizations-account-card__identity">
                              <span className="organizations-account-card__avatar">{getAvatarLetter(account.fullName)}</span>
                              <div className="organizations-account-card__copy">
                                <strong>{account.fullName}</strong>
                                <span>{account.email}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className={`management-icon-button ${account.isActive ? 'management-icon-button--danger' : ''}`.trim()}
                              title={copy.actions.toggle}
                              aria-label={copy.actions.toggle}
                              onClick={() => openAccountToggleConfirm(account.id, Boolean(account.isActive))}
                            >
                              {account.isActive ? <CircleOff size={16} /> : <Power size={16} />}
                            </button>
                          </div>

                          <div className="organizations-account-card__meta">
                            <Badge tone={account.isActive ? 'success' : 'danger'}>
                              {account.isActive ? t('common.active') : t('common.disabled')}
                            </Badge>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="organizations-details__note">{copy.accountsEmpty.description}</p>
                  )}
                </div>
              </div>
            </article>
          ) : modalState.type === 'create-account' ? (
            <article className="profile-modal__card glass-card organizations-modal__card organizations-modal__card--account">
              <div className="profile-modal__header">
                <h3>{copy.modal.createAccount}</h3>
                <button type="button" className="profile-modal__close" onClick={closeModal} aria-label={copy.modal.cancel}>
                  <X size={18} />
                </button>
              </div>

              <form className="profile-modal__form organizations-modal__form organizations-modal__form--stack" onSubmit={submitAccountModal}>
                <InputField
                  label={t('common.fullName')}
                  value={accountForm.fullName}
                  onChange={(event) => setAccountForm((current) => ({ ...current, fullName: event.target.value }))}
                  required
                />
                <InputField
                  label={t('common.email')}
                  type="email"
                  value={accountForm.email}
                  onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
                <InputField
                  label={t('common.password')}
                  type="password"
                  value={accountForm.password}
                  onChange={(event) => setAccountForm((current) => ({ ...current, password: event.target.value }))}
                  required
                  minLength={8}
                />

                <div className="profile-modal__actions">
                  <Button type="button" variant="ghost" onClick={closeModal}>
                    {copy.modal.cancel}
                  </Button>
                  <Button type="submit" busy={submitting}>
                    {copy.createAccount}
                  </Button>
                </div>
              </form>
            </article>
          ) : (
            <article className="profile-modal__card glass-card organizations-modal__card">
              <div className="profile-modal__header">
                <h3>{modalState.type === 'create-organization' ? copy.modal.createOrganization : copy.modal.editOrganization}</h3>
                <button type="button" className="profile-modal__close" onClick={closeModal} aria-label={copy.modal.cancel}>
                  <X size={18} />
                </button>
              </div>

              <form className="profile-modal__form organizations-modal__form" onSubmit={submitOrganizationModal}>
                <div className="organizations-modal__grid">
                  <div className="organizations-modal__span-2 organizations-logo-picker">
                    <div className="organizations-logo-picker__preview organizations-logo-picker__preview--square">
                      {organizationLogoSource ? (
                        <img src={organizationLogoSource} alt={organizationForm.name || polishCopy.photoTitle} />
                      ) : (
                        <span className="organizations-logo-picker__placeholder">
                          <Building2 size={30} />
                        </span>
                      )}
                    </div>
                    <div className="organizations-logo-picker__body">
                      <span className="organizations-modal__group-title">{polishCopy.photoTitle}</span>
                      <div className="organizations-logo-picker__actions">
                        <input
                          ref={organizationLogoInputRef}
                          className="organizations-logo-picker__input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleOrganizationLogoChange}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => organizationLogoInputRef.current?.click()}
                        >
                          <ImageUp size={15} />
                          <span>{organizationLogoSource ? polishCopy.changePhoto : polishCopy.addPhoto}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeOrganizationLogo}
                          disabled={!organizationLogoSource && !organizationLogoFile}
                        >
                          <Trash2 size={15} />
                          <span>{polishCopy.removePhoto}</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <InputField
                    label={t('common.title')}
                    value={organizationForm.name}
                    onChange={(event) => setOrganizationForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                  <SelectField
                    label={t('common.city')}
                    value={organizationForm.cityId}
                    onChange={(event) =>
                      setOrganizationForm((current) => ({
                        ...current,
                        cityId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">{t('requestForm.chooseCity')}</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label={t('common.district')}
                    value={organizationForm.districtId}
                    onChange={(event) =>
                      setOrganizationForm((current) => ({
                        ...current,
                        districtId: event.target.value,
                      }))
                    }
                    disabled={!organizationForm.cityId}
                  >
                    <option value="">{copy.allDistricts}</option>
                    {organizationDistricts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </SelectField>

                  <InputField
                    label={t('common.phone')}
                    value={organizationForm.phone}
                    onChange={(event) => setOrganizationForm((current) => ({ ...current, phone: event.target.value }))}
                  />

                  <div className="organizations-modal__span-2">
                    <InputField
                      label={t('common.address')}
                      value={organizationForm.address}
                      onChange={(event) => setOrganizationForm((current) => ({ ...current, address: event.target.value }))}
                      required
                    />
                  </div>

                  <div className="organizations-modal__span-2">
                    <TextareaField
                      label={t('common.description')}
                      value={organizationForm.description}
                      onChange={(event) =>
                        setOrganizationForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="organizations-modal__span-2 organizations-modal__group">
                    <span className="organizations-modal__group-title">{copy.linkedCategories}</span>
                    <div className="organizations-choice-grid">
                      {categories.map((category) => {
                        const active = organizationForm.categoryIds.includes(category.id);

                        return (
                          <button
                            key={category.id}
                            type="button"
                            className={`organizations-choice ${active ? 'organizations-choice--active' : ''}`.trim()}
                            onClick={() =>
                              setOrganizationForm((current) => ({
                                ...current,
                                categoryIds: toggleCategoryId(current.categoryIds, category.id),
                              }))
                            }
                          >
                            <Layers3 size={16} />
                            <span>{category.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {modalState.type === 'create-organization' ? (
                    <div className="organizations-modal__span-2 organizations-modal__group">
                      <span className="organizations-modal__group-title">{copy.primaryAccount}</span>
                      <div className="organizations-modal__account-grid">
                        <InputField
                          label={t('common.fullName')}
                          value={organizationForm.account.fullName}
                          onChange={(event) =>
                            setOrganizationForm((current) => ({
                              ...current,
                              account: {
                                ...current.account,
                                fullName: event.target.value,
                              },
                            }))
                          }
                          required
                        />
                        <InputField
                          label={t('common.email')}
                          type="email"
                          value={organizationForm.account.email}
                          onChange={(event) =>
                            setOrganizationForm((current) => ({
                              ...current,
                              account: {
                                ...current.account,
                                email: event.target.value,
                              },
                            }))
                          }
                          required
                        />
                        <InputField
                          label={t('common.password')}
                          type="password"
                          value={organizationForm.account.password}
                          onChange={(event) =>
                            setOrganizationForm((current) => ({
                              ...current,
                              account: {
                                ...current.account,
                                password: event.target.value,
                              },
                            }))
                          }
                          required
                          minLength={8}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="profile-modal__actions">
                  <Button type="button" variant="ghost" onClick={closeModal}>
                    {copy.modal.cancel}
                  </Button>
                  <Button type="submit" busy={submitting}>
                    {modalState.type === 'create-organization' ? copy.createOrganization : t('common.save')}
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
