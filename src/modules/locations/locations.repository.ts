import { CityModel, DistrictModel } from '../../database/models';

export class LocationsRepository {
  createCity(payload: Partial<CityModel>): Promise<CityModel> {
    return CityModel.create(payload as never);
  }

  findAllCities(): Promise<CityModel[]> {
    return CityModel.findAll({
      order: [['name', 'ASC']],
    });
  }

  findCityById(id: string): Promise<CityModel | null> {
    return CityModel.findByPk(id);
  }

  findCityByName(name: string): Promise<CityModel | null> {
    return CityModel.findOne({
      where: {
        name,
      },
    });
  }

  createDistrict(payload: Partial<DistrictModel>): Promise<DistrictModel> {
    return DistrictModel.create(payload as never);
  }

  findDistricts(cityId?: string): Promise<DistrictModel[]> {
    return DistrictModel.findAll({
      where: cityId
        ? {
            cityId,
          }
        : undefined,
      include: [
        {
          model: CityModel,
          as: 'city',
        },
      ],
      order: [['name', 'ASC']],
    });
  }

  findDistrictById(id: string): Promise<DistrictModel | null> {
    return DistrictModel.findByPk(id, {
      include: [
        {
          model: CityModel,
          as: 'city',
        },
      ],
    });
  }
}
