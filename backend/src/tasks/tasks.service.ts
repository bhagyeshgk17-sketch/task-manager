import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from './task.entity';
import { Label } from '../labels/label.entity';
import { Subtask } from '../subtasks/subtask.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';
import { TaskActivitiesService } from '../task-activities/task-activities.service';
import { TaskAction } from './enums/task-action.enum';
import { TasksSchedulerService } from './tasks-scheduler.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(Label)
    private readonly labelsRepository: Repository<Label>,
    @InjectRepository(Subtask)
    private readonly subtasksRepository: Repository<Subtask>,
    private readonly taskActivitiesService: TaskActivitiesService,
    @Inject(forwardRef(() => TasksSchedulerService))
    private readonly schedulerService: TasksSchedulerService,
  ) {}

  async create(userId: string, dto: CreateTaskDto) {
    const labels = await this.resolveLabels(userId, dto.labelIds);

    const task = this.tasksRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority,
      dueDate: dto.dueDate ?? null,
      user: { id: userId },
      labels,
    });
    await this.tasksRepository.save(task);
    // FIX 3 — new task is immediately eligible for notifications
    this.schedulerService.clearNotifiedTask(task.id);

    await this.taskActivitiesService.logActivity(
      task.id,
      userId,
      TaskAction.CREATED,
    );

    const saved = (await this.loadTask(task.id))!;
    return {
      data: this.toResponse(saved),
      message: 'Task created',
      statusCode: 201,
    };
  }

  async findOne(userId: string, taskId: string) {
    const task = await this.findOwned(userId, taskId);
    return {
      data: this.toResponse(task),
      message: 'Task retrieved',
      statusCode: 200,
    };
  }

  async getDashboard(userId: string) {
    const [raw, subtaskRaw] = await Promise.all([
      this.tasksRepository
        .createQueryBuilder('task')
        .innerJoin('task.user', 'user')
        .where('user.id = :userId', { userId })
        .select('COUNT(*)', 'totalTasks')
        .addSelect(
          `SUM(CASE WHEN task.status = 'TODO' THEN 1 ELSE 0 END)`,
          'todo',
        )
        .addSelect(
          `SUM(CASE WHEN task.status = 'IN_PROGRESS' THEN 1 ELSE 0 END)`,
          'inProgress',
        )
        .addSelect(
          `SUM(CASE WHEN task.status = 'DONE' THEN 1 ELSE 0 END)`,
          'done',
        )
        .addSelect(
          `SUM(CASE WHEN task.priority = 'LOW' THEN 1 ELSE 0 END)`,
          'low',
        )
        .addSelect(
          `SUM(CASE WHEN task.priority = 'MEDIUM' THEN 1 ELSE 0 END)`,
          'medium',
        )
        .addSelect(
          `SUM(CASE WHEN task.priority = 'HIGH' THEN 1 ELSE 0 END)`,
          'high',
        )
        .addSelect(
          `SUM(CASE WHEN task.dueDate < CURRENT_DATE AND task.status != 'DONE' THEN 1 ELSE 0 END)`,
          'overdueCount',
        )
        .addSelect(
          `SUM(CASE WHEN task.dueDate = CURRENT_DATE AND task.status != 'DONE' THEN 1 ELSE 0 END)`,
          'dueTodayCount',
        )
        .getRawOne<Record<string, string>>(),

      this.subtasksRepository
        .createQueryBuilder('subtask')
        .innerJoin('subtask.task', 'task')
        .innerJoin('task.user', 'user')
        .where('user.id = :userId', { userId })
        .select('COUNT(*)', 'total')
        .addSelect(
          'SUM(CASE WHEN subtask.isCompleted = true THEN 1 ELSE 0 END)',
          'completed',
        )
        .getRawOne<Record<string, string>>(),
    ]);

    const totalTasks = Number(raw?.totalTasks ?? 0);
    const done = Number(raw?.done ?? 0);

    return {
      data: {
        totalTasks,
        byStatus: {
          todo: Number(raw?.todo ?? 0),
          inProgress: Number(raw?.inProgress ?? 0),
          done,
        },
        byPriority: {
          low: Number(raw?.low ?? 0),
          medium: Number(raw?.medium ?? 0),
          high: Number(raw?.high ?? 0),
        },
        overdueCount: Number(raw?.overdueCount ?? 0),
        dueTodayCount: Number(raw?.dueTodayCount ?? 0),
        completionRate:
          totalTasks === 0
            ? 0
            : Math.round((done / totalTasks) * 100 * 100) / 100,
        subtaskStats: {
          total: Number(subtaskRaw?.total ?? 0),
          completed: Number(subtaskRaw?.completed ?? 0),
        },
      },
      message: 'Dashboard data fetched',
      statusCode: 200,
    };
  }

  async findAll(userId: string, query: GetTasksQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.labels', 'label')
      .leftJoinAndSelect('task.subtasks', 'subtask')
      .innerJoin('task.user', 'user')
      .where('user.id = :userId', { userId });

    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    if (query.priority) {
      qb.andWhere('task.priority = :priority', { priority: query.priority });
    }

    if (query.labelId) {
      qb.andWhere('label.id = :labelId', { labelId: query.labelId });
    }

    if (query.search) {
      qb.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (sortBy === 'priority') {
      qb.orderBy(
        `CASE task.priority WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END`,
        sortOrder,
      );
    } else {
      qb.orderBy(`task.${sortBy}`, sortOrder);
    }

    qb.addOrderBy('subtask.position', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [tasks, total] = await qb.getManyAndCount();

    return {
      data: {
        tasks: tasks.map((t) => this.toResponse(t)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Tasks fetched successfully',
      statusCode: 200,
    };
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.findOwned(userId, taskId);

    // Capture old values before mutation
    const oldTitle = task.title;
    const oldDescription = task.description;
    const oldStatus = task.status;
    const oldPriority = task.priority;
    const oldDueDate = task.dueDate;
    const oldLabelIds = new Set(task.labels.map((l) => l.id));
    const oldLabelsMap = new Map(task.labels.map((l) => [l.id, l.name]));

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate;

    let newLabels: Label[] = task.labels;
    if (dto.labelIds !== undefined) {
      newLabels = await this.resolveLabels(userId, dto.labelIds);
      task.labels = newLabels;
    }

    await this.tasksRepository.save(task);
    // FIX 3 — dueDate or status may have changed; re-evaluate on next cron
    this.schedulerService.clearNotifiedTask(taskId);

    // Log changed fields
    const logs: Promise<void>[] = [];

    if (dto.title !== undefined && dto.title !== oldTitle) {
      logs.push(
        this.taskActivitiesService.logActivity(
          taskId,
          userId,
          TaskAction.TITLE_UPDATED,
          oldTitle,
          dto.title,
        ),
      );
    }

    if (dto.description !== undefined && dto.description !== oldDescription) {
      logs.push(
        this.taskActivitiesService.logActivity(
          taskId,
          userId,
          TaskAction.DESCRIPTION_UPDATED,
          oldDescription ?? '',
          dto.description ?? '',
        ),
      );
    }

    if (dto.status !== undefined && dto.status !== oldStatus) {
      logs.push(
        this.taskActivitiesService.logActivity(
          taskId,
          userId,
          TaskAction.STATUS_CHANGED,
          oldStatus,
          dto.status,
        ),
      );
    }

    if (dto.priority !== undefined && dto.priority !== oldPriority) {
      logs.push(
        this.taskActivitiesService.logActivity(
          taskId,
          userId,
          TaskAction.PRIORITY_CHANGED,
          oldPriority,
          dto.priority,
        ),
      );
    }

    if (dto.dueDate !== undefined && dto.dueDate !== oldDueDate) {
      logs.push(
        this.taskActivitiesService.logActivity(
          taskId,
          userId,
          TaskAction.DUE_DATE_CHANGED,
          oldDueDate ?? '',
          dto.dueDate ?? '',
        ),
      );
    }

    if (dto.labelIds !== undefined) {
      const newLabelIds = new Set(newLabels.map((l) => l.id));
      const newLabelsMap = new Map(newLabels.map((l) => [l.id, l.name]));

      for (const [id, name] of newLabelsMap) {
        if (!oldLabelIds.has(id)) {
          logs.push(
            this.taskActivitiesService.logActivity(
              taskId,
              userId,
              TaskAction.LABEL_ADDED,
              null,
              name,
            ),
          );
        }
      }

      for (const [id, name] of oldLabelsMap) {
        if (!newLabelIds.has(id)) {
          logs.push(
            this.taskActivitiesService.logActivity(
              taskId,
              userId,
              TaskAction.LABEL_REMOVED,
              name,
              null,
            ),
          );
        }
      }
    }

    await Promise.all(logs);

    const saved = (await this.loadTask(task.id))!;
    return {
      data: this.toResponse(saved),
      message: 'Task updated',
      statusCode: 200,
    };
  }

  async remove(userId: string, taskId: string) {
    const task = await this.findOwned(userId, taskId);

    await this.taskActivitiesService.logActivity(
      taskId,
      userId,
      TaskAction.DELETED,
      task.title,
    );

    await this.tasksRepository.remove(task);
    return {
      data: null,
      message: 'Task deleted',
      statusCode: 200,
    };
  }

  // ── Export ──────────────────────────────────────────────────────────────

  async exportCsv(userId: string, query: GetTasksQueryDto): Promise<string> {
    const tasks = await this.fetchAllForExport(userId, query);
    return this.buildCsv(tasks);
  }

  async exportPdf(userId: string, query: GetTasksQueryDto, res: any): Promise<void> {
    const tasks = await this.fetchAllForExport(userId, query);
    return this.streamPdf(tasks, res);
  }

  private async fetchAllForExport(userId: string, query: GetTasksQueryDto) {
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.labels', 'label')
      .leftJoinAndSelect('task.subtasks', 'subtask')
      .innerJoin('task.user', 'user')
      .where('user.id = :userId', { userId });

    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }
    if (query.priority) {
      qb.andWhere('task.priority = :priority', { priority: query.priority });
    }
    if (query.labelId) {
      qb.andWhere('label.id = :labelId', { labelId: query.labelId });
    }
    if (query.search) {
      qb.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (sortBy === 'priority') {
      qb.orderBy(
        `CASE task.priority WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END`,
        sortOrder,
      );
    } else {
      qb.orderBy(`task.${sortBy}`, sortOrder);
    }

    const tasks = await qb.getMany();
    return tasks.map((t) => this.toResponse(t));
  }

  private buildCsv(tasks: ReturnType<typeof this.toResponse>[]): string {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = [
      'Title',
      'Description',
      'Status',
      'Priority',
      'Due Date',
      'Labels',
      'Created At',
    ].join(',');
    const rows = tasks.map((t) =>
      [
        esc(t.title),
        esc(t.description ?? ''),
        esc(t.status),
        esc(t.priority),
        esc(t.dueDate ?? ''),
        esc(t.labels.map((l) => l.name).join('; ')),
        esc(new Date(t.createdAt).toISOString()),
      ].join(','),
    );
    return [header, ...rows].join('\r\n');
  }

  private streamPdf(
    tasks: ReturnType<typeof this.toResponse>[],
    res: any,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PDFDocument = require('pdfkit') as typeof import('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

      doc.on('error', reject);
      res.on('error', reject);
      res.on('finish', resolve);
      doc.pipe(res);

      const margin = 40;
      const cols = [
        { label: 'Title',       w: 145 },
        { label: 'Description', w: 165 },
        { label: 'Status',      w: 70  },
        { label: 'Priority',    w: 60  },
        { label: 'Due Date',    w: 70  },
        { label: 'Labels',      w: 115 },
        { label: 'Created At',  w: 138 },
      ];
      const rowH = 20;
      let y = margin;

      // Page title
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1F2937')
         .text('My Tasks', margin, y);
      y += 22;
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280')
         .text(`Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 20;

      const drawHeader = () => {
        let x = margin;
        for (const col of cols) {
          doc.rect(x, y, col.w, rowH).fill('#3B82F6');
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
             .text(col.label, x + 3, y + 5, {
               width: col.w - 6,
               lineBreak: false,
               ellipsis: true,
             });
          x += col.w;
        }
        y += rowH;
      };

      drawHeader();

      tasks.forEach((task, i) => {
        if (y + rowH > (doc.page.height as number) - margin) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin });
          y = margin;
          drawHeader();
        }

        const bg = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        const cells = [
          task.title,
          task.description ?? '',
          task.status,
          task.priority,
          task.dueDate ?? '',
          task.labels.map((l) => l.name).join('; '),
          new Date(task.createdAt).toLocaleDateString(),
        ];

        let x = margin;
        for (let c = 0; c < cols.length; c++) {
          const col = cols[c];
          doc.rect(x, y, col.w, rowH).fill(bg);
          doc.rect(x, y, col.w, rowH).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
          doc.font('Helvetica').fontSize(7.5).fillColor('#374151')
             .text(cells[c] ?? '', x + 3, y + 5, {
               width: col.w - 6,
               lineBreak: false,
               ellipsis: true,
             });
          x += col.w;
        }
        y += rowH;
      });

      if (tasks.length === 0) {
        doc.font('Helvetica').fontSize(10).fillColor('#6B7280')
           .text('No tasks found.', margin, y + 10);
      }

      doc.end();
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async findOwned(userId: string, taskId: string): Promise<Task> {
    const task = await this.loadTask(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return task;
  }

  private loadTask(taskId: string) {
    return this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.user', 'user')
      .leftJoinAndSelect('task.labels', 'label')
      .leftJoinAndSelect('task.subtasks', 'subtask')
      .where('task.id = :taskId', { taskId })
      .orderBy('subtask.position', 'ASC')
      .getOne();
  }

  private async resolveLabels(
    userId: string,
    labelIds?: string[],
  ): Promise<Label[]> {
    if (!labelIds || labelIds.length === 0) return [];

    const labels = await this.labelsRepository.find({
      where: { id: In(labelIds), user: { id: userId } },
      relations: ['user'],
    });

    if (labels.length !== labelIds.length) {
      throw new BadRequestException(
        'One or more label IDs are invalid or do not belong to you',
      );
    }

    return labels;
  }

  private toResponse(task: Task) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      labels: task.labels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
      subtasks: (task.subtasks ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        isCompleted: s.isCompleted,
        position: s.position,
        createdAt: s.createdAt,
      })),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
