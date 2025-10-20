import crypto from 'node:crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogContext = {
  lessonId?: string;
  componentId?: string;
  attemptNumber?: number;
  stage?: string;
  operation?: string;
  duration?: number;
  errorType?: string;
  errorCode?: string;
  metadata?: Record<string, any>;
};

export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  correlationId: string;
  sessionId: string;
};

export type PerformanceMetric = {
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
};

export type ErrorPattern = {
  errorType: string;
  errorCode: string;
  frequency: number;
  lastOccurrence: string;
  context: Record<string, any>;
};

class WorkerLogger {
  private sessionId: string;
  private correlationId: string;
  private performanceMetrics: PerformanceMetric[] = [];
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private logLevel: LogLevel;

  constructor() {
    this.sessionId = crypto.randomUUID();
    this.correlationId = crypto.randomUUID();
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private createLogEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
      },
      correlationId: this.correlationId,
      sessionId: this.sessionId,
    };
  }

  private formatLogEntry(entry: LogEntry): string {
    const contextStr = Object.keys(entry.context).length > 0 
      ? ` ${JSON.stringify(entry.context)}` 
      : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.correlationId}] ${entry.message}${contextStr}`;
  }

  private outputLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formatted = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  private trackErrorPattern(errorType: string, errorCode: string, context: Record<string, any>): void {
    const key = `${errorType}:${errorCode}`;
    const existing = this.errorPatterns.get(key);
    
    if (existing) {
      existing.frequency++;
      existing.lastOccurrence = new Date().toISOString();
      existing.context = { ...existing.context, ...context };
    } else {
      this.errorPatterns.set(key, {
        errorType,
        errorCode,
        frequency: 1,
        lastOccurrence: new Date().toISOString(),
        context,
      });
    }
  }

  debug(message: string, context: LogContext = {}): void {
    this.outputLog(this.createLogEntry('debug', message, context));
  }

  info(message: string, context: LogContext = {}): void {
    this.outputLog(this.createLogEntry('info', message, context));
  }

  warn(message: string, context: LogContext = {}): void {
    this.outputLog(this.createLogEntry('warn', message, context));
  }

  error(message: string, context: LogContext = {}): void {
    if (context.errorType && context.errorCode) {
      this.trackErrorPattern(context.errorType, context.errorCode, context.metadata || {});
    }
    this.outputLog(this.createLogEntry('error', message, context));
  }

  fatal(message: string, context: LogContext = {}): void {
    this.outputLog(this.createLogEntry('fatal', message, context));
  }

  // Performance tracking
  startTimer(operation: string): (success?: boolean, metadata?: Record<string, any>) => void {
    const startTime = Date.now();
    return (success: boolean = true, metadata: Record<string, any> = {}) => {
      const duration = Date.now() - startTime;
      this.performanceMetrics.push({
        operation,
        duration,
        success,
        metadata,
      });
      this.info(`Operation completed: ${operation}`, {
        operation,
        duration,
        metadata: {
          ...metadata,
          success,
        },
      });
    };
  }

  // Structured logging for specific operations
  logLLMCall(model: string, promptLength: number, responseLength: number, tokens: number, duration: number, success: boolean): void {
    this.info('LLM call completed', {
      operation: 'llm_call',
      stage: 'generation',
      duration,
      metadata: {
        model,
        promptLength,
        responseLength,
        tokens,
        tokensPerSecond: Math.round(tokens / (duration / 1000)),
        success,
      },
    });
  }

  logCompilation(tsxLength: number, errors: string[], duration: number, success: boolean, repairAttempts: number = 0): void {
    this.info('Compilation completed', {
      operation: 'compilation',
      stage: 'compilation',
      duration,
      metadata: {
        tsxLength,
        errorCount: errors.length,
        repairAttempts,
        errors: errors.slice(0, 3), // Log first 3 errors for debugging
        success,
      },
    });
  }

  logDatabaseOperation(table: string, operation: string, duration: number, success: boolean, error?: string): void {
    this.info('Database operation completed', {
      operation: 'database',
      stage: 'persistence',
      duration,
      metadata: {
        table,
        dbOperation: operation,
        error,
        success,
      },
    });
  }

  logPipelineStage(stage: string, lessonId: string, success: boolean, duration: number, metadata: Record<string, any> = {}): void {
    this.info(`Pipeline stage completed: ${stage}`, {
      lessonId,
      stage,
      operation: 'pipeline_stage',
      duration,
      metadata: {
        ...metadata,
        success,
      },
    });
  }

  // Error analysis and reporting
  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values()).sort((a, b) => b.frequency - a.frequency);
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  getPerformanceSummary(): Record<string, any> {
    const metrics = this.performanceMetrics;
    const byOperation = metrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = { total: 0, count: 0, successes: 0, failures: 0, durations: [] };
      }
      acc[metric.operation].total += metric.duration;
      acc[metric.operation].count++;
      acc[metric.operation].durations.push(metric.duration);
      if (metric.success) acc[metric.operation].successes++;
      else acc[metric.operation].failures++;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and percentiles
    Object.keys(byOperation).forEach(operation => {
      const op = byOperation[operation];
      op.averageDuration = Math.round(op.total / op.count);
      op.successRate = Math.round((op.successes / op.count) * 100);
      op.durations.sort((a: number, b: number) => a - b);
      op.p50 = op.durations[Math.floor(op.durations.length * 0.5)];
      op.p95 = op.durations[Math.floor(op.durations.length * 0.95)];
      op.p99 = op.durations[Math.floor(op.durations.length * 0.99)];
    });

    return byOperation;
  }

  // Generate comprehensive report
  generateReport(): Record<string, any> {
    return {
      sessionId: this.sessionId,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      performance: this.getPerformanceSummary(),
      errorPatterns: this.getErrorPatterns(),
      totalOperations: this.performanceMetrics.length,
      totalErrors: this.errorPatterns.size,
    };
  }

  // Reset for new session
  reset(): void {
    this.sessionId = crypto.randomUUID();
    this.correlationId = crypto.randomUUID();
    this.performanceMetrics = [];
    this.errorPatterns.clear();
  }
}

// Global logger instance
export const logger = new WorkerLogger();

// Utility functions for common logging patterns
export function logJobStart(lessonId: string, operation: string): () => void {
  logger.info(`Starting job: ${operation}`, { lessonId, operation, stage: 'start' });
  return logger.startTimer(`job:${operation}`);
}

export function logJobEnd(lessonId: string, operation: string, success: boolean, metadata: Record<string, any> = {}): void {
  logger.info(`Job completed: ${operation}`, { 
    lessonId, 
    operation, 
    stage: 'end', 
    metadata: {
      ...metadata,
      success,
    }
  });
}

export function logError(lessonId: string, error: Error, context: LogContext = {}): void {
  logger.error(`Error in ${context.operation || 'unknown operation'}: ${error.message}`, {
    lessonId,
    errorType: error.constructor.name,
    errorCode: error.name,
    metadata: {
      stack: error.stack,
      ...context.metadata,
    },
    ...context,
  });
}

export function logRetry(lessonId: string, operation: string, attempt: number, maxAttempts: number, error?: Error): void {
  logger.warn(`Retrying operation: ${operation}`, {
    lessonId,
    operation,
    stage: 'retry',
    attemptNumber: attempt,
    metadata: {
      error: error?.message,
      errorType: error?.constructor.name,
      maxAttempts,
    },
  });
}
