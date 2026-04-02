import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LabelsModule } from './labels/labels.module';
import { TasksModule } from './tasks/tasks.module';
import { SubtasksModule } from './subtasks/subtasks.module';
import { User } from './users/user.entity';
import { Task } from './tasks/task.entity';
import { Label } from './labels/label.entity';
import { Subtask } from './subtasks/subtask.entity';
import { TaskActivity } from './task-activities/task-activity.entity';
import { TaskActivitiesModule } from './task-activities/task-activities.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        ssl: {
          rejectUnauthorized: false,
        },
        entities: [User, Task, Label, Subtask, TaskActivity],
        autoLoadEntities: true,
        synchronize: true,
        migrations: [__dirname + '/migrations/*.js'],
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    LabelsModule,
    TasksModule,
    SubtasksModule,
    TaskActivitiesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
