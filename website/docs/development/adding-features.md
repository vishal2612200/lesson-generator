# Adding Features

Guidelines for contributing new features to AI Lesson Generator.

## Getting Started

1. **Fork the repository**
2. **Create a branch**: `git checkout -b feature/your-feature`
3. **Make changes**
4. **Test thoroughly**
5. **Submit pull request**

## Code Style

### TypeScript

- Use TypeScript for all new code
- Prefer interfaces over types
- Use strict type checking
- Avoid `any` types

### React

- Use functional components
- Use hooks for state management
- Follow React best practices

### Naming Conventions

- **Files**: `kebab-case.ts` or `PascalCase.tsx` for components
- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`

## Development Workflow

1. **Write tests** for new features
2. **Run tests**: `npm test`
3. **Type check**: `npm run tsc`
4. **Lint**: `npm run lint`
5. **Test manually** in development

## Contribution Areas

### Frontend

- UI components in `src/domains/lesson/ui/`
- Page components in `src/app/`
- API routes in `src/app/api/`

### Backend

- Worker logic in `src/worker/`
- Generation logic in `src/worker/generation/`
- Component generation in `src/worker/componentKit/`

### Database

- Migrations in `supabase/migrations/`
- Follow naming convention: `XXX_description.sql`

## Testing

- Write unit tests for new functions
- Write integration tests for API endpoints
- Test error cases
- Test edge cases

## Documentation

- Update relevant documentation
- Add code comments for complex logic
- Update API docs if changing endpoints
- Update examples if changing behavior

## Next Steps

- **[Testing](/docs/development/testing)** - Test strategy
- **[Debugging](/docs/development/debugging)** - Debugging tips

