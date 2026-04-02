import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class TasksSchedulerService {
  private readonly logger = new Logger(TasksSchedulerService.name);

  // FIX 2 — in-memory deduplication: track which task ids have already
  // triggered a notification so each task only notifies once per server
  // session (or until clearNotifiedTask() resets it on update/create).
  private notifiedOverdueTaskIds = new Set<string>();
  private notifiedDueTodayTaskIds = new Set<string>();

  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // FIX 3 — called by TasksService after create/update so a changed
  // task becomes eligible for notifications again immediately.
  clearNotifiedTask(taskId: string): void {
    this.notifiedOverdueTaskIds.delete(taskId);
    this.notifiedDueTodayTaskIds.delete(taskId);
  }

  // FIX 1 — back to every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async checkDueTasks(): Promise<void> {
    this.logger.log('Cron job fired — checking overdue and due today tasks');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      this.logger.log(`Checking with date: ${today.toISOString()}`);

      // ── overdue query ──────────────────────────────────────────────────
      const overdueTasks = await this.tasksRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.user', 'user')
        .where('task.dueDate IS NOT NULL')
        .andWhere('task.dueDate < :today', { today })
        .andWhere('task.status != :status', { status: 'DONE' })
        .getMany();

      this.logger.log(`Found overdue tasks: ${overdueTasks.length}`);

      // ── due today query ────────────────────────────────────────────────
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const dueTodayTasks = await this.tasksRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.user', 'user')
        .where('task.dueDate IS NOT NULL')
        .andWhere('task.dueDate >= :todayStart', { todayStart })
        .andWhere('task.dueDate <= :todayEnd', { todayEnd })
        .andWhere('task.status != :status', { status: 'DONE' })
        .getMany();

      this.logger.log(`Found due today tasks: ${dueTodayTasks.length}`);

      // FIX 2 — filter to only tasks not yet notified, then record them
      const newOverdueTasks = overdueTasks.filter(
        (task) => !this.notifiedOverdueTaskIds.has(task.id),
      );
      newOverdueTasks.forEach((task) =>
        this.notifiedOverdueTaskIds.add(task.id),
      );

      const newDueTodayTasks = dueTodayTasks.filter(
        (task) => !this.notifiedDueTodayTaskIds.has(task.id),
      );
      newDueTodayTasks.forEach((task) =>
        this.notifiedDueTodayTaskIds.add(task.id),
      );

      // FIX 4 — group by user and send only for new tasks
      const userOverdueMap = new Map<string, number>();
      newOverdueTasks.forEach((task) => {
        if (task.user) {
          userOverdueMap.set(
            task.user.id,
            (userOverdueMap.get(task.user.id) ?? 0) + 1,
          );
        }
      });

      userOverdueMap.forEach((count, userId) => {
        this.notificationsGateway.sendNotification(userId, {
          type: 'OVERDUE',
          message: `You have ${count} overdue task${count > 1 ? 's' : ''}`,
          count,
        });
      });

      const userDueTodayMap = new Map<string, number>();
      newDueTodayTasks.forEach((task) => {
        if (task.user) {
          userDueTodayMap.set(
            task.user.id,
            (userDueTodayMap.get(task.user.id) ?? 0) + 1,
          );
        }
      });

      userDueTodayMap.forEach((count, userId) => {
        this.notificationsGateway.sendNotification(userId, {
          type: 'DUE_TODAY',
          message: `You have ${count} task${count > 1 ? 's' : ''} due today`,
          count,
        });
      });

      // FIX 4 — log shows both total found and new notifications sent
      this.logger.log(
        `Overdue: ${overdueTasks.length} found, ${newOverdueTasks.length} new notifications sent`,
      );
      this.logger.log(
        `Due today: ${dueTodayTasks.length} found, ${newDueTodayTasks.length} new notifications sent`,
      );
    } catch (error) {
      this.logger.error('Cron job failed:', (error as Error).message);
    }
  }
}
