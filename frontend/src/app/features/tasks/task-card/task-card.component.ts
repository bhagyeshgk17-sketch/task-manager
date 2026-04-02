import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Task, TaskStatus, TaskPriority } from '../../../core/models/task.model';

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'TODO',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

@Component({
  selector: 'app-task-card',
  template: `
    <div class="card" [class]="'card--' + task.priority.toLowerCase()">

      <div class="card__top">
        <button
          class="status-btn"
          [class]="'status-btn--' + task.status.toLowerCase()"
          (click)="cycleStatus()"
          [title]="'Click to move to ' + nextStatusLabel"
          type="button"
        >
          {{ statusLabel }}
        </button>

        <div class="card__actions">
          <button class="icon-btn" title="Edit task" type="button" (click)="editClicked.emit(task)">
            &#x270E;
          </button>
          <button class="icon-btn icon-btn--danger" title="Delete task" type="button" (click)="deleted.emit(task.id.toString())">
            &#x1F5D1;
          </button>
        </div>
      </div>

      <h3 class="card__title" [class.card__title--done]="task.status === 'DONE'">
        {{ task.title }}
      </h3>

      <div class="card__meta">
        <span class="badge" [class]="'badge--' + task.priority.toLowerCase()">
          {{ priorityLabel }}
        </span>

        @if (task.dueDate) {
          <span class="due-date" [class]="dueDateClass">
            @if (isOverdue) { &#x26A0; }
            {{ formattedDueDate }}
          </span>
        }
      </div>

      @if (task.labels.length > 0) {
        <div class="labels">
          @for (label of task.labels; track label.id) {
            <span class="label-chip">
              <span class="label-chip__dot" [style.background]="label.color"></span>
              {{ label.name }}
            </span>
          }
        </div>
      }

      @if (task.subtasks && task.subtasks.length > 0) {
        <div class="subtask-progress">
          <div class="subtask-progress__bar">
            <div
              class="subtask-progress__fill"
              [style.width.%]="subtaskCompletionPct"
              [class.subtask-progress__fill--done]="subtaskCompletionPct === 100"
            ></div>
          </div>
          <span class="subtask-progress__label">
            {{ completedSubtasks }}/{{ task.subtasks.length }} subtasks
          </span>
        </div>
      }

    </div>
  `,
  styles: [`
    .card {
      background: var(--bg-card);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      border-left-width: 4px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: box-shadow 0.15s;
    }

    .card:hover {
      box-shadow: 0 2px 8px var(--shadow);
    }

    .card--high   { border-left-color: #ef4444; }
    .card--medium { border-left-color: #f97316; }
    .card--low    { border-left-color: #3b82f6; }

    /* ── Top row ── */
    .card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    /* ── Status button ── */
    .status-btn {
      display: inline-flex;
      align-items: center;
      height: 24px;
      padding: 0 10px;
      border-radius: 12px;
      border: none;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s, filter 0.15s;
      white-space: nowrap;
    }

    .status-btn:hover {
      filter: brightness(0.93);
    }

    .status-btn--todo {
      background: var(--bg-secondary);
      color: var(--text-muted);
    }

    .status-btn--in_progress {
      background: #eff6ff;
      color: #2563eb;
    }

    .status-btn--done {
      background: #f0fdf4;
      color: #16a34a;
    }

    /* ── Action buttons ── */
    .card__actions {
      display: flex;
      gap: 2px;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      font-size: 15px;
      color: var(--text-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .icon-btn:hover {
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }

    .icon-btn--danger:hover {
      background: #fef2f2;
      color: var(--danger);
    }

    /* ── Title ── */
    .card__title {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.4;
      word-break: break-word;
    }

    .card__title--done {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    /* ── Meta row (badge + due date) ── */
    .card__meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    /* ── Priority badge ── */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge--high   { background: #fef2f2; color: #b91c1c; }
    .badge--medium { background: #fff7ed; color: #c2410c; }
    .badge--low    { background: #eff6ff; color: #1d4ed8; }

    /* ── Due date ── */
    .due-date {
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .due-date--normal  { color: var(--text-muted); }
    .due-date--today   { color: var(--warning); }
    .due-date--overdue { color: var(--danger); }

    /* ── Label chips ── */
    .labels {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .label-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .label-chip__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ── Subtask progress ── */
    .subtask-progress {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .subtask-progress__bar {
      flex: 1;
      height: 4px;
      background: var(--border-color);
      border-radius: 2px;
      overflow: hidden;
    }

    .subtask-progress__fill {
      height: 100%;
      background: var(--accent-color);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .subtask-progress__fill--done {
      background: #22c55e;
    }

    .subtask-progress__label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      white-space: nowrap;
    }
  `],
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Output() statusChanged = new EventEmitter<TaskStatus>();
  @Output() deleted = new EventEmitter<string>();
  @Output() editClicked = new EventEmitter<Task>();

  get statusLabel(): string {
    return STATUS_LABEL[this.task.status];
  }

  get nextStatusLabel(): string {
    return STATUS_LABEL[STATUS_CYCLE[this.task.status]];
  }

  get priorityLabel(): string {
    return PRIORITY_LABEL[this.task.priority];
  }

  get formattedDueDate(): string {
    if (!this.task.dueDate) return '';
    return new Date(this.task.dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  get isOverdue(): boolean {
    if (!this.task.dueDate || this.task.status === 'DONE') return false;
    const due = new Date(this.task.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  get isDueToday(): boolean {
    if (!this.task.dueDate || this.task.status === 'DONE') return false;
    const due = new Date(this.task.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  }

  get dueDateClass(): string {
    if (this.isOverdue) return 'due-date--overdue';
    if (this.isDueToday) return 'due-date--today';
    return 'due-date--normal';
  }

  get completedSubtasks(): number {
    return this.task.subtasks?.filter(s => s.isCompleted).length ?? 0;
  }

  get subtaskCompletionPct(): number {
    if (!this.task.subtasks?.length) return 0;
    return Math.round((this.completedSubtasks / this.task.subtasks.length) * 100);
  }

  cycleStatus(): void {
    this.statusChanged.emit(STATUS_CYCLE[this.task.status]);
  }
}
