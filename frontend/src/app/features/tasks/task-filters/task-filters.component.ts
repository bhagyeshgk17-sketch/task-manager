import { Component, EventEmitter, inject, OnDestroy, OnInit, Output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Observable, Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TaskFilters, TaskPriority, TaskStatus } from '../../../core/models/task.model';
import { LabelsService } from '../../labels/labels.service';

@Component({
  selector: 'app-task-filters',
  imports: [ReactiveFormsModule],
  template: `
    <div class="filters">

      <div class="filter-group filter-group--search">
        <input
          type="search"
          class="input input--search"
          placeholder="Search tasks…"
          [formControl]="form.controls.search"
        />
      </div>

      <div class="filter-group">
        <select class="input input--select" [formControl]="form.controls.status">
          <option value="">All statuses</option>
          <option value="TODO">Todo</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
      </div>

      <div class="filter-group">
        <select class="input input--select" [formControl]="form.controls.priority">
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      <div class="filter-group">
        <select class="input input--select" [formControl]="form.controls.labelId">
          <option value="">All labels</option>
          @for (label of labelsService.labels(); track label.id) {
            <option [value]="label.id">{{ label.name }}</option>
          }
        </select>
      </div>

      <div class="filter-group">
        <select class="input input--select" [formControl]="form.controls.sortBy">
          <option value="createdAt">Created date</option>
          <option value="dueDate">Due date</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      <div class="filter-group">
        <button
          type="button"
          class="btn-sort"
          (click)="toggleSortOrder()"
          [attr.aria-label]="form.controls.sortOrder.value === 'ASC' ? 'Sort ascending' : 'Sort descending'"
          [title]="form.controls.sortOrder.value === 'ASC' ? 'Ascending' : 'Descending'"
        >
          @if (form.controls.sortOrder.value === 'ASC') {
            <span>&#x2191;</span> ASC
          } @else {
            <span>&#x2193;</span> DESC
          }
        </button>
      </div>

      <div class="filter-group">
        <button type="button" class="btn-clear" (click)="clearFilters()">
          Clear filters
        </button>
      </div>

    </div>
  `,
  styles: [`
    .filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 10px;
    }

    .filter-group {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .filter-group--search {
      flex: 1 1 200px;
      min-width: 160px;
    }

    .input {
      height: 36px;
      padding: 0 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 13px;
      color: var(--text-primary);
      background: var(--bg-card);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }

    .input:focus {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }

    .input--search {
      width: 100%;
      padding-left: 12px;
    }

    .input--select {
      padding-right: 28px;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      cursor: pointer;
    }

    .btn-sort {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 36px;
      padding: 0 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-card);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      white-space: nowrap;
    }

    .btn-sort:hover { background: var(--bg-secondary); border-color: var(--text-muted); }

    .btn-clear {
      height: 36px;
      padding: 0 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-card);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
    }

    .btn-clear:hover {
      background: #fef2f2;
      color: var(--danger);
      border-color: #fca5a5;
    }

    /* ── Mobile: stack all controls full-width ── */
    @media (max-width: 639px) {
      .filters {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 14px;
      }

      .filter-group,
      .filter-group--search {
        flex: unset;
        min-width: unset;
        width: 100%;
      }

      .input--select,
      .btn-sort,
      .btn-clear {
        width: 100%;
        justify-content: center;
      }

      .input--select {
        /* Keep arrow indicator */
        background-position: right 12px center;
      }
    }
  `],
})
export class TaskFiltersComponent implements OnInit, OnDestroy {
  @Output() filtersChanged = new EventEmitter<TaskFilters>();

  labelsService = inject(LabelsService);

  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  form = this.fb.nonNullable.group({
    search: [''],
    status: ['' as TaskStatus | ''],
    priority: ['' as TaskPriority | ''],
    labelId: ['' as number | ''],
    sortBy: ['createdAt'],
    sortOrder: ['ASC' as 'ASC' | 'DESC'],
  });

  ngOnInit(): void {
    this.labelsService.loadLabels();

    // Debounce search, instant emit for everything else
    this.form.controls.search.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.emit());

    const instantStreams: Observable<unknown>[] = [
      this.form.controls.status.valueChanges,
      this.form.controls.priority.valueChanges,
      this.form.controls.labelId.valueChanges,
      this.form.controls.sortBy.valueChanges,
      this.form.controls.sortOrder.valueChanges,
    ];

    for (const stream of instantStreams) {
      stream.pipe(takeUntil(this.destroy$)).subscribe(() => this.emit());
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSortOrder(): void {
    const current = this.form.controls.sortOrder.value;
    this.form.controls.sortOrder.setValue(current === 'ASC' ? 'DESC' : 'ASC');
  }

  clearFilters(): void {
    this.form.reset({
      search: '',
      status: '',
      priority: '',
      labelId: '',
      sortBy: 'createdAt',
      sortOrder: 'ASC',
    });
    // reset() doesn't trigger valueChanges for individual controls, emit manually
    this.emit();
  }

  private emit(): void {
    const { search, status, priority, labelId, sortBy, sortOrder } = this.form.getRawValue();
    const filters: TaskFilters = {
      ...(search     && { search }),
      ...(status     && { status }),
      ...(priority   && { priority }),
      ...(labelId    && { labelId: Number(labelId) }),
      ...(sortBy     && { sortBy }),
      sortOrder: sortOrder as 'ASC' | 'DESC',
      page: 1, // reset to first page on any filter change
    };
    this.filtersChanged.emit(filters);
  }
}
