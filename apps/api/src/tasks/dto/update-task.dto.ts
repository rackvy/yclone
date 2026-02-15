import { IsString, IsOptional, IsBoolean, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { TaskPriority, TaskRepeatType, TaskStatus } from '../../../generated/prisma';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  hasDateTime?: boolean;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMin?: number;

  @IsEnum(TaskRepeatType)
  @IsOptional()
  repeatType?: TaskRepeatType;

  @IsDateString()
  @IsOptional()
  repeatUntil?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;
}
