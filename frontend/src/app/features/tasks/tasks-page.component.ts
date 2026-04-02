import { Component, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TasksService } from './tasks.service';
import { LabelsService } from '../labels/labels.service';
import { TaskFilters, TaskStatus, Task } from '../../core/models/task.model';
import { TaskFiltersComponent } from './task-filters/task-filters.component';
import { TaskBoardComponent } from './task-board/task-board.component';
import { TaskFormComponent } from './task-form/task-form.component';
import { LabelManagerComponent } from '../labels/label-manager/label-manager.component';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-tasks-page',
  imports: [
    TaskFiltersComponent,
    TaskBoardComponent,
    TaskFormComponent,
    LabelManagerComponent,
    SpinnerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="page">

      <!-- Top bar -->
      <div class="top-bar">
        <h1 class="top-bar__heading">My Tasks</h1>
        <div class="top-bar__actions">
          <!-- Export dropdown -->
          <div class="export-wrapper">
            <button
              class="btn btn--ghost"
              [disabled]="tasksService.exportLoading() !== null"
              (click)="showExportMenu.set(!showExportMenu())"
            >
              @if (tasksService.exportLoading() !== null) {
                Exporting&#x2026;
              } @else {
                &#x2B07; Export &#x25BE;
              }
            </button>
            @if (showExportMenu()) {
              <div class="export-menu">
                <button class="export-menu__item" (click)="exportTasks('csv')">
                  Export CSV
                </button>
                <button class="export-menu__item" (click)="exportTasks('pdf')">
                  Export PDF
                </button>
              </div>
            }
          </div>

          <button class="btn btn--ghost" (click)="showLabelManager.set(true)">
            &#x1F3F7; Manage Labels
          </button>
          <button class="btn btn--primary" (click)="openCreateForm()">
            + Add Task
          </button>
        </div>
      </div>

      <!-- Filters -->
      <app-task-filters (filtersChanged)="onFiltersChanged($event)" />

      <!-- Body -->
      <div class="body">
        @if (tasksService.loading()) {
          <div class="centered">
            <app-spinner size="lg" />
          </div>
        } @else if (tasksService.tasks().length === 0) {
          <app-empty-state
            title="No tasks found"
            message="Try adjusting your filters or create a new task."
          />
        } @else {
          <app-task-board
            [tasks]="tasksService.tasks()"
            (statusChanged)="onStatusChanged($event.id, $event.status)"
            (taskDeleted)="onTaskDeleted($event)"
            (taskEditClicked)="openEditForm($event)"
          />
        }
      </div>

      <!-- Pagination -->
      @if (!tasksService.loading() && tasksService.totalPages() > 1) {
        <div class="pagination">
          <button
            class="btn btn--ghost btn--sm"
            [disabled]="tasksService.currentPage() === 1"
            (click)="goToPage(tasksService.currentPage() - 1)"
          >
            &#x2190; Previous
          </button>

          <span class="pagination__info">
            Page {{ tasksService.currentPage() }} of {{ tasksService.totalPages() }}
            <span class="pagination__total">({{ tasksService.totalTasks() }} tasks)</span>
          </span>

          <button
            class="btn btn--ghost btn--sm"
            [disabled]="tasksService.currentPage() === tasksService.totalPages()"
            (click)="goToPage(tasksService.currentPage() + 1)"
          >
            Next &#x2192;
          </button>
        </div>
      }

    </div>

    <!-- Task Form Modal -->
    @if (showTaskForm()) {
      <app-task-form
        [task]="editingTask()"
        (saved)="onFormSaved()"
        (cancelled)="closeTaskForm()"
      />
    }

    <!-- Label Manager -->
    @if (showLabelManager()) {
      <app-label-manager (closed)="showLabelManager.set(false)" />
    }
  `,
  styles: [`
    .page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* ── Top bar ── */
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .top-bar__heading {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .top-bar__actions {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }

    /* ── Body ── */
    .body {
      min-height: 200px;
    }

    .centered {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }

    /* ── Pagination ── */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 8px 0 4px;
    }

    .pagination__info {
      font-size: 14px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .pagination__total {
      font-weight: 400;
      color: var(--text-muted);
      margin-left: 4px;
    }

    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 38px;
      padding: 0 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      white-space: nowrap;
    }

    .btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .btn--primary {
      background: var(--accent-color);
      color: #ffffff;
    }

    .btn--primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn--ghost {
      background: var(--bg-card);
      color: var(--text-secondary);
      border-color: var(--border-color);
    }

    .btn--ghost:hover:not(:disabled) {
      background: var(--bg-secondary);
    }

    .btn--sm {
      height: 32px;
      padding: 0 12px;
      font-size: 13px;
    }

    /* ── Export dropdown ── */
    .export-wrapper {
      position: relative;
    }

    .export-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 100;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      min-width: 140px;
      overflow: hidden;
    }

    .export-menu__item {
      display: block;
      width: 100%;
      padding: 10px 16px;
      text-align: left;
      background: none;
      border: none;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      cursor: pointer;
      transition: background 0.12s;
    }

    .export-menu__item:hover {
      background: var(--bg-secondary);
    }
  `],
})
export class TasksPageComponent implements OnInit {
  tasksService = inject(TasksService);
  labelsService = inject(LabelsService);
  private titleService = inject(Title);

  showTaskForm = signal(false);
  showLabelManager = signal(false);
  showExportMenu = signal(false);
  editingTask = signal<Task | null>(null);

  ngOnInit(): void {
    this.titleService.setTitle('My Tasks | Task Manager');
    this.tasksService.loadTasks();
    this.labelsService.loadLabels();
  }

  onFiltersChanged(filters: TaskFilters): void {
    this.tasksService.loadTasks(filters);
  }

  onStatusChanged(id: string, status: TaskStatus): void {
    this.tasksService.updateTaskStatus(id, status);
  }

  onTaskDeleted(id: string): void {
    this.tasksService.deleteTask(id);
  }

  openCreateForm(): void {
    this.editingTask.set(null);
    this.showTaskForm.set(true);
  }

  openEditForm(task: Task): void {
    this.editingTask.set(task);
    this.showTaskForm.set(true);
  }

  closeTaskForm(): void {
    this.showTaskForm.set(false);
    this.editingTask.set(null);
  }

  onFormSaved(): void {
    this.closeTaskForm();
  }

  goToPage(page: number): void {
    this.tasksService.loadTasks({ ...this.tasksService.filters(), page });
  }

  exportTasks(format: 'csv' | 'pdf'): void {
    this.showExportMenu.set(false);
    this.tasksService.exportTasks(format);
  }
}
