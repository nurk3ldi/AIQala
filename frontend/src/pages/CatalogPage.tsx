import { useEffect, useState } from 'react';

import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { InputField, SelectField, TextareaField } from '../components/ui/Fields';
import { LoadingState } from '../components/ui/LoadingState';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import type { Category, City, District, Organization } from '../types/api';

const MANAGEMENT_LABELS: Record<'kk' | 'ru' | 'en', string> = {
  kk: 'Басқару',
  ru: 'Управление',
  en: 'Management',
};

const MANAGEMENT_DESCRIPTIONS: Record<'kk' | 'ru' | 'en', string> = {
  kk: 'Санаттар, қалалар, аудандар мен ұйым байланыстарын осы жерден басқарасыз.',
  ru: 'Здесь вы управляете категориями, городами, районами и связями организаций.',
  en: 'Manage categories, cities, districts, and organization links here.',
};

export const CatalogPage = () => {
  const { language, t } = useTranslation();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [cityForm, setCityForm] = useState({ name: '', region: '', latitude: '', longitude: '' });
  const [districtForm, setDistrictForm] = useState({ name: '', cityId: '', latitude: '', longitude: '' });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [bindForm, setBindForm] = useState({ categoryId: '', organizationId: '' });
  const pageTitle = MANAGEMENT_LABELS[language];
  const pageDescription = MANAGEMENT_DESCRIPTIONS[language];

  const refresh = async () => {
    const [categoryResult, cityResult, districtResult, organizationResult] = await Promise.all([
      api.categories.list(),
      api.locations.cities.list(),
      api.locations.districts.list(),
      api.organizations.list({ page: 1, limit: 100 }),
    ]);

    setCategories(categoryResult);
    setCities(cityResult);
    setDistricts(districtResult);
    setOrganizations(organizationResult.items);
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

  const reloadAndNotify = async (title: string) => {
    await refresh();
    pushToast({
      tone: 'success',
      title,
    });
  };

  const removeCategory = async (id: string) => {
    if (!window.confirm(t('catalog.categoryDeleteConfirm'))) {
      return;
    }

    try {
      await api.categories.remove(id);
      await reloadAndNotify(t('catalog.categoryDeleted'));
      if (selectedCategory?.id === id) {
        setSelectedCategory(null);
      }
    } catch (error) {
      pushToast({ tone: 'error', title: t('catalog.deleteFailed'), description: getErrorMessage(error) });
    }
  };

  const removeCity = async (id: string) => {
    if (!window.confirm(t('catalog.cityDeleteConfirm'))) {
      return;
    }

    try {
      await api.locations.cities.remove(id);
      await reloadAndNotify(t('catalog.cityDeleted'));
      if (selectedCity?.id === id) {
        setSelectedCity(null);
      }
    } catch (error) {
      pushToast({ tone: 'error', title: t('catalog.deleteFailed'), description: getErrorMessage(error) });
    }
  };

  const removeDistrict = async (id: string) => {
    if (!window.confirm(t('catalog.districtDeleteConfirm'))) {
      return;
    }

    try {
      await api.locations.districts.remove(id);
      await reloadAndNotify(t('catalog.districtDeleted'));
      if (selectedDistrict?.id === id) {
        setSelectedDistrict(null);
      }
    } catch (error) {
      pushToast({ tone: 'error', title: t('catalog.deleteFailed'), description: getErrorMessage(error) });
    }
  };

  if (loading) {
    return <LoadingState label={t('catalog.loading')} />;
  }

  return (
    <div className="page">
      <section className="page-header glass-card">
        <div>
          <p className="catalog-page__subtitle" aria-label={pageTitle} title={pageTitle}>
            {pageDescription}
          </p>
        </div>
      </section>

      <section className="split-layout">
        <div className="page">
          <article className="panel glass-card">
            <div className="panel__header">
              <h3>{t('catalog.newCategory')}</h3>
            </div>
            <form className="page" onSubmit={async (event) => {
              event.preventDefault();
              try {
                await api.categories.create(categoryForm);
                setCategoryForm({ name: '', description: '' });
                await reloadAndNotify(t('catalog.categoryCreated'));
              } catch (error) {
                pushToast({ tone: 'error', title: t('common.create'), description: getErrorMessage(error) });
              }
            }}>
              <InputField label={t('common.title')} value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} required />
              <TextareaField label={t('common.description')} value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
              <Button type="submit">{t('catalog.newCategory')}</Button>
            </form>
          </article>

          <article className="panel glass-card">
            <div className="panel__header"><h3>{t('catalog.newCity')}</h3></div>
            <form className="page" onSubmit={async (event) => {
              event.preventDefault();
              try {
                await api.locations.cities.create({
                  name: cityForm.name,
                  region: cityForm.region || undefined,
                  latitude: cityForm.latitude || undefined,
                  longitude: cityForm.longitude || undefined,
                });
                setCityForm({ name: '', region: '', latitude: '', longitude: '' });
                await reloadAndNotify(t('catalog.cityCreated'));
              } catch (error) {
                pushToast({ tone: 'error', title: t('common.create'), description: getErrorMessage(error) });
              }
            }}>
              <div className="grid-2">
                <InputField label={t('common.title')} value={cityForm.name} onChange={(event) => setCityForm((current) => ({ ...current, name: event.target.value }))} required />
                <InputField label={t('catalog.editRegion')} value={cityForm.region} onChange={(event) => setCityForm((current) => ({ ...current, region: event.target.value }))} />
              </div>
              <div className="grid-2">
                <InputField label={t('common.latitude')} value={cityForm.latitude} onChange={(event) => setCityForm((current) => ({ ...current, latitude: event.target.value }))} />
                <InputField label={t('common.longitude')} value={cityForm.longitude} onChange={(event) => setCityForm((current) => ({ ...current, longitude: event.target.value }))} />
              </div>
              <Button type="submit">{t('catalog.newCity')}</Button>
            </form>
          </article>

          <article className="panel glass-card">
            <div className="panel__header"><h3>{t('catalog.newDistrict')}</h3></div>
            <form className="page" onSubmit={async (event) => {
              event.preventDefault();
              try {
                await api.locations.districts.create({
                  name: districtForm.name,
                  cityId: districtForm.cityId,
                  latitude: districtForm.latitude || undefined,
                  longitude: districtForm.longitude || undefined,
                });
                setDistrictForm({ name: '', cityId: '', latitude: '', longitude: '' });
                await reloadAndNotify(t('catalog.districtCreated'));
              } catch (error) {
                pushToast({ tone: 'error', title: t('common.create'), description: getErrorMessage(error) });
              }
            }}>
              <div className="grid-2">
                <InputField label={t('common.title')} value={districtForm.name} onChange={(event) => setDistrictForm((current) => ({ ...current, name: event.target.value }))} required />
                <SelectField label={t('common.city')} value={districtForm.cityId} onChange={(event) => setDistrictForm((current) => ({ ...current, cityId: event.target.value }))} required>
                  <option value="">{t('catalog.chooseCity')}</option>
                  {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </SelectField>
              </div>
              <div className="grid-2">
                <InputField label={t('common.latitude')} value={districtForm.latitude} onChange={(event) => setDistrictForm((current) => ({ ...current, latitude: event.target.value }))} />
                <InputField label={t('common.longitude')} value={districtForm.longitude} onChange={(event) => setDistrictForm((current) => ({ ...current, longitude: event.target.value }))} />
              </div>
              <Button type="submit">{t('catalog.newDistrict')}</Button>
            </form>
          </article>

          <article className="panel glass-card">
            <div className="panel__header">
              <h3>{t('catalog.bindTitle')}</h3>
            </div>
            <form className="page" onSubmit={async (event) => {
              event.preventDefault();
              try {
                await api.categories.bindOrganization(bindForm.categoryId, bindForm.organizationId);
                await reloadAndNotify(t('catalog.boundSuccess'));
              } catch (error) {
                pushToast({ tone: 'error', title: t('catalog.bindOrganization'), description: getErrorMessage(error) });
              }
            }}>
              <SelectField label={t('common.category')} value={bindForm.categoryId} onChange={(event) => setBindForm((current) => ({ ...current, categoryId: event.target.value }))} required>
                <option value="">{t('catalog.chooseCategory')}</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </SelectField>
              <SelectField label={t('common.organization')} value={bindForm.organizationId} onChange={(event) => setBindForm((current) => ({ ...current, organizationId: event.target.value }))} required>
                <option value="">{t('catalog.chooseOrganization')}</option>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </SelectField>
              <Button type="submit">{t('catalog.bindOrganization')}</Button>
            </form>
          </article>
        </div>

        <div className="page">
          <article className="panel glass-card">
            <div className="panel__header"><h3>{t('catalog.categoriesTitle')}</h3></div>
            {categories.length ? (
              <div className="list">
                {categories.map((category) => (
                  <article key={category.id} className="record-card">
                    <div className="record-card__header">
                        <div className="record-card__title">
                          <h4>{category.name}</h4>
                          <span className="muted-text">{category.description ?? t('catalog.descriptionFallback')}</span>
                        </div>
                        <div className="toolbar">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(category)}>{t('catalog.edit')}</Button>
                          <Button variant="danger" size="sm" onClick={() => void removeCategory(category.id)}>{t('common.remove')}</Button>
                        </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyState title={t('catalog.categoriesEmptyTitle')} description={t('catalog.categoriesEmptyDescription')} />}
            {selectedCategory ? (
              <form className="page" onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await api.categories.update(selectedCategory.id, {
                    name: selectedCategory.name,
                    description: selectedCategory.description ?? '',
                  });
                  await reloadAndNotify(t('catalog.categoryUpdated'));
                } catch (error) {
                  pushToast({ tone: 'error', title: t('common.update'), description: getErrorMessage(error) });
                }
              }}>
                <InputField label={t('catalog.editName')} value={selectedCategory.name} onChange={(event) => setSelectedCategory((current) => current ? { ...current, name: event.target.value } : current)} required />
                <TextareaField label={t('catalog.editDescription')} value={selectedCategory.description ?? ''} onChange={(event) => setSelectedCategory((current) => current ? { ...current, description: event.target.value } : current)} />
                <Button type="submit">{t('catalog.saveCategory')}</Button>
              </form>
            ) : null}
          </article>

          <article className="panel glass-card">
            <div className="panel__header"><h3>{t('catalog.citiesTitle')}</h3></div>
            <div className="list">
              {cities.map((city) => (
                <article key={city.id} className="record-card">
                  <div className="record-card__header">
                    <div className="record-card__title">
                      <h4>{city.name}</h4>
                      <span className="muted-text">{city.region ?? t('catalog.regionFallback')}</span>
                    </div>
                    <div className="toolbar">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCity(city)}>{t('catalog.edit')}</Button>
                      <Button variant="danger" size="sm" onClick={() => void removeCity(city.id)}>{t('common.remove')}</Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {selectedCity ? (
              <form className="page" onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await api.locations.cities.update(selectedCity.id, {
                    name: selectedCity.name,
                    region: selectedCity.region ?? undefined,
                    latitude: selectedCity.latitude ?? undefined,
                    longitude: selectedCity.longitude ?? undefined,
                  });
                  await reloadAndNotify(t('catalog.cityUpdated'));
                } catch (error) {
                  pushToast({ tone: 'error', title: t('common.update'), description: getErrorMessage(error) });
                }
              }}>
                <div className="grid-2">
                  <InputField label={t('catalog.editName')} value={selectedCity.name} onChange={(event) => setSelectedCity((current) => current ? { ...current, name: event.target.value } : current)} required />
                  <InputField label={t('catalog.editRegion')} value={selectedCity.region ?? ''} onChange={(event) => setSelectedCity((current) => current ? { ...current, region: event.target.value } : current)} />
                </div>
                <div className="grid-2">
                  <InputField label={t('common.latitude')} value={selectedCity.latitude ?? ''} onChange={(event) => setSelectedCity((current) => current ? { ...current, latitude: event.target.value } : current)} />
                  <InputField label={t('common.longitude')} value={selectedCity.longitude ?? ''} onChange={(event) => setSelectedCity((current) => current ? { ...current, longitude: event.target.value } : current)} />
                </div>
                <Button type="submit">{t('catalog.saveCity')}</Button>
              </form>
            ) : null}
          </article>

          <article className="panel glass-card">
            <div className="panel__header"><h3>{t('catalog.districtsTitle')}</h3></div>
            <div className="list">
              {districts.map((district) => (
                <article key={district.id} className="record-card">
                  <div className="record-card__header">
                    <div className="record-card__title">
                      <h4>{district.name}</h4>
                      <span className="muted-text">{district.city?.name ?? t('catalog.unknownCity')}</span>
                    </div>
                    <div className="toolbar">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedDistrict(district)}>{t('catalog.edit')}</Button>
                      <Button variant="danger" size="sm" onClick={() => void removeDistrict(district.id)}>{t('common.remove')}</Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {selectedDistrict ? (
              <form className="page" onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await api.locations.districts.update(selectedDistrict.id, {
                    name: selectedDistrict.name,
                    cityId: selectedDistrict.cityId,
                    latitude: selectedDistrict.latitude ?? undefined,
                    longitude: selectedDistrict.longitude ?? undefined,
                  });
                  await reloadAndNotify(t('catalog.districtUpdated'));
                } catch (error) {
                  pushToast({ tone: 'error', title: t('common.update'), description: getErrorMessage(error) });
                }
              }}>
                <div className="grid-2">
                  <InputField label={t('catalog.editName')} value={selectedDistrict.name} onChange={(event) => setSelectedDistrict((current) => current ? { ...current, name: event.target.value } : current)} required />
                  <SelectField label={t('common.city')} value={selectedDistrict.cityId} onChange={(event) => setSelectedDistrict((current) => current ? { ...current, cityId: event.target.value } : current)} required>
                    <option value="">{t('catalog.chooseCity')}</option>
                    {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                  </SelectField>
                </div>
                <div className="grid-2">
                  <InputField label={t('common.latitude')} value={selectedDistrict.latitude ?? ''} onChange={(event) => setSelectedDistrict((current) => current ? { ...current, latitude: event.target.value } : current)} />
                  <InputField label={t('common.longitude')} value={selectedDistrict.longitude ?? ''} onChange={(event) => setSelectedDistrict((current) => current ? { ...current, longitude: event.target.value } : current)} />
                </div>
                <Button type="submit">{t('catalog.saveDistrict')}</Button>
              </form>
            ) : null}
          </article>
        </div>
      </section>
    </div>
  );
};
