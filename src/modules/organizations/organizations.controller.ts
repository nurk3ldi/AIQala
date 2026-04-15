import { Request, Response } from 'express';

import { ToggleActiveDto } from '../../common/dto/toggle-active.dto';

import {
  CreateOrganizationAccountDto,
  CreateOrganizationDto,
  OrganizationListQueryDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';
import { OrganizationsService } from './organizations.service';

export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const organization = await this.organizationsService.createOrganization(request.body as CreateOrganizationDto);

    response.status(201).json({
      success: true,
      data: organization,
    });
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const organizations = await this.organizationsService.listOrganizations(request.query as unknown as OrganizationListQueryDto);

    response.status(200).json({
      success: true,
      data: organizations,
    });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const organization = await this.organizationsService.getOrganizationById(request.params.id as string);

    response.status(200).json({
      success: true,
      data: organization,
    });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const organization = await this.organizationsService.updateOrganization(
      request.params.id as string,
      request.body as UpdateOrganizationDto,
    );

    response.status(200).json({
      success: true,
      data: organization,
    });
  };

  toggleActive = async (request: Request, response: Response): Promise<void> => {
    const payload = request.body as ToggleActiveDto;
    const organization = await this.organizationsService.toggleActive(request.params.id as string, payload.isActive);

    response.status(200).json({
      success: true,
      data: organization,
    });
  };

  getMe = async (request: Request, response: Response): Promise<void> => {
    const organization = await this.organizationsService.getMyOrganization(request.user!);

    response.status(200).json({
      success: true,
      data: organization,
    });
  };

  listAccounts = async (request: Request, response: Response): Promise<void> => {
    const accounts = await this.organizationsService.listOrganizationAccounts(request.params.id as string);

    response.status(200).json({
      success: true,
      data: accounts,
    });
  };

  createAccount = async (request: Request, response: Response): Promise<void> => {
    const account = await this.organizationsService.createOrganizationAccount(
      request.params.id as string,
      request.body as CreateOrganizationAccountDto,
    );

    response.status(201).json({
      success: true,
      data: account,
    });
  };

  toggleAccountActive = async (request: Request, response: Response): Promise<void> => {
    const payload = request.body as ToggleActiveDto;
    const account = await this.organizationsService.toggleOrganizationAccount(
      request.params.id as string,
      request.params.accountId as string,
      payload.isActive,
    );

    response.status(200).json({
      success: true,
      data: account,
    });
  };

  uploadLogo = async (request: Request, response: Response): Promise<void> => {
    const organization = await this.organizationsService.updateLogo(request.params.id as string, request.file);

    response.status(200).json({
      success: true,
      data: organization,
    });
  };

  deleteLogo = async (request: Request, response: Response): Promise<void> => {
    const organization = await this.organizationsService.deleteLogo(request.params.id as string);

    response.status(200).json({
      success: true,
      data: organization,
    });
  };
}
