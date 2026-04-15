import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class BindOrganizationParamsDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  organizationId!: string;
}

export class CategoryOrganizationsQueryDto {
  @IsOptional()
  @IsUUID()
  cityId?: string;

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
