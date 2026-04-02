import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSubtaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
