import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { Label } from '../labels/label.entity';
import { Subtask } from '../subtasks/subtask.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksSchedulerService } from './tasks-scheduler.service';
import { AuthModule } from '../auth/auth.module';
import { SubtasksModule } from '../subtasks/subtasks.module';
import { TaskActivitiesModule } from '../task-activities/task-activities.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Label, Subtask]),
    AuthModule,
    SubtasksModule,
    TaskActivitiesModule,
    NotificationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksSchedulerService],
})
export class TasksModule {}
