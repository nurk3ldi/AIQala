import { Request, Response } from 'express';

import { CreateCityDto, CreateDistrictDto, DistrictListQueryDto, UpdateCityDto, UpdateDistrictDto } from './dto/location.dto';
import { LocationsService } from './locations.service';

export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  createCity = async (request: Request, response: Response): Promise<void> => {
    const city = await this.locationsService.createCity(request.body as CreateCityDto);

    response.status(201).json({
      success: true,
      data: city,
    });
  };

  listCities = async (_request: Request, response: Response): Promise<void> => {
    const cities = await this.locationsService.listCities();

    response.status(200).json({
      success: true,
      data: cities,
    });
  };

  updateCity = async (request: Request, response: Response): Promise<void> => {
    const city = await this.locationsService.updateCity(request.params.id as string, request.body as UpdateCityDto);

    response.status(200).json({
      success: true,
      data: city,
    });
  };

  deleteCity = async (request: Request, response: Response): Promise<void> => {
    await this.locationsService.deleteCity(request.params.id as string);

    response.status(204).send();
  };

  createDistrict = async (request: Request, response: Response): Promise<void> => {
    const district = await this.locationsService.createDistrict(request.body as CreateDistrictDto);

    response.status(201).json({
      success: true,
      data: district,
    });
  };

  listDistricts = async (request: Request, response: Response): Promise<void> => {
    const districts = await this.locationsService.listDistricts(request.query as unknown as DistrictListQueryDto);

    response.status(200).json({
      success: true,
      data: districts,
    });
  };

  updateDistrict = async (request: Request, response: Response): Promise<void> => {
    const district = await this.locationsService.updateDistrict(request.params.id as string, request.body as UpdateDistrictDto);

    response.status(200).json({
      success: true,
      data: district,
    });
  };

  deleteDistrict = async (request: Request, response: Response): Promise<void> => {
    await this.locationsService.deleteDistrict(request.params.id as string);

    response.status(204).send();
  };
}
