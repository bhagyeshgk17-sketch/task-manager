import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subtask } from './subtask.entity';
import { Task } from '../tasks/task.entity';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { ReorderSubtasksDto } from './dto/reorder-subtasks.dto';

@Injectable()
export class SubtasksService {
  constructor(
    @InjectRepository(Subtask)
    private readonly subtasksRepository: Repository<Subtask>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async create(userId: string, taskId: string, dto: CreateSubtaskDto) {
    await this.verifyTaskOwnership(userId, taskId);

    const maxResult = await this.subtasksRepository
      .createQueryBuilder('subtask')
      .select('MAX(subtask.position)', 'max')
      .where('subtask.task = :taskId', { taskId })
      .getRawOne<{ max: string | null }>();

    const position = maxResult && maxResult.max !== null
      ? Number(maxResult.max) + 1
      : 0;

    const subtask = this.subtasksRepository.create({
      title: dto.title,
      task: { id: taskId },
      position,
    });

    await this.subtasksRepository.save(subtask);

    return {
      data: this.toResponse(subtask),
      message: 'Subtask created',
      statusCode: 201,
    };
  }

  async update(
    userId: string,
    taskId: string,
    subtaskId: string,
    dto: UpdateSubtaskDto,
  ) {
    const subtask = await this.findOwned(userId, taskId, subtaskId);

    if (dto.title !== undefined) subtask.title = dto.title;
    if (dto.isCompleted !== undefined) subtask.isCompleted = dto.isCompleted;

    await this.subtasksRepository.save(subtask);

    return {
      data: this.toResponse(subtask),
      message: 'Subtask updated',
      statusCode: 200,
    };
  }

  async remove(userId: string, taskId: string, subtaskId: string) {
    const subtask = await this.findOwned(userId, taskId, subtaskId);
    await this.subtasksRepository.remove(subtask);
    return { data: null, message: 'Subtask deleted', statusCode: 200 };
  }

  async reorder(userId: string, taskId: string, dto: ReorderSubtasksDto) {
    await this.verifyTaskOwnership(userId, taskId);

    const subtasks = await this.subtasksRepository.find({
      where: { task: { id: taskId } },
    });

    const subtaskMap = new Map(subtasks.map((s) => [s.id, s]));

    const updates = dto.subtaskIds
      .map((id, index) => {
        const subtask = subtaskMap.get(id);
        if (subtask) {
          subtask.position = index;
          return subtask;
        }
        return null;
      })
      .filter(Boolean) as Subtask[];

    await this.subtasksRepository.save(updates);

    return { data: null, message: 'Subtasks reordered', statusCode: 200 };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async verifyTaskOwnership(
    userId: string,
    taskId: string,
  ): Promise<void> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['user'],
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.user.id !== userId) throw new ForbiddenException('Access denied');
  }

  private async findOwned(
    userId: string,
    taskId: string,
    subtaskId: string,
  ): Promise<Subtask> {
    await this.verifyTaskOwnership(userId, taskId);
    const subtask = await this.subtasksRepository.findOne({
      where: { id: subtaskId, task: { id: taskId } },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');
    return subtask;
  }

  private toResponse(subtask: Subtask) {
    return {
      id: subtask.id,
      title: subtask.title,
      isCompleted: subtask.isCompleted,
      position: subtask.position,
      createdAt: subtask.createdAt,
    };
  }
}
