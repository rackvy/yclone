import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: { companyId: string }) {
    return this.tasksService.create(user.companyId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: { companyId: string },
    @Query('branchId') branchId?: string,
  ) {
    return this.tasksService.findAll(user.companyId, branchId);
  }

  @Get('by-date')
  findByDate(
    @CurrentUser() user: { companyId: string },
    @Query('branchId') branchId: string,
    @Query('date') date: string,
  ) {
    return this.tasksService.findByDate(user.companyId, branchId, new Date(date));
  }

  @Get('simple')
  findSimpleTasks(
    @CurrentUser() user: { companyId: string },
    @Query('branchId') branchId: string,
  ) {
    return this.tasksService.findSimpleTasks(user.companyId, branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { companyId: string }) {
    return this.tasksService.findOne(user.companyId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: { companyId: string },
  ) {
    return this.tasksService.update(user.companyId, id, dto);
  }

  @Patch(':id/complete')
  complete(
    @Param('id') id: string,
    @CurrentUser() user: { companyId: string; userId: string },
  ) {
    return this.tasksService.complete(user.companyId, id, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { companyId: string }) {
    return this.tasksService.remove(user.companyId, id);
  }
}
