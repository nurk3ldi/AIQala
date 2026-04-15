import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

class OrganizationAccountDto {
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 72)
  password!: string;
}

export class CreateOrganizationDto {
  @IsString()
  @Length(2, 160)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsUUID()
  cityId!: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsString()
  @Length(4, 255)
  address!: string;

  @IsOptional()
  @IsString()
  @Length(4, 50)
  phone?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ValidateNested()
  @Type(() => OrganizationAccountDto)
  account!: OrganizationAccountDto;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsString()
  @Length(4, 255)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(4, 50)
  phone?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}

export class OrganizationListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) {
      return true;
    }

    if (value === 'false' || value === false) {
      return false;
    }

    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}

export class CreateOrganizationAccountDto {
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 72)
  password!: string;
}

export class OrganizationAccountParamsDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  accountId!: string;
}
