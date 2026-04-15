import { IsIn, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { REQUEST_PRIORITIES, REQUEST_STATUSES } from '../../../common/constants/request.constants';

export class CreateRequestDto {
  @IsString()
  @Length(4, 200)
  title!: string;

  @IsString()
  @Length(10, 4000)
  description!: string;

  @IsUUID()
  categoryId!: string;

  @IsUUID()
  cityId!: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @Matches(/^-?\d+(\.\d+)?$/)
  latitude!: string;

  @Matches(/^-?\d+(\.\d+)?$/)
  longitude!: string;

  @IsOptional()
  @IsIn(REQUEST_PRIORITIES)
  priority?: string;
}

export class RequestListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(REQUEST_STATUSES)
  status?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class AssignRequestDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsIn(REQUEST_PRIORITIES)
  priority?: string;
}

export class UpdateRequestStatusDto {
  @IsIn(REQUEST_STATUSES)
  status!: string;
}

export class CreateCommentDto {
  @IsString()
  @Length(1, 2000)
  text!: string;
}
