import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateNoteDto) {
    // Get employeeId from userId
    const employee = await this.prisma.employee.findFirst({
      where: { userId, companyId },
    });
    
    // Calculate endTime if service provided and endTime not specified
    let endTime = dto.endTime;
    if (!endTime && dto.serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: dto.serviceId },
      });
      if (service) {
        const [startH, startM] = dto.startTime.split(':').map(Number);
        const durationMin = service.durationMin;
        const endDate = new Date(2000, 0, 1, startH, startM + durationMin);
        endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      }
    }
    // Default 30 min if no endTime
    if (!endTime) {
      const [startH, startM] = dto.startTime.split(':').map(Number);
      const endDate = new Date(2000, 0, 1, startH, startM + 30);
      endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
    }

    return this.prisma.note.create({
      data: {
        companyId,
        branchId: dto.branchId,
        employeeId: employee?.id,
        clientId: dto.clientId,
        serviceId: dto.serviceId,
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime,
        color: dto.color || 'purple',
      },
      include: {
        client: true,
        service: true,
        employee: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async findByDate(companyId: string, branchId: string, date: Date) {
    // date is already UTC 00:00 from parseDateYYYYMMDD
    const dayStart = date;
    const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.note.findMany({
      where: {
        companyId,
        branchId,
        date: { gte: dayStart, lt: dayEnd },
      },
      include: {
        client: true,
        service: true,
        employee: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        service: true,
        employee: {
          select: { id: true, fullName: true },
        },
      },
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async update(companyId: string, id: string, dto: UpdateNoteDto) {
    await this.findOne(companyId, id);

    // Recalculate endTime if service or startTime changed
    let endTime = dto.endTime;
    if (!endTime && (dto.serviceId || dto.startTime)) {
      const current = await this.prisma.note.findUnique({ where: { id } });
      const serviceId = dto.serviceId || current?.serviceId;
      const startTime = dto.startTime || current?.startTime || '09:00';
      
      if (serviceId) {
        const service = await this.prisma.service.findUnique({
          where: { id: serviceId },
        });
        if (service) {
          const [startH, startM] = startTime.split(':').map(Number);
          const durationMin = service.durationMin;
          const endDate = new Date(2000, 0, 1, startH, startM + durationMin);
          endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
        }
      }
    }

    return this.prisma.note.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
        endTime,
      },
      include: {
        client: true,
        service: true,
        employee: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.note.delete({ where: { id } });
  }
}
