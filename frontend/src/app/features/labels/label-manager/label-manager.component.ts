import { Component, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabelsService } from '../labels.service';
import { Label } from '../../../core/models/label.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

interface EditState {
  id: string;
  name: string;
  color: string;
}

interface DeleteState {
  id: string;
  name: string;
}

@Component({
  selector: 'app-label-manager',
  imports: [FormsModule, SpinnerComponent, EmptyStateComponent],
  template: `
    <div class="overlay" (click)="onOverlayClick($event)">
      <div class="panel" role="dialog" aria-modal="true" aria-label="Manage labels">

        <div class="panel__header">
          <h2 class="panel__title">Labels</h2>
          <button class="panel__close" (click)="closed.emit()" aria-label="Close">&#x2715;</button>
        </div>

        <div class="panel__body">

          @if (labelsService.loading()) {
            <app-spinner size="md" />
          } @else if (labelsService.labels().length === 0) {
            <app-empty-state
              title="No labels yet"
              message="Create a label below to organize your tasks."
            />
          } @else {
            <ul class="label-list">
              @for (label of labelsService.labels(); track label.id) {
                <li class="label-item">

                  @if (editState()?.id === label.id) {
                    <!-- inline edit row -->
                    <input
                      type="color"
                      class="color-picker color-picker--sm"
                      [(ngModel)]="editState()!.color"
                    />
                    <input
                      type="text"
                      class="text-input text-input--grow"
                      [(ngModel)]="editState()!.name"
                      (keydown.enter)="commitEdit()"
                      (keydown.escape)="cancelEdit()"
                      #editInput
                      autofocus
                    />
                    <button class="btn btn--save" (click)="commitEdit()">Save</button>
                    <button class="btn btn--ghost" (click)="cancelEdit()">Cancel</button>
                  } @else {
                    <!-- display row -->
                    <span class="color-dot" [style.background]="label.color"></span>
                    <span class="label-name">{{ label.name }}</span>
                    <div class="label-actions">
                      <button class="btn btn--ghost" (click)="startEdit(label)">Edit</button>
                      <button class="btn btn--danger-ghost" (click)="askDelete(label)">Delete</button>
                    </div>
                  }

                </li>

                <!-- inline delete confirmation -->
                @if (deleteState()?.id === label.id) {
                  <li class="confirm-row">
                    <span class="confirm-text">
                      Delete <strong>{{ label.name }}</strong>? This cannot be undone.
                    </span>
                    <button class="btn btn--danger" (click)="confirmDelete()">Yes, delete</button>
                    <button class="btn btn--ghost" (click)="cancelDelete()">Cancel</button>
                  </li>
                }
              }
            </ul>
          }

        </div>

        <div class="panel__footer">
          <h3 class="footer__title">New label</h3>
          <div class="create-row">
            <input
              type="color"
              class="color-picker"
              [(ngModel)]="newColor"
              title="Pick a color"
            />
            <input
              type="text"
              class="text-input text-input--grow"
              [(ngModel)]="newName"
              placeholder="Label name"
              (keydown.enter)="create()"
              maxlength="32"
            />
            <button
              class="btn btn--primary"
              (click)="create()"
              [disabled]="!newName.trim()"
            >
              Add
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 500;
      display: flex;
      justify-content: flex-end;
    }

    .panel {
      display: flex;
      flex-direction: column;
      width: 360px;
      max-width: 100vw;
      height: 100%;
      background: var(--bg-card);
      box-shadow: -4px 0 24px var(--shadow);
      animation: slide-in 0.22s ease-out;
    }

    @keyframes slide-in {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }

    /* ── Header ── */
    .panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .panel__title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .panel__close {
      background: none;
      border: none;
      font-size: 18px;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      border-radius: 4px;
    }

    .panel__close:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    /* ── Body ── */
    .panel__body {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }

    .label-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .label-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      min-height: 48px;
    }

    .label-item:hover {
      background: var(--bg-secondary);
    }

    .color-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 1px solid rgba(0,0,0,0.08);
    }

    .label-name {
      flex: 1;
      font-size: 14px;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .label-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    /* ── Confirm row ── */
    .confirm-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 20px 12px;
      background: #fef2f2;
      border-top: 1px solid #fecaca;
      border-bottom: 1px solid #fecaca;
    }

    .confirm-text {
      flex: 1 1 100%;
      font-size: 13px;
      color: #7f1d1d;
    }

    /* ── Footer ── */
    .panel__footer {
      border-top: 1px solid var(--border-color);
      padding: 16px 20px 20px;
      flex-shrink: 0;
    }

    .footer__title {
      margin: 0 0 12px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .create-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* ── Shared inputs ── */
    .color-picker {
      width: 36px;
      height: 36px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 2px;
      cursor: pointer;
      background: var(--bg-card);
      flex-shrink: 0;
    }

    .color-picker--sm {
      width: 28px;
      height: 28px;
    }

    .text-input {
      padding: 8px 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 14px;
      color: var(--text-primary);
      background: var(--bg-card);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .text-input:focus {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
    }

    .text-input--grow {
      flex: 1;
      min-width: 0;
    }

    /* ── Buttons ── */
    .btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn--primary {
      background: var(--accent-color);
      color: #fff;
      border-color: var(--accent-color);
    }

    .btn--primary:hover:not(:disabled) {
      background: #2563eb;
      border-color: #2563eb;
    }

    .btn--save {
      background: #f0fdf4;
      color: #15803d;
      border-color: #86efac;
    }

    .btn--save:hover {
      background: #dcfce7;
    }

    .btn--ghost {
      background: transparent;
      color: var(--text-muted);
      border-color: var(--border-color);
    }

    .btn--ghost:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    .btn--danger-ghost {
      background: transparent;
      color: var(--danger);
      border-color: transparent;
    }

    .btn--danger-ghost:hover {
      background: #fef2f2;
      border-color: #fca5a5;
    }

    .btn--danger {
      background: var(--danger);
      color: #fff;
      border-color: var(--danger);
    }

    .btn--danger:hover {
      background: #dc2626;
      border-color: #dc2626;
    }
  `],
})
export class LabelManagerComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  labelsService = inject(LabelsService);

  // Create form state
  newName = '';
  newColor = '#6366f1';

  // Edit state: one label editable at a time
  editState = signal<EditState | null>(null);

  // Delete confirmation state
  deleteState = signal<DeleteState | null>(null);

  ngOnInit(): void {
    this.labelsService.loadLabels();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('overlay')) {
      this.closed.emit();
    }
  }

  // ── Create ──────────────────────────────────────────────
  create(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.labelsService.createLabel(name, this.newColor);
    this.newName = '';
    this.newColor = '#6366f1';
  }

  // ── Edit ────────────────────────────────────────────────
  startEdit(label: Label): void {
    this.deleteState.set(null);
    this.editState.set({ id: label.id, name: label.name, color: label.color });
  }

  commitEdit(): void {
    const state = this.editState();
    if (!state || !state.name.trim()) return;
    this.labelsService.updateLabel(state.id, state.name.trim(), state.color);
    this.editState.set(null);
  }

  cancelEdit(): void {
    this.editState.set(null);
  }

  // ── Delete ──────────────────────────────────────────────
  askDelete(label: Label): void {
    this.editState.set(null);
    this.deleteState.set({ id: label.id, name: label.name });
  }

  confirmDelete(): void {
    const state = this.deleteState();
    if (!state) return;
    this.labelsService.deleteLabel(state.id);
    this.deleteState.set(null);
  }

  cancelDelete(): void {
    this.deleteState.set(null);
  }
}
