import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { TaskActivitiesService } from '../task-activities/task-activities.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';

interface AuthRequest {
  user: { userId: string };
}

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly taskActivitiesService: TaskActivitiesService,
  ) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthRequest, @Query() query: GetTasksQueryDto) {
    return this.tasksService.findAll(req.user.userId, query);
  }

  @Get('dashboard')
  getDashboard(@Request() req: AuthRequest) {
    return this.tasksService.getDashboard(req.user.userId);
  }

  @Get('export/csv')
  async exportCsv(
    @Request() req: AuthRequest,
    @Query() query: GetTasksQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.tasksService.exportCsv(req.user.userId, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="tasks-export.csv"',
    );
    res.send(csv);
  }

  @Get('export/pdf')
  async exportPdf(
    @Request() req: AuthRequest,
    @Query() query: GetTasksQueryDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="tasks-export.pdf"',
    );
    await this.tasksService.exportPdf(req.user.userId, query, res);
  }

  @Get(':id/activity')
  getActivity(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.taskActivitiesService.getTaskActivities(id, req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.tasksService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.tasksService.remove(req.user.userId, id);
  }
}
