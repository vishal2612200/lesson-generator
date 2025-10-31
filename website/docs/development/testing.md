# Testing

Test strategy and running tests.

## Test Structure

```
tests/
├── componentKit/        # Component generation tests
├── lesson/              # Lesson tests
├── integration.test.ts  # Integration tests
└── utils/               # Test utilities
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode

```bash
npm test -- --watch
```

### Specific Test File

```bash
npm test componentKit/compiler.test.ts
```

### Coverage Report

```bash
npm test -- --coverage
```

## Test Types

### Unit Tests

Test individual functions and components:

```typescript
describe('compileTypeScript', () => {
  it('should compile valid TSX', () => {
    const result = compileTypeScript('const x = 1')
    expect(result.success).toBe(true)
  })
})
```

### Integration Tests

Test full workflows:

```typescript
describe('CreateLessonAndGenerate', () => {
  it('should create and generate lesson', async () => {
    const lesson = await createLesson('Test outline')
    expect(lesson.status).toBe('generated')
  })
})
```

### Component Tests

Test React components:

```typescript
describe('BlockRenderer', () => {
  it('should render text block', () => {
    render(<BlockRenderer block={{ type: 'text', content: 'Hello' }} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## Mock Data

### LLM Mocking

```typescript
// Use MOCK mode
process.env.LLM_API_KEY_OR_MOCK = 'MOCK'
```

### Database Mocking

Use test utilities:

```typescript
import { mockRepository } from './utils/repoMock'
```

## Test Best Practices

1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **Keep tests isolated**
4. **Mock external dependencies**
5. **Test error cases**
6. **Test edge cases**

## Next Steps

- **[Debugging](/docs/development/debugging)** - Debugging tips
- **[Code Structure](/docs/development/code-structure)** - Project organization

