import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { DashboardService } from './dashboard.service';
import { DashboardData } from '../../core/models/dashboard.model';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

// SVG ring constants
const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 263.9

@Component({
  selector: 'app-dashboard',
  imports: [SpinnerComponent],
  template: `
    <div class="page">

      <div class="top-bar">
        <h1 class="top-bar__heading">Dashboard</h1>
        <button class="btn btn--primary" (click)="router.navigate(['/tasks'])">
          Go to Tasks &#x2192;
        </button>
      </div>

      @if (loading()) {
        <div class="centered"><app-spinner size="lg" /></div>
      } @else if (data()) {

        <!-- ── Row 1: key stats ── -->
        <div class="grid grid--4">

          <!-- Total tasks -->
          <div class="stat-card">
            <span class="stat-card__label">Total Tasks</span>
            <span class="stat-card__value">{{ data()!.totalTasks }}</span>
          </div>

          <!-- Completion ring -->
          <div class="stat-card stat-card--ring">
            <span class="stat-card__label">Completion Rate</span>
            <div class="ring-wrap">
              <svg class="ring" viewBox="0 0 100 100">
                <circle class="ring__track" cx="50" cy="50" [attr.r]="radius" />
                <circle
                  class="ring__fill"
                  cx="50" cy="50"
                  [attr.r]="radius"
                  [attr.stroke-dasharray]="circumference"
                  [attr.stroke-dashoffset]="ringOffset()"
                />
              </svg>
              <span class="ring__label">{{ data()!.completionRate }}%</span>
            </div>
          </div>

          <!-- Overdue -->
          <div class="stat-card" [class.stat-card--alert]="data()!.overdueCount > 0">
            <span class="stat-card__label">Overdue</span>
            <span class="stat-card__value">{{ data()!.overdueCount }}</span>
            @if (data()!.overdueCount > 0) {
              <span class="stat-card__sub">Needs attention</span>
            }
          </div>

          <!-- Due today -->
          <div class="stat-card" [class.stat-card--warn]="data()!.dueTodayCount > 0">
            <span class="stat-card__label">Due Today</span>
            <span class="stat-card__value">{{ data()!.dueTodayCount }}</span>
            @if (data()!.dueTodayCount > 0) {
              <span class="stat-card__sub">Due today</span>
            }
          </div>

        </div>

        <!-- ── Row 2: by status ── -->
        <div class="section">
          <h2 class="section__title">By Status</h2>
          <div class="grid grid--3">

            <div class="mini-card mini-card--todo">
              <span class="mini-card__count">{{ data()!.byStatus.todo }}</span>
              <span class="mini-card__label">Todo</span>
            </div>

            <div class="mini-card mini-card--progress">
              <span class="mini-card__count">{{ data()!.byStatus.inProgress }}</span>
              <span class="mini-card__label">In Progress</span>
            </div>

            <div class="mini-card mini-card--done">
              <span class="mini-card__count">{{ data()!.byStatus.done }}</span>
              <span class="mini-card__label">Done</span>
            </div>

          </div>
        </div>

        <!-- ── Row 3: by priority ── -->
        <div class="section">
          <h2 class="section__title">By Priority</h2>
          <div class="grid grid--3">

            <div class="mini-card mini-card--low">
              <span class="mini-card__count">{{ data()!.byPriority.low }}</span>
              <span class="mini-card__label">Low</span>
            </div>

            <div class="mini-card mini-card--medium">
              <span class="mini-card__count">{{ data()!.byPriority.medium }}</span>
              <span class="mini-card__label">Medium</span>
            </div>

            <div class="mini-card mini-card--high">
              <span class="mini-card__count">{{ data()!.byPriority.high }}</span>
              <span class="mini-card__label">High</span>
            </div>

          </div>
        </div>

        <!-- ── Row 4: subtasks ── -->
        @if (data()!.subtaskStats && data()!.subtaskStats.total > 0) {
          <div class="section">
            <h2 class="section__title">Subtasks</h2>
            <div class="subtask-stat-card">
              <div class="subtask-stat-card__numbers">
                <span class="subtask-stat-card__done">{{ data()!.subtaskStats.completed }}</span>
                <span class="subtask-stat-card__sep">/</span>
                <span class="subtask-stat-card__total">{{ data()!.subtaskStats.total }}</span>
                <span class="subtask-stat-card__label">completed</span>
              </div>
              <div class="subtask-stat-card__bar-wrap">
                <div class="subtask-stat-card__bar">
                  <div
                    class="subtask-stat-card__fill"
                    [style.width.%]="subtaskCompletionRate()"
                  ></div>
                </div>
                <span class="subtask-stat-card__pct">{{ subtaskCompletionRate() }}%</span>
              </div>
            </div>
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .page {
      display: flex;
      flex-direction: column;
      gap: 28px;
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

    .centered {
      display: flex;
      justify-content: center;
      padding: 64px 0;
    }

    /* ── Grids ── */
    .grid {
      display: grid;
      gap: 16px;
    }

    /* Desktop */
    .grid--4 { grid-template-columns: repeat(4, 1fr); }
    .grid--3 { grid-template-columns: repeat(3, 1fr); }

    /* Tablet: 4-col → 2-col, 3-col stays */
    @media (max-width: 1024px) and (min-width: 641px) {
      .grid--4 { grid-template-columns: repeat(2, 1fr); }
    }

    /* Mobile: everything single column */
    @media (max-width: 640px) {
      .grid--4,
      .grid--3 { grid-template-columns: 1fr; }

      .top-bar { flex-direction: column; align-items: flex-start; }

      .stat-card__value { font-size: 32px; }

      .ring-wrap { width: 76px; height: 76px; }
    }

    /* ── Section ── */
    .section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section__title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── Stat cards (large) ── */
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: box-shadow 0.15s;
    }

    .stat-card:hover {
      box-shadow: 0 2px 12px var(--shadow);
    }

    .stat-card--alert {
      background: #fef2f2;
      border-color: #fca5a5;
    }

    .stat-card--warn {
      background: #fff7ed;
      border-color: #fed7aa;
    }

    .stat-card__label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stat-card__value {
      font-size: 40px;
      font-weight: 800;
      color: var(--text-primary);
      line-height: 1;
    }

    .stat-card--alert .stat-card__value { color: #dc2626; }
    .stat-card--warn  .stat-card__value { color: #ea580c; }

    .stat-card__sub {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* ── Completion ring ── */
    .stat-card--ring {
      align-items: flex-start;
    }

    .ring-wrap {
      position: relative;
      width: 90px;
      height: 90px;
      margin-top: 4px;
    }

    .ring {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .ring__track {
      fill: none;
      stroke: var(--border-color);
      stroke-width: 10;
    }

    .ring__fill {
      fill: none;
      stroke: var(--accent-color);
      stroke-width: 10;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.6s ease;
    }

    .ring__label {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
    }

    /* ── Mini cards ── */
    .mini-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-left-width: 4px;
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      align-items: baseline;
      gap: 12px;
    }

    .mini-card__count {
      font-size: 28px;
      font-weight: 800;
      line-height: 1;
    }

    .mini-card__label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }

    /* Status variants */
    .mini-card--todo     { border-left-color: #9ca3af; }
    .mini-card--todo     .mini-card__count { color: var(--text-secondary); }

    .mini-card--progress { border-left-color: #3b82f6; }
    .mini-card--progress .mini-card__count { color: #2563eb; }

    .mini-card--done     { border-left-color: #22c55e; }
    .mini-card--done     .mini-card__count { color: #16a34a; }

    /* Priority variants */
    .mini-card--low    { border-left-color: #3b82f6; }
    .mini-card--low    .mini-card__count { color: #1d4ed8; }

    .mini-card--medium { border-left-color: #f97316; }
    .mini-card--medium .mini-card__count { color: #c2410c; }

    .mini-card--high   { border-left-color: #ef4444; }
    .mini-card--high   .mini-card__count { color: #b91c1c; }

    /* ── Subtask stat card ── */
    .subtask-stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--accent-color);
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .subtask-stat-card__numbers {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .subtask-stat-card__done {
      font-size: 28px;
      font-weight: 800;
      color: var(--accent-color);
      line-height: 1;
    }

    .subtask-stat-card__sep {
      font-size: 20px;
      font-weight: 400;
      color: var(--text-muted);
    }

    .subtask-stat-card__total {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-secondary);
      line-height: 1;
    }

    .subtask-stat-card__label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      margin-left: 6px;
    }

    .subtask-stat-card__bar-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .subtask-stat-card__bar {
      flex: 1;
      height: 6px;
      background: var(--border-color);
      border-radius: 3px;
      overflow: hidden;
    }

    .subtask-stat-card__fill {
      height: 100%;
      background: var(--accent-color);
      border-radius: 3px;
      transition: width 0.4s ease;
    }

    .subtask-stat-card__pct {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent-color);
      min-width: 36px;
      text-align: right;
    }

    /* ── Button ── */
    .btn {
      display: inline-flex;
      align-items: center;
      height: 38px;
      padding: 0 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: background 0.15s;
    }

    .btn--primary {
      background: var(--accent-color);
      color: #ffffff;
    }

    .btn--primary:hover {
      background: #2563eb;
    }
  `],
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private destroyRef = inject(DestroyRef);
  private titleService = inject(Title);
  router = inject(Router);

  data = signal<DashboardData | null>(null);
  loading = signal(true);

  readonly radius = RING_RADIUS;
  readonly circumference = RING_CIRCUMFERENCE;

  ringOffset = computed(() => {
    const rate = this.data()?.completionRate ?? 0;
    return RING_CIRCUMFERENCE * (1 - rate / 100);
  });

  subtaskCompletionRate = computed(() => {
    const stats = this.data()?.subtaskStats;
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  });

  ngOnInit(): void {
    this.titleService.setTitle('Dashboard | Task Manager');

    this.dashboardService.getDashboardData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
