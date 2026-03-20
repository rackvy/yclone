# YClone Project Rules

## Project Overview
- **Name**: YClone - SaaS CRM for beauty salons/barbershops
- **Stack**: NestJS (backend) + React + TypeScript + Tailwind (frontend)
- **Database**: PostgreSQL with Prisma ORM
- **Package Manager**: pnpm (monorepo)

## Architecture
- `/apps/api` - NestJS backend
- `/apps/frontend` - React SPA
- Prisma schema at `/apps/api/prisma/schema.prisma`

## Code Style
- **No dark mode** - only light theme
- Use Russian for UI labels, English for code
- Material Symbols icons (Google)
- Tailwind for styling
- No alerts - use UI notifications/toasts

## Database Rules
- Use local enums, NOT Prisma-generated enums (for class-validator compatibility)
- Always add `@Index` for foreign keys and frequently queried fields
- Use `Int` for money (kopeks/rubles), never Float
- Migrations: always check existing data before adding required fields

## API Patterns
- Controllers use `@Controller('api/...')` prefix
- DTOs in separate files with class-validator decorators
- Services handle business logic, controllers - HTTP layer
- Use transactions for multi-table operations

## Frontend Patterns
- API clients in `/src/api/*.ts`
- Pages in `/src/pages/*.tsx`
- Reusable components in `/src/components/*.tsx`
- Format money with `formatRubles()` utility
- Use `Link` component (not `<a>`) for navigation

## Git Workflow
- Don't commit unless explicitly asked
- Never force push to main

## Common Issues
- Prisma nested create requires explicit foreign key assignment
- Frontend-backend API field names must match exactly
- Check for unused imports (TypeScript strict mode)
