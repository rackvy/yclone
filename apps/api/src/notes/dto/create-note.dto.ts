import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  branchId: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsString()
  startTime: string; // HH:MM

  @IsOptional()
  @IsString()
  endTime?: string; // HH:MM (optional, calculated from service duration if not provided)

  @IsOptional()
  @IsString()
  color?: string; // purple, blue, green, orange, pink
}
