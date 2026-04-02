import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import {
  ReactiveFormsModule, FormBuilder, Validators,
  AbstractControl, ValidationErrors,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('newPassword')?.value;
  const cpw = group.get('confirmNewPassword')?.value;
  return pw === cpw ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, SpinnerComponent],
  template: `
    <div class="page">
      <h1 class="page__heading">Profile</h1>

      <!-- ── Account info banner ── -->
      <div class="info-card">
        <div class="info-row">
          <span class="info-row__label">Email</span>
          <span class="info-row__value">{{ authService.currentUser()?.email }}</span>
        </div>
        <div class="info-row">
          <span class="info-row__label">Member since</span>
          <span class="info-row__value">{{ memberSince }}</span>
        </div>
      </div>

      <div class="sections">

        <!-- ── Section 1: Edit Profile ── -->
        <section class="card">
          <h2 class="card__title">Edit Profile</h2>

          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate class="form">

            <div class="field">
              <label class="field__label" for="name">Name</label>
              <input
                id="name"
                type="text"
                class="field__input"
                [class.field__input--error]="nameInvalid"
                formControlName="name"
                placeholder="Your name"
                autocomplete="name"
              />
              @if (nameInvalid) {
                <span class="field__error">
                  @if (pName.hasError('required')) { Name is required. }
                  @else if (pName.hasError('minlength')) { Name must be at least 2 characters. }
                </span>
              }
            </div>

            <div class="form__actions">
              <button type="submit" class="btn btn--primary" [disabled]="profileLoading()">
                @if (profileLoading()) { <app-spinner size="sm" /> }
                @else { Save changes }
              </button>
            </div>

          </form>
        </section>

        <!-- ── Section 2: Change Password ── -->
        <section class="card">
          <h2 class="card__title">Change Password</h2>

          <form [formGroup]="passwordForm" (ngSubmit)="savePassword()" novalidate class="form">

            <div class="field">
              <label class="field__label" for="currentPassword">Current password</label>
              <input
                id="currentPassword"
                type="password"
                class="field__input"
                [class.field__input--error]="currentPwInvalid"
                formControlName="currentPassword"
                placeholder="••••••••"
                autocomplete="current-password"
              />
              @if (currentPwInvalid) {
                <span class="field__error">Current password is required.</span>
              }
            </div>

            <div class="field">
              <label class="field__label" for="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                class="field__input"
                [class.field__input--error]="newPwInvalid"
                formControlName="newPassword"
                placeholder="••••••••"
                autocomplete="new-password"
              />
              @if (newPwInvalid) {
                <span class="field__error">
                  @if (newPw.hasError('required')) { New password is required. }
                  @else if (newPw.hasError('minlength')) { Must be at least 8 characters. }
                </span>
              }
            </div>

            <div class="field">
              <label class="field__label" for="confirmNewPassword">Confirm new password</label>
              <input
                id="confirmNewPassword"
                type="password"
                class="field__input"
                [class.field__input--error]="confirmPwInvalid"
                formControlName="confirmNewPassword"
                placeholder="••••••••"
                autocomplete="new-password"
              />
              @if (confirmPwInvalid) {
                <span class="field__error">
                  @if (confirmPw.hasError('required')) { Please confirm your new password. }
                  @else if (passwordForm.hasError('passwordMismatch')) { Passwords do not match. }
                </span>
              }
            </div>

            <div class="form__actions">
              <button type="submit" class="btn btn--primary" [disabled]="passwordLoading()">
                @if (passwordLoading()) { <app-spinner size="sm" /> }
                @else { Update password }
              </button>
            </div>

          </form>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 680px;
    }

    .page__heading {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    /* ── Info banner ── */
    .info-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .info-row__label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      width: 110px;
      flex-shrink: 0;
    }

    .info-row__value {
      font-size: 14px;
      color: var(--text-primary);
    }

    /* ── Sections layout ── */
    .sections {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* ── Card ── */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
    }

    .card__title {
      margin: 0 0 20px;
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    /* ── Form ── */
    .form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field__label {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
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

    .field__error {
      font-size: 12px;
      color: var(--danger);
    }

    .form__actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
    }

    /* ── Button ── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 40px;
      padding: 0 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: background 0.15s;
      min-width: 130px;
    }

    .btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .btn--primary {
      background: var(--accent-color);
      color: #ffffff;
    }

    .btn--primary:hover:not(:disabled) {
      background: #2563eb;
    }
  `],
})
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private titleService = inject(Title);

  profileLoading  = signal(false);
  passwordLoading = signal(false);

  profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  passwordForm = this.fb.nonNullable.group(
    {
      currentPassword:    ['', Validators.required],
      newPassword:        ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  get pName()      { return this.profileForm.controls.name; }
  get currentPw()  { return this.passwordForm.controls.currentPassword; }
  get newPw()      { return this.passwordForm.controls.newPassword; }
  get confirmPw()  { return this.passwordForm.controls.confirmNewPassword; }

  get nameInvalid()      { return this.pName.invalid && this.pName.touched; }
  get currentPwInvalid() { return this.currentPw.invalid && this.currentPw.touched; }
  get newPwInvalid()     { return this.newPw.invalid && this.newPw.touched; }
  get confirmPwInvalid() {
    return this.confirmPw.touched &&
      (this.confirmPw.invalid || this.passwordForm.hasError('passwordMismatch'));
  }

  get memberSince(): string {
    const date = this.authService.currentUser()?.createdAt;
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Profile | Task Manager');

    const user = this.authService.currentUser();
    if (user?.name) {
      this.profileForm.patchValue({ name: user.name });
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const { name } = this.profileForm.getRawValue();
    this.profileLoading.set(true);

    this.authService.updateProfile(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.profileLoading.set(false);
          this.toastService.show('Profile updated.', 'success');
        },
        error: (err) => {
          this.profileLoading.set(false);
          const message = err?.error?.message ?? 'Failed to update profile.';
          this.toastService.show(message, 'error');
        },
      });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.passwordLoading.set(true);

    this.authService.changePassword(currentPassword, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.passwordLoading.set(false);
          this.toastService.show('Password updated.', 'success');
          this.passwordForm.reset();
        },
        error: (err) => {
          this.passwordLoading.set(false);
          const message = err?.error?.message ?? 'Failed to change password.';
          this.toastService.show(message, 'error');
        },
      });
  }
}
