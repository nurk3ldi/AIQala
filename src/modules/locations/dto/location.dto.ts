import { IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreateCityDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  region?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?$/)
  latitude?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?$/)
  longitude?: string;
}

export class UpdateCityDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  region?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?$/)
  latitude?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?$/)
  longitude?: string;
}

export class CreateDistrictDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsUUID()
  cityId!: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?$/)
  latitude?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?$/)
  longitude?: string;
}

export class UpdateDistrictDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?$/)
  latitude?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?$/)
  longitude?: string;
}

export class DistrictListQueryDto {
  @IsOptional()
  @IsUUID()
  cityId?: string;
}
