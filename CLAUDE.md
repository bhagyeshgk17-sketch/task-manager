# Task Manager App

## Stack
- Backend: NestJS, TypeORM, PostgreSQL (Neon cloud), JWT + Refresh Tokens
- Frontend: Angular 17+ standalone components, Signals, Reactive Forms, HttpClient

## Backend Conventions
- Every feature = its own folder with module/controller/service/entity/dto files
- DTOs use class-validator decorators
- All responses follow shape: { data, message, statusCode }
- Never return passwords in any response
- All routes except /auth/register and /auth/login require JwtAuthGuard
- Pagination default: page=1, limit=10

## Frontend Conventions
- Standalone components only, no NgModules
- Services use inject() not constructor injection
- Signals for all state management
- Environment variables via environment.ts
- Never hardcode API URLs

## Ports
- Backend: 3000
- Frontend: 4200

## Database
- PostgreSQL on Neon (cloud)
- TypeORM with synchronize: true during development