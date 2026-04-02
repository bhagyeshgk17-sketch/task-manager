import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskActivity } from './task-activity.entity';
import { Task } from '../tasks/task.entity';
import { TaskAction } from '../tasks/enums/task-action.enum';

@Injectable()
export class TaskActivitiesService {
  constructor(
    @InjectRepository(TaskActivity)
    private readonly activitiesRepository: Repository<TaskActivity>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async logActivity(
    taskId: string,
    userId: string,
    action: TaskAction,
    oldValue?: string | null,
    newValue?: string | null,
  ): Promise<void> {
    const activity = this.activitiesRepository.create({
      task: { id: taskId },
      user: { id: userId },
      action,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    });
    await this.activitiesRepository.save(activity);
  }

  async getTaskActivities(taskId: string, userId: string) {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, user: { id: userId } },
      relations: ['user'],
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const activities = await this.activitiesRepository.find({
      where: { task: { id: taskId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return {
      data: activities.map((a) => ({
        id: a.id,
        action: a.action,
        oldValue: a.oldValue,
        newValue: a.newValue,
        createdAt: a.createdAt,
        user: { id: a.user.id, name: a.user.name },
      })),
      message: 'Activities fetched',
      statusCode: 200,
    };
  }
}
