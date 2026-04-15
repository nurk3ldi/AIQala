import { AppError } from '../../common/errors/app.error';

import { CreateCityDto, CreateDistrictDto, DistrictListQueryDto, UpdateCityDto, UpdateDistrictDto } from './dto/location.dto';
import { LocationsRepository } from './locations.repository';

export class LocationsService {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  async createCity(payload: CreateCityDto) {
    const existingCity = await this.locationsRepository.findCityByName(payload.name.trim());

    if (existingCity) {
      throw new AppError(409, 'CITY_EXISTS', 'A city with this name already exists');
    }

    return this.locationsRepository.createCity({
      name: payload.name.trim(),
      region: payload.region?.trim() ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
    });
  }

  listCities() {
    return this.locationsRepository.findAllCities();
  }

  async updateCity(id: string, payload: UpdateCityDto) {
    const city = await this.locationsRepository.findCityById(id);

    if (!city) {
      throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
    }

    if (payload.name && payload.name.trim() !== city.name) {
      const existingCity = await this.locationsRepository.findCityByName(payload.name.trim());

      if (existingCity && existingCity.id !== city.id) {
        throw new AppError(409, 'CITY_EXISTS', 'A city with this name already exists');
      }
    }

    return city.update({
      name: payload.name?.trim() ?? city.name,
      region: payload.region === undefined ? city.region : payload.region?.trim() ?? null,
      latitude: payload.latitude === undefined ? city.latitude : payload.latitude ?? null,
      longitude: payload.longitude === undefined ? city.longitude : payload.longitude ?? null,
    });
  }

  async deleteCity(id: string) {
    const city = await this.locationsRepository.findCityById(id);

    if (!city) {
      throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
    }

    await city.destroy();
  }

  async createDistrict(payload: CreateDistrictDto) {
    const city = await this.locationsRepository.findCityById(payload.cityId);

    if (!city) {
      throw new AppError(400, 'CITY_NOT_FOUND', 'City not found');
    }

    return this.locationsRepository.createDistrict({
      name: payload.name.trim(),
      cityId: payload.cityId,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
    });
  }

  listDistricts(query: DistrictListQueryDto) {
    return this.locationsRepository.findDistricts(query.cityId);
  }

  async updateDistrict(id: string, payload: UpdateDistrictDto) {
    const district = await this.locationsRepository.findDistrictById(id);

    if (!district) {
      throw new AppError(404, 'DISTRICT_NOT_FOUND', 'District not found');
    }

    if (payload.cityId) {
      const city = await this.locationsRepository.findCityById(payload.cityId);

      if (!city) {
        throw new AppError(400, 'CITY_NOT_FOUND', 'City not found');
      }
    }

    return district.update({
      name: payload.name?.trim() ?? district.name,
      cityId: payload.cityId ?? district.cityId,
      latitude: payload.latitude === undefined ? district.latitude : payload.latitude ?? null,
      longitude: payload.longitude === undefined ? district.longitude : payload.longitude ?? null,
    });
  }

  async deleteDistrict(id: string) {
    const district = await this.locationsRepository.findDistrictById(id);

    if (!district) {
      throw new AppError(404, 'DISTRICT_NOT_FOUND', 'District not found');
    }

    await district.destroy();
  }
}
