import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskStatus } from '../../generated/prisma';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({
      data: {
        companyId,
        branchId: dto.branchId,
        title: dto.title,
        description: dto.description,
        hasDateTime: dto.hasDateTime ?? false,
        date: dto.date ? new Date(dto.date) : null,
        startTime: dto.startTime,
        durationMin: dto.durationMin ?? 60,
        repeatType: dto.repeatType ?? 'none',
        repeatUntil: dto.repeatUntil ? new Date(dto.repeatUntil) : null,
        priority: dto.priority ?? 'medium',
        status: 'new',
      },
    });
  }

  async findAll(companyId: string, branchId?: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        companyId,
        ...(branchId && { branchId }),
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findByDate(companyId: string, branchId: string, date: Date): Promise<Task[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.task.findMany({
      where: {
        companyId,
        branchId,
        hasDateTime: true,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: 'canceled' },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findSimpleTasks(companyId: string, branchId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        companyId,
        branchId,
        hasDateTime: false,
        status: { not: 'canceled' },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { id, companyId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async update(companyId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    await this.findOne(companyId, id);
    
    return this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
        repeatUntil: dto.repeatUntil ? new Date(dto.repeatUntil) : undefined,
      },
    });
  }

  async complete(companyId: string, id: string, userId: string): Promise<Task> {
    await this.findOne(companyId, id);
    
    return this.prisma.task.update({
      where: { id },
      data: {
        status: 'done',
        completedAt: new Date(),
        completedBy: userId,
      },
    });
  }

  async remove(companyId: string, id: string): Promise<void> {
    await this.findOne(companyId, id);
    await this.prisma.task.delete({ where: { id } });
  }
}
