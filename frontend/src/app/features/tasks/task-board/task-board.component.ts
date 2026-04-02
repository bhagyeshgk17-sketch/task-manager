import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
  CdkDrag,
  CdkDragPlaceholder,
  CdkDragPreview,
} from '@angular/cdk/drag-drop';
import { Task, TaskStatus } from '../../../core/models/task.model';
import { TaskCardComponent } from '../task-card/task-card.component';

interface Column {
  status: TaskStatus;
  label: string;
  colorClass: string;
}

const COLUMNS: Column[] = [
  { status: 'TODO',        label: 'Todo',        colorClass: 'col--todo' },
  { status: 'IN_PROGRESS', label: 'In Progress',  colorClass: 'col--in-progress' },
  { status: 'DONE',        label: 'Done',         colorClass: 'col--done' },
];

@Component({
  selector: 'app-task-board',
  imports: [
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    CdkDragPreview,
    TaskCardComponent,
  ],
  template: `
    <div class="board" cdkDropListGroup>
      @for (col of columns; track col.status) {
        <div class="col" [class]="col.colorClass">

          <div class="col__header">
            <span class="col__label">{{ col.label }}</span>
            <span class="col__count">{{ tasksFor(col.status).length }}</span>
          </div>

          <div
            class="col__body"
            cdkDropList
            [cdkDropListData]="col.status"
            [id]="col.status"
            (cdkDropListDropped)="onDrop($event)"
          >
            @for (task of tasksFor(col.status); track task.id) {
              <div cdkDrag [cdkDragData]="task" class="drag-item">

                <app-task-card
                  [task]="task"
                  (statusChanged)="statusChanged.emit({ id: task.id.toString(), status: $event })"
                  (deleted)="taskDeleted.emit($event)"
                  (editClicked)="taskEditClicked.emit($event)"
                />

                <!-- Drop placeholder shown in the source column while dragging -->
                <div *cdkDragPlaceholder class="drag-placeholder"></div>

                <!-- Custom drag preview (floating card while dragging) -->
                <div *cdkDragPreview class="drag-preview">
                  <span class="drag-preview__title">{{ task.title }}</span>
                </div>

              </div>
            }

            @if (tasksFor(col.status).length === 0) {
              <div class="col__empty">No tasks</div>
            }
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Board grid ── */
    .board {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      align-items: start;
    }

    /* Tablet: side-by-side but give each column more breathing room */
    @media (max-width: 1024px) and (min-width: 640px) {
      .board {
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
    }

    /* Mobile: single stacked column */
    @media (max-width: 639px) {
      .board {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }

    /* ── Column ── */
    .col {
      display: flex;
      flex-direction: column;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      overflow: hidden;
      min-height: 200px;
    }

    .col--todo        { background: var(--bg-primary); }
    .col--in-progress { background: #eff6ff; }
    .col--done        { background: #f0fdf4; }

    .col__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .col__label {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .col__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 11px;
      background: var(--border-color);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .col--in-progress .col__count { background: #dbeafe; color: #1d4ed8; }
    .col--done        .col__count { background: #dcfce7; color: #15803d; }

    /* ── Column body ── */
    .col__body {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      min-height: 80px;
      /* On desktop each column scrolls independently */
      max-height: calc(100vh - 280px);
      overflow-y: auto;
    }

    /* On mobile columns expand fully — no scroll cap so all tasks are visible */
    @media (max-width: 639px) {
      .col__body {
        max-height: none;
        overflow-y: visible;
      }
    }

    .col__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 0;
      font-size: 13px;
      color: var(--text-muted);
      font-style: italic;
    }

    /* ── Drag item wrapper ── */
    .drag-item { cursor: grab; }
    .drag-item:active { cursor: grabbing; }

    .drag-item.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    /* ── Placeholder ── */
    .drag-placeholder {
      height: 80px;
      border: 2px dashed var(--border-color);
      border-radius: 8px;
      background: transparent;
    }

    .col--in-progress .drag-placeholder { border-color: #93c5fd; }
    .col--done        .drag-placeholder { border-color: #86efac; }

    /* ── Drag preview ── */
    .drag-preview {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 14px;
      box-shadow: 0 8px 24px var(--shadow);
      max-width: 280px;
    }

    .drag-preview__title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .drag-item.cdk-drag-placeholder { opacity: 0; }

    .col__body.cdk-drop-list-dragging .drag-item:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `],
})
export class TaskBoardComponent {
  @Input({ required: true }) tasks: Task[] = [];
  @Output() statusChanged = new EventEmitter<{ id: string; status: TaskStatus }>();
  @Output() taskDeleted = new EventEmitter<string>();
  @Output() taskEditClicked = new EventEmitter<Task>();

  readonly columns = COLUMNS;

  tasksFor(status: TaskStatus): Task[] {
    return this.tasks.filter(t => t.status === status);
  }

  onDrop(event: CdkDragDrop<TaskStatus>): void {
    const newStatus = event.container.data;
    const previousStatus = event.previousContainer.data;

    if (newStatus === previousStatus) return;

    const task: Task = event.item.data;
    this.statusChanged.emit({ id: task.id.toString(), status: newStatus });
  }
}
