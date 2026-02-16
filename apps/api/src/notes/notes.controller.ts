import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

function parseDateYYYYMMDD(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d, 0, 0, 0));
  if (Number.isNaN(dt.getTime())) throw new BadRequestException('Invalid date');
  return dt;
}

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(
    @CurrentUser() user: { companyId: string; sub: string },
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.create(user.companyId, user.sub, dto);
  }

  @Get('by-date')
  findByDate(
    @CurrentUser() user: { companyId: string },
    @Query('branchId') branchId: string,
    @Query('date') date: string, // YYYY-MM-DD
  ) {
    const parsedDate = parseDateYYYYMMDD(date);
    return this.notesService.findByDate(user.companyId, branchId, parsedDate);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { companyId: string },
    @Param('id') id: string,
  ) {
    return this.notesService.findOne(user.companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { companyId: string },
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { companyId: string },
    @Param('id') id: string,
  ) {
    return this.notesService.remove(user.companyId, id);
  }
}
