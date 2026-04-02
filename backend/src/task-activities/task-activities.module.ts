import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskActivity } from './task-activity.entity';
import { Task } from '../tasks/task.entity';
import { TaskActivitiesService } from './task-activities.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskActivity, Task])],
  providers: [TaskActivitiesService],
  exports: [TaskActivitiesService],
})
export class TaskActivitiesModule {}
