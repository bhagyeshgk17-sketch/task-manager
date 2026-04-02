import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent],
  template: `
    <div class="page">
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Create an account</h1>
          <p class="card__subtitle">Start managing your tasks today</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="form">

          <div class="field">
            <label class="field__label" for="name">Name</label>
            <input
              id="name"
              type="text"
              formControlName="name"
              class="field__input"
              [class.field__input--error]="nameInvalid"
              placeholder="Jane Doe"
              autocomplete="name"
            />
            @if (nameInvalid) {
              <span class="field__error">
                @if (name.hasError('required')) { Name is required. }
                @else if (name.hasError('minlength')) { Name must be at least 2 characters. }
              </span>
            }
          </div>

          <div class="field">
            <label class="field__label" for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="field__input"
              [class.field__input--error]="emailInvalid"
              placeholder="you@example.com"
              autocomplete="email"
            />
            @if (emailInvalid) {
              <span class="field__error">
                @if (email.hasError('required')) { Email is required. }
                @else if (email.hasError('email')) { Enter a valid email address. }
              </span>
            }
          </div>

          <div class="field">
            <label class="field__label" for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="field__input"
              [class.field__input--error]="passwordInvalid"
              placeholder="••••••••"
              autocomplete="new-password"
            />
            @if (passwordInvalid) {
              <span class="field__error">
                @if (password.hasError('required')) { Password is required. }
                @else if (password.hasError('minlength')) { Password must be at least 8 characters. }
              </span>
            }
          </div>

          <div class="field">
            <label class="field__label" for="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              formControlName="confirmPassword"
              class="field__input"
              [class.field__input--error]="confirmInvalid"
              placeholder="••••••••"
              autocomplete="new-password"
            />
            @if (confirmInvalid) {
              <span class="field__error">
                @if (confirmPassword.hasError('required')) { Please confirm your password. }
                @else if (form.hasError('passwordMismatch')) { Passwords do not match. }
              </span>
            }
          </div>

          <button type="submit" class="btn-submit" [disabled]="loading()">
            @if (loading()) {
              <app-spinner size="sm" />
            } @else {
              Create account
            }
          </button>

        </form>

        <p class="card__footer">
          Already have an account?
          <a routerLink="/login" class="card__link">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary);
      padding: 24px;
      box-sizing: border-box;
    }

    .card {
      background: var(--bg-card);
      border-radius: 12px;
      box-shadow: 0 1px 3px var(--shadow), 0 4px 16px var(--shadow);
      padding: 40px;
      width: 100%;
      max-width: 420px;
      box-sizing: border-box;
    }

    .card__header {
      margin-bottom: 32px;
      text-align: center;
    }

    .card__title {
      margin: 0 0 6px;
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .card__subtitle {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 20px;
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
      padding: 10px 14px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text-primary);
      background: var(--bg-card);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
      width: 100%;
    }

    .field__input::placeholder {
      color: var(--text-muted);
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

    .btn-submit {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 42px;
      padding: 0 20px;
      margin-top: 4px;
      background: var(--accent-color);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-submit:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .card__footer {
      margin: 24px 0 0;
      text-align: center;
      font-size: 14px;
      color: var(--text-muted);
    }

    .card__link {
      color: var(--accent-color);
      font-weight: 500;
      text-decoration: none;
    }

    .card__link:hover {
      text-decoration: underline;
    }
  `],
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private titleService = inject(Title);

  loading = signal(false);

  form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  get name() { return this.form.controls.name; }
  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }
  get confirmPassword() { return this.form.controls.confirmPassword; }

  get nameInvalid() { return this.name.invalid && this.name.touched; }
  get emailInvalid() { return this.email.invalid && this.email.touched; }
  get passwordInvalid() { return this.password.invalid && this.password.touched; }
  get confirmInvalid() {
    return this.confirmPassword.touched &&
      (this.confirmPassword.invalid || this.form.hasError('passwordMismatch'));
  }

  ngOnInit(): void {
    this.titleService.setTitle('Create Account | Task Manager');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.loading.set(true);

    this.authService.register(name, email, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          const message = err?.error?.message ?? 'Registration failed. Please try again.';
          this.toastService.show(message, 'error');
        },
      });
  }
}
