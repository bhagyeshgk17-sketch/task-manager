import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubtasksService } from './subtasks.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { ReorderSubtasksDto } from './dto/reorder-subtasks.dto';

interface AuthRequest {
  user: { userId: string };
}

@Controller('tasks/:taskId/subtasks')
@UseGuards(JwtAuthGuard)
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Post()
  create(
    @Request() req: AuthRequest,
    @Param('taskId') taskId: string,
    @Body() dto: CreateSubtaskDto,
  ) {
    return this.subtasksService.create(req.user.userId, taskId, dto);
  }

  // Must be declared before :subtaskId to avoid route collision
  @Patch('reorder')
  reorder(
    @Request() req: AuthRequest,
    @Param('taskId') taskId: string,
    @Body() dto: ReorderSubtasksDto,
  ) {
    return this.subtasksService.reorder(req.user.userId, taskId, dto);
  }

  @Patch(':subtaskId')
  update(
    @Request() req: AuthRequest,
    @Param('taskId') taskId: string,
    @Param('subtaskId') subtaskId: string,
    @Body() dto: UpdateSubtaskDto,
  ) {
    return this.subtasksService.update(
      req.user.userId,
      taskId,
      subtaskId,
      dto,
    );
  }

  @Delete(':subtaskId')
  @HttpCode(HttpStatus.OK)
  remove(
    @Request() req: AuthRequest,
    @Param('taskId') taskId: string,
    @Param('subtaskId') subtaskId: string,
  ) {
    return this.subtasksService.remove(req.user.userId, taskId, subtaskId);
  }
}
