import {
  Component, EventEmitter, inject, Input, OnInit, Output, signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { Task, TaskActivity, TaskPriority, TaskStatus, CreateTaskData, UpdateTaskData } from '../../../core/models/task.model';
import { Subtask } from '../../../core/models/subtask.model';
import { TasksService } from '../tasks.service';
import { SubtasksService } from '../subtasks.service';
import { LabelsService } from '../../labels/labels.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

function notInPastValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const selected = new Date(control.value);
  selected.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected < today ? { pastDate: true } : null;
}

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule, SpinnerComponent, CdkDropList, CdkDrag, CdkDragHandle],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="isEditMode ? 'Edit task' : 'New task'">

        <div class="modal__header">
          <h2 class="modal__title">{{ isEditMode ? 'Edit task' : 'New task' }}</h2>
          <button class="modal__close" type="button" (click)="cancelled.emit()" aria-label="Close">
            &#x2715;
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="form">

          <!-- Title -->
          <div class="field">
            <label class="field__label" for="title">Title <span class="required">*</span></label>
            <input
              id="title"
              type="text"
              class="field__input"
              [class.field__input--error]="titleInvalid"
              formControlName="title"
              placeholder="What needs to be done?"
              maxlength="120"
            />
            @if (titleInvalid) {
              <span class="field__error">
                @if (title.hasError('required')) { Title is required. }
                @else if (title.hasError('minlength')) { Title must be at least 2 characters. }
              </span>
            }
          </div>

          <!-- Description -->
          <div class="field">
            <label class="field__label" for="description">Description</label>
            <textarea
              id="description"
              class="field__input field__input--textarea"
              formControlName="description"
              placeholder="Add details…"
              rows="3"
            ></textarea>
          </div>

          <div class="field-row">

            <!-- Priority -->
            <div class="field field--half">
              <label class="field__label" for="priority">Priority</label>
              <select id="priority" class="field__input field__input--select" formControlName="priority">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <!-- Status (edit mode only) -->
            @if (isEditMode) {
              <div class="field field--half">
                <label class="field__label" for="status">Status</label>
                <select id="status" class="field__input field__input--select" formControlName="status">
                  <option value="TODO">Todo</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            }

          </div>

          <!-- Due Date -->
          <div class="field">
            <label class="field__label" for="dueDate">Due date</label>
            <input
              id="dueDate"
              type="date"
              class="field__input"
              [class.field__input--error]="dueDateInvalid"
              formControlName="dueDate"
            />
            @if (dueDateInvalid) {
              <span class="field__error">Due date cannot be in the past.</span>
            }
          </div>

          <!-- Labels -->
          @if (labelsService.labels().length > 0) {
            <div class="field">
              <span class="field__label">Labels</span>
              <div class="label-grid">
                @for (label of labelsService.labels(); track label.id) {
                  <label class="label-option">
                    <input
                      type="checkbox"
                      class="label-option__checkbox"
                      [value]="label.id"
                      [checked]="isLabelSelected(label.id)"
                      (change)="toggleLabel(label.id, $event)"
                    />
                    <span class="label-option__dot" [style.background]="label.color"></span>
                    <span class="label-option__name">{{ label.name }}</span>
                  </label>
                }
              </div>
            </div>
          }

          <!-- Subtasks -->
          <div class="field">
            <span class="field__label">Subtasks
              @if (subtasks().length > 0) {
                <span class="subtask-count">{{ completedCount }}/{{ subtasks().length }}</span>
              }
            </span>

            @if (isEditMode) {
              <!-- Checklist -->
              @if (subtasks().length > 0) {
                <div
                  cdkDropList
                  [cdkDropListData]="subtasks()"
                  (cdkDropListDropped)="onSubtaskDrop($event)"
                  class="subtask-list"
                >
                  @for (subtask of subtasks(); track subtask.id) {
                    <div cdkDrag class="subtask-item">
                      <span cdkDragHandle class="subtask-drag" title="Drag to reorder">&#x2807;</span>

                      <input
                        type="checkbox"
                        class="subtask-checkbox"
                        [checked]="subtask.isCompleted"
                        (change)="toggleSubtask(subtask)"
                      />

                      @if (editingSubtaskId() === subtask.id) {
                        <input
                          class="subtask-title-input"
                          type="text"
                          [value]="editingTitle()"
                          (input)="editingTitle.set($any($event.target).value)"
                          (blur)="saveSubtaskTitle(subtask.id)"
                          (keydown.enter)="saveSubtaskTitle(subtask.id)"
                          (keydown.escape)="cancelEditingSubtask()"
                        />
                      } @else {
                        <span
                          class="subtask-title"
                          [class.subtask-title--done]="subtask.isCompleted"
                          (click)="startEditingSubtask(subtask)"
                          title="Click to edit"
                        >{{ subtask.title }}</span>
                      }

                      <button
                        type="button"
                        class="subtask-delete"
                        title="Delete subtask"
                        (click)="deleteSubtask(subtask.id)"
                      >&#x2715;</button>
                    </div>
                  }
                </div>
              }

              <!-- Add subtask input -->
              <div class="subtask-add">
                <input
                  type="text"
                  class="field__input subtask-add__input"
                  placeholder="Add a subtask…"
                  [value]="newSubtaskTitle()"
                  (input)="newSubtaskTitle.set($any($event.target).value)"
                  (keydown.enter)="addSubtask()"
                />
                <button
                  type="button"
                  class="btn btn--ghost subtask-add__btn"
                  (click)="addSubtask()"
                  [disabled]="!newSubtaskTitle().trim() || subtaskLoading()"
                >
                  @if (subtaskLoading()) { <app-spinner size="sm" /> } @else { Add }
                </button>
              </div>
            } @else {
              <p class="subtask-note">Save this task first, then you can add subtasks.</p>
            }
          </div>

          <!-- Activity (edit mode only) -->
          @if (isEditMode) {
            <div class="activity-panel">
              <button
                type="button"
                class="activity-toggle"
                (click)="toggleActivity()"
                [attr.aria-expanded]="activityOpen()"
              >
                <span class="activity-toggle__label">Activity</span>
                <span class="activity-toggle__chevron" [class.activity-toggle__chevron--open]="activityOpen()">&#x25BE;</span>
              </button>

              @if (activityOpen()) {
                <div class="activity-body">
                  @if (activityLoading()) {
                    <div class="activity-loading"><app-spinner size="sm" /></div>
                  } @else if (activities().length === 0) {
                    <p class="activity-empty">No activity yet.</p>
                  } @else {
                    <ol class="timeline">
                      @for (entry of activities(); track entry.id) {
                        <li class="timeline__item">
                          <span class="timeline__dot"></span>
                          <div class="timeline__content">
                            <span class="timeline__text">{{ formatActivity(entry) }}</span>
                            <span class="timeline__meta">{{ entry.user.name }} &middot; {{ timeAgo(entry.createdAt) }}</span>
                          </div>
                        </li>
                      }
                    </ol>
                  }
                </div>
              }
            </div>
          }

          <!-- Actions -->
          <div class="form__actions">
            <button type="button" class="btn btn--ghost" (click)="cancelled.emit()">
              Cancel
            </button>
            <button type="submit" class="btn btn--primary" [disabled]="loading()">
              @if (loading()) {
                <app-spinner size="sm" />
              } @else {
                {{ isEditMode ? 'Save changes' : 'Create task' }}
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
    }

    .modal {
      background: var(--bg-card);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      animation: pop-in 0.2s ease-out;
    }

    @keyframes pop-in {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* ── Full-screen modal on mobile ── */
    @media (max-width: 639px) {
      .modal-overlay {
        padding: 0;
        align-items: flex-end;
      }

      .modal {
        border-radius: 16px 16px 0 0;
        max-width: 100%;
        max-height: 96vh;
        width: 100%;
        animation: slide-up 0.25s ease-out;
      }

      @keyframes slide-up {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }
    }

    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .modal__title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .modal__close {
      background: none;
      border: none;
      font-size: 18px;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      line-height: 1;
    }

    .modal__close:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    /* ── Form ── */
    .form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 24px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-row {
      display: flex;
      gap: 16px;
    }

    .field--half {
      flex: 1;
      min-width: 0;
    }

    .field__label {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .required {
      color: var(--danger);
    }

    .field__input {
      padding: 9px 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text-primary);
      background: var(--bg-card);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
      width: 100%;
      font-family: inherit;
    }

    .field__input:focus {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
    }

    .field__input--error {
      border-color: var(--danger);
    }

    .field__input--error:focus {
      border-color: var(--danger);
      box-shadow: 0 0 0 3px rgba(239,68,68,0.15);
    }

    .field__input--textarea {
      resize: vertical;
      min-height: 72px;
    }

    .field__input--select {
      appearance: none;
      padding-right: 32px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      cursor: pointer;
    }

    .field__error {
      font-size: 12px;
      color: var(--danger);
    }

    /* ── Label checkboxes ── */
    .label-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .label-option {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border: 1px solid var(--border-color);
      border-radius: 20px;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-secondary);
      transition: background 0.15s, border-color 0.15s;
      user-select: none;
    }

    .label-option:has(.label-option__checkbox:checked) {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #1d4ed8;
    }

    .label-option__checkbox {
      display: none;
    }

    .label-option__dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .label-option__name {
      white-space: nowrap;
    }

    /* ── Subtasks ── */
    .subtask-count {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-secondary);
      padding: 1px 7px;
      border-radius: 10px;
    }

    .subtask-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    }

    .subtask-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      background: var(--bg-secondary);
      border: 1px solid transparent;
      transition: border-color 0.15s;
    }

    .subtask-item:hover {
      border-color: var(--border-color);
    }

    .subtask-item.cdk-drag-preview {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      border-color: var(--accent-color);
      background: var(--bg-card);
    }

    .subtask-item.cdk-drag-placeholder {
      opacity: 0.3;
    }

    .subtask-drag {
      font-size: 16px;
      color: var(--text-muted);
      cursor: grab;
      flex-shrink: 0;
      user-select: none;
      line-height: 1;
    }

    .subtask-drag:active {
      cursor: grabbing;
    }

    .subtask-checkbox {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      cursor: pointer;
      accent-color: var(--accent-color);
    }

    .subtask-title {
      flex: 1;
      font-size: 13px;
      color: var(--text-primary);
      cursor: pointer;
      min-width: 0;
      word-break: break-word;
      padding: 2px 4px;
      border-radius: 4px;
      transition: background 0.1s;
    }

    .subtask-title:hover {
      background: var(--bg-card);
    }

    .subtask-title--done {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .subtask-title-input {
      flex: 1;
      padding: 2px 6px;
      border: 1px solid var(--accent-color);
      border-radius: 4px;
      font-size: 13px;
      color: var(--text-primary);
      background: var(--bg-card);
      outline: none;
      box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
      font-family: inherit;
      min-width: 0;
    }

    .subtask-delete {
      flex-shrink: 0;
      background: none;
      border: none;
      font-size: 13px;
      color: var(--text-muted);
      cursor: pointer;
      padding: 3px 5px;
      border-radius: 4px;
      line-height: 1;
      transition: background 0.15s, color 0.15s;
    }

    .subtask-delete:hover {
      background: #fef2f2;
      color: var(--danger);
    }

    .subtask-add {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .subtask-add__input {
      flex: 1;
    }

    .subtask-add__btn {
      flex-shrink: 0;
      height: 38px;
      padding: 0 14px;
    }

    .subtask-note {
      margin: 0;
      font-size: 13px;
      color: var(--text-muted);
      font-style: italic;
    }

    /* ── Activity panel ── */
    .activity-panel {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .activity-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--bg-secondary);
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      transition: background 0.15s;
    }

    .activity-toggle:hover {
      background: var(--border-color);
    }

    .activity-toggle__label {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .activity-toggle__chevron {
      font-size: 12px;
      transition: transform 0.2s;
      color: var(--text-muted);
    }

    .activity-toggle__chevron--open {
      transform: rotate(180deg);
    }

    .activity-body {
      padding: 12px 16px;
      background: var(--bg-card);
    }

    .activity-loading {
      display: flex;
      justify-content: center;
      padding: 12px 0;
    }

    .activity-empty {
      margin: 0;
      font-size: 13px;
      color: var(--text-muted);
      text-align: center;
      padding: 8px 0;
      font-style: italic;
    }

    /* ── Timeline ── */
    .timeline {
      list-style: none;
      margin: 0;
      padding: 0;
      position: relative;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: var(--border-color);
    }

    .timeline__item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 6px 0;
      position: relative;
    }

    .timeline__dot {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--accent-color);
      border: 2px solid var(--bg-card);
      margin-top: 2px;
      position: relative;
      z-index: 1;
    }

    .timeline__content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .timeline__text {
      font-size: 13px;
      color: var(--text-primary);
      line-height: 1.4;
    }

    .timeline__meta {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* ── Actions ── */
    .form__actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 4px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 40px;
      padding: 0 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    .btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .btn--primary {
      background: var(--accent-color);
      color: #ffffff;
      min-width: 120px;
    }

    .btn--primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn--ghost {
      background: transparent;
      color: var(--text-muted);
      border-color: var(--border-color);
    }

    .btn--ghost:hover:not(:disabled) {
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }
  `],
})
export class TaskFormComponent implements OnInit {
  @Input() task: Task | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  tasksService = inject(TasksService);
  labelsService = inject(LabelsService);
  private subtasksService = inject(SubtasksService);

  loading = signal(false);
  selectedLabelIds = signal<string[]>([]);

  activityOpen = signal(false);
  activityLoading = signal(false);
  activities = signal<TaskActivity[]>([]);

  subtasks = signal<Subtask[]>([]);
  editingSubtaskId = signal<string | null>(null);
  editingTitle = signal('');
  newSubtaskTitle = signal('');
  subtaskLoading = signal(false);

  form = this.fb.nonNullable.group({
    title:       ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    priority:    ['MEDIUM' as TaskPriority],
    status:      ['TODO' as TaskStatus],
    dueDate:     ['', notInPastValidator],
  });

  get isEditMode(): boolean { return !!this.task; }
  get title()   { return this.form.controls.title; }
  get dueDate() { return this.form.controls.dueDate; }

  get titleInvalid()   { return this.title.invalid && this.title.touched; }
  get dueDateInvalid() { return this.dueDate.invalid && this.dueDate.touched; }

  get completedCount(): number {
    return this.subtasks().filter(s => s.isCompleted).length;
  }

  ngOnInit(): void {
    this.labelsService.loadLabels();

    if (this.task) {
      this.form.patchValue({
        title:       this.task.title,
        description: this.task.description,
        priority:    this.task.priority,
        status:      this.task.status,
        dueDate:     this.task.dueDate ? this.task.dueDate.substring(0, 10) : '',
      });
      this.selectedLabelIds.set(this.task.labels.map(l => l.id));
      this.subtasks.set([...(this.task.subtasks ?? [])]);
    }
  }

  isLabelSelected(id: string): boolean {
    return this.selectedLabelIds().includes(id);
  }

  toggleLabel(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedLabelIds.update(ids =>
      checked ? [...ids, id] : ids.filter(i => i !== id)
    );
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cancelled.emit();
    }
  }

  // ── Subtask methods ──────────────────────────────────────────────────────

  addSubtask(): void {
    const title = this.newSubtaskTitle().trim();
    if (!title || !this.task) return;

    this.subtaskLoading.set(true);
    this.subtasksService.addSubtask(this.task.id, title).subscribe({
      next: (subtask) => {
        this.subtasks.update(list => [...list, subtask]);
        this.newSubtaskTitle.set('');
        this.subtaskLoading.set(false);
      },
      error: () => this.subtaskLoading.set(false),
    });
  }

  toggleSubtask(subtask: Subtask): void {
    const updated = { ...subtask, isCompleted: !subtask.isCompleted };
    this.subtasks.update(list => list.map(s => s.id === subtask.id ? updated : s));

    this.subtasksService
      .updateSubtask(this.task!.id, subtask.id, { isCompleted: updated.isCompleted })
      .subscribe({
        error: () => {
          // Revert on failure
          this.subtasks.update(list => list.map(s => s.id === subtask.id ? subtask : s));
        },
      });
  }

  startEditingSubtask(subtask: Subtask): void {
    this.editingSubtaskId.set(subtask.id);
    this.editingTitle.set(subtask.title);
  }

  saveSubtaskTitle(subtaskId: string): void {
    const newTitle = this.editingTitle().trim();
    if (!newTitle) {
      this.cancelEditingSubtask();
      return;
    }

    const original = this.subtasks().find(s => s.id === subtaskId);
    if (!original || newTitle === original.title) {
      this.cancelEditingSubtask();
      return;
    }

    this.subtasks.update(list =>
      list.map(s => s.id === subtaskId ? { ...s, title: newTitle } : s)
    );
    this.editingSubtaskId.set(null);

    this.subtasksService
      .updateSubtask(this.task!.id, subtaskId, { title: newTitle })
      .subscribe({
        error: () => {
          // Revert on failure
          this.subtasks.update(list =>
            list.map(s => s.id === subtaskId ? original : s)
          );
        },
      });
  }

  cancelEditingSubtask(): void {
    this.editingSubtaskId.set(null);
    this.editingTitle.set('');
  }

  deleteSubtask(subtaskId: string): void {
    const original = this.subtasks();
    this.subtasks.update(list => list.filter(s => s.id !== subtaskId));

    this.subtasksService.deleteSubtask(this.task!.id, subtaskId).subscribe({
      error: () => this.subtasks.set(original),
    });
  }

  onSubtaskDrop(event: CdkDragDrop<Subtask[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const items = [...this.subtasks()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.subtasks.set(items);

    this.subtasksService
      .reorderSubtasks(this.task!.id, items.map(s => s.id))
      .subscribe();
  }

  // ── Activity ─────────────────────────────────────────────────────────────

  toggleActivity(): void {
    const opening = !this.activityOpen();
    this.activityOpen.set(opening);
    if (opening && this.activities().length === 0) {
      this.loadActivity();
    }
  }

  private loadActivity(): void {
    if (!this.task) return;
    this.activityLoading.set(true);
    this.tasksService.getTaskActivities(this.task.id).subscribe({
      next: (list) => {
        this.activities.set(list);
        this.activityLoading.set(false);
      },
      error: () => this.activityLoading.set(false),
    });
  }

  formatActivity(entry: TaskActivity): string {
    const o = entry.oldValue ?? '';
    const n = entry.newValue ?? '';
    switch (entry.action) {
      case 'CREATED':           return 'Created this task';
      case 'DELETED':           return `Deleted task "${o || n}"`;
      case 'STATUS_CHANGED':    return `Changed status from ${this.humanStatus(o)} to ${this.humanStatus(n)}`;
      case 'PRIORITY_CHANGED':  return `Changed priority from ${this.humanPriority(o)} to ${this.humanPriority(n)}`;
      case 'TITLE_UPDATED':     return `Renamed from "${o}" to "${n}"`;
      case 'DESCRIPTION_UPDATED': return o ? `Updated description` : 'Added a description';
      case 'DUE_DATE_CHANGED':  return n ? `Changed due date${o ? ` from ${o}` : ''} to ${n}` : `Removed due date`;
      case 'LABEL_ADDED':       return `Added label "${n}"`;
      case 'LABEL_REMOVED':     return `Removed label "${o}"`;
      default:                  return entry.action;
    }
  }

  private humanStatus(s: string): string {
    return s === 'IN_PROGRESS' ? 'In Progress' : s === 'TODO' ? 'Todo' : s === 'DONE' ? 'Done' : s;
  }

  private humanPriority(s: string): string {
    return s ? s.charAt(0) + s.slice(1).toLowerCase() : s;
  }

  timeAgo(dateStr: string): string {
    const utc = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const diff = Date.now() - new Date(utc).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const d = new Date(utc);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ── Form submit ──────────────────────────────────────────────────────────

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { status, title, description, priority, dueDate } = this.form.getRawValue();
    const labelIds = this.selectedLabelIds();

    this.loading.set(true);
    const request$ = this.isEditMode
      ? this.tasksService.updateTask(this.task!.id, { title, description, priority, status, dueDate: dueDate || null, labelIds } satisfies UpdateTaskData)
      : this.tasksService.createTask({ title, description, priority, dueDate: dueDate || null, labelIds } satisfies CreateTaskData);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        if (this.activityOpen()) {
          this.loadActivity();
        } else {
          this.activities.set([]);
        }
        this.saved.emit();
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
