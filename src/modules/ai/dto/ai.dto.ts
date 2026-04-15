import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

const DRAFT_OBJECTIVES = ['acknowledge', 'status_update', 'request_more_info', 'resolution'] as const;
const DRAFT_TONES = ['formal', 'empathetic', 'concise'] as const;
const MODERATION_CONTEXTS = ['request', 'comment', 'profile', 'general'] as const;

export class ModerateTextDto {
  @IsString()
  @Length(1, 5000)
  text!: string;

  @IsOptional()
  @IsIn(MODERATION_CONTEXTS)
  context?: string = 'general';
}

export class AnalyzeIssueDto {
  @IsString()
  @Length(4, 200)
  title!: string;

  @IsString()
  @Length(10, 4000)
  description!: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;
}

export class DraftCommentDto {
  @IsOptional()
  @IsIn(DRAFT_OBJECTIVES)
  objective?: string = 'status_update';

  @IsOptional()
  @IsIn(DRAFT_TONES)
  tone?: string = 'formal';

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
  includeNextSteps?: boolean = true;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  extraInstructions?: string;
}
