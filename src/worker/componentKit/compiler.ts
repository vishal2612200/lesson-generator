import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import ts from "typescript";
import { logger } from "../common/logger";

export type CompileResult = {
  success: boolean;
  errors: string[];
  outDir: string | null;
  emittedFiles: string[];
};

export type CompileOptions = {
  tsxSource: string;
  workingDir?: string; // directory to create sandbox in
  entryFileName?: string; // defaults to Component.tsx
};

/**
 * Compiles a TSX string in an isolated sandbox using tsconfig.generated.json.
 * Emits diagnostics and returns emitted file paths.
 */
export function compileComponentTsx(options: CompileOptions): CompileResult {
  const compileTimer = logger.startTimer('typescript_compilation');
  
  try {
    logger.info('Starting TypeScript compilation', {
      operation: 'compilation_start',
      stage: 'compilation',
      metadata: {
        tsxLength: options.tsxSource.length,
        workingDir: options.workingDir,
        entryFileName: options.entryFileName,
      },
    });

    // Use a unique per-call sandbox to avoid stale artifacts
    const sandboxRoot = options.workingDir ?? path.join(process.cwd(), "src/worker/componentKit/sandbox");
    const unique = crypto.randomUUID().replace(/-/g, "");
    const workingDir = path.join(sandboxRoot, unique);
    const entryFileName = options.entryFileName ?? "Component.tsx";
    const entryFilePath = path.join(workingDir, entryFileName);
    const outDir = path.join(workingDir, "dist");

    logger.debug('Setting up compilation sandbox', {
      operation: 'sandbox_setup',
      stage: 'compilation',
      metadata: {
        sandboxRoot,
        unique,
        workingDir,
        entryFilePath,
        outDir,
      },
    });

    // Ensure sandbox directories
    fs.mkdirSync(workingDir, { recursive: true });
    // Clean any prior dist if exists (shouldn't, but safe)
    try { fs.rmSync(outDir, { recursive: true, force: true }); } catch {}
    fs.mkdirSync(outDir, { recursive: true });

    // Write the entry TSX
    fs.writeFileSync(entryFilePath, options.tsxSource, "utf8");
    
    logger.debug('TSX source written to sandbox', {
      operation: 'tsx_write',
      stage: 'compilation',
      metadata: {
        entryFilePath,
        fileSize: options.tsxSource.length,
      },
    });

    // Provide a lightweight React/JSX shim to satisfy type resolution in isolation
    const shimPath = path.join(workingDir, "react-shim.d.ts");
    if (!fs.existsSync(shimPath)) {
      fs.writeFileSync(
        shimPath,
        [
          "declare module 'react' {",
          "  export type ReactNode = any;",
          "  export interface FC<P = {}> { (props: P): any }",
          "  const React: any;",
          "  export default React;",
          "}",
          "declare namespace JSX {",
          "  type Element = any;",
          "  interface IntrinsicElements { [elem: string]: any }",
          "}",
          "declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; export const Fragment: any }",
          ""
        ].join("\n"),
        "utf8"
      );
      
      logger.debug('React shim created', {
        operation: 'shim_creation',
        stage: 'compilation',
        metadata: { shimPath },
      });
    }

    // Load compiler options from tsconfig.generated.json
    const configPath = ts.findConfigFile(
      path.join(process.cwd(), "src/worker/componentKit"),
      ts.sys.fileExists,
      "tsconfig.generated.json"
    );
    
    if (!configPath) {
      logger.error('TypeScript config not found', {
        operation: 'config_not_found',
        stage: 'compilation',
        errorType: 'ConfigurationError',
        errorCode: 'TSCONFIG_NOT_FOUND',
        metadata: {
          searchPath: path.join(process.cwd(), "src/worker/componentKit"),
          configName: "tsconfig.generated.json",
        },
      });
      
      compileTimer(false, { error: 'tsconfig.generated.json not found' });
      return { success: false, errors: ["tsconfig.generated.json not found"], outDir: null, emittedFiles: [] };
    }

    logger.debug('TypeScript config loaded', {
      operation: 'config_loaded',
      stage: 'compilation',
      metadata: { configPath },
    });

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));

    // Override to emit to our outDir and compile only our entry file
    const compilerOptions = { ...parsed.options, outDir, noEmitOnError: false };
    const host = ts.createCompilerHost(compilerOptions);

    logger.debug('Creating TypeScript program', {
      operation: 'program_creation',
      stage: 'compilation',
      metadata: {
        entryFiles: [entryFilePath, shimPath],
        compilerOptions: {
          outDir,
          noEmitOnError: false,
          target: compilerOptions.target,
          module: compilerOptions.module,
        },
      },
    });

    const program = ts.createProgram([entryFilePath, shimPath], compilerOptions, host);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    const errors = diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n"));

    // Check for semantic errors using diagnostic codes
    const semanticErrorCodes = [
      2304, // Cannot find name
      2307, // Cannot find module
      2322, // Type is not assignable
      2551, // Property does not exist
    ];
    const hasSemantic = diagnostics.some(d => semanticErrorCodes.includes(d.code));
    const semanticErrors = diagnostics
      .filter(d => semanticErrorCodes.includes(d.code))
      .map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n"));

    logger.debug('TypeScript diagnostics collected', {
      operation: 'diagnostics_collection',
      stage: 'compilation',
      metadata: {
        errorCount: errors.length,
        errors: errors.slice(0, 3), // Log first 3 errors for debugging
      },
    });

    if (errors.length > 0) {
      logger.info('TypeScript errors detected, attempting emit', {
        operation: 'emit_with_errors',
        stage: 'compilation',
        metadata: {
          errorCount: errors.length,
          hasSemantic,
          semanticErrors,
        },
      });

      // Try to emit anyway; if emitted and no semantic errors, treat as success
      const emitAttempt = program.emit();
      const emittedOk = emitAttempt.emitSkipped === false;
      
      if (emittedOk && !hasSemantic) {
        const emittedFiles: string[] = [];
        const walk = (dir: string) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else emittedFiles.push(full);
          }
        };
        walk(outDir);
        // If no files were emitted due to config warnings, produce a transpiled output as a fallback artifact
        if (emittedFiles.length === 0) {
          try {
            const transpiled = ts.transpileModule(options.tsxSource, {
              compilerOptions: {
                jsx: ts.JsxEmit.ReactJSX,
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.CommonJS,
              }
            });
            if (transpiled.outputText && transpiled.outputText.length > 0) {
              const baseName = options.entryFileName ?? "Component.tsx";
              const parsedPath = path.parse(baseName);
              const outFile = path.join(outDir, path.format({ ...parsedPath, base: undefined, ext: ".js" }));
              fs.writeFileSync(outFile, transpiled.outputText, "utf8");
              emittedFiles.push(outFile);
            }
          } catch {}
        }
        
        logger.info('Compilation successful despite non-semantic errors', {
          operation: 'compilation_success_with_warnings',
          stage: 'compilation',
          metadata: {
            errorCount: errors.length,
            emittedFiles: emittedFiles.length,
            warnings: errors,
          },
        });
        
        compileTimer(true, { 
          errorCount: errors.length,
          emittedFiles: emittedFiles.length,
          hasSemantic: false,
        });
        return { success: true, errors: [], outDir, emittedFiles };
      }
      
      // Allow transpile fallback only for JSX/runtime typing issues, not for semantic errors
      // Check diagnostic codes for JSX/runtime related errors
      const jsxRuntimeErrorCodes = [
        2307, // Cannot find module (react, react/jsx-runtime)
        2503, // Cannot find namespace
      ];
      const jsxElementNames = new Set(['div', 'span', 'p', 'h1', 'h2', 'h3', 'button']);
      
      const allowFallback = diagnostics.every(d => {
        // Check for module errors (react, react/jsx-runtime)
        if (d.code === 2307) {
          const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n").toLowerCase();
          return msg.includes("react");
        }
        // Check for JSX namespace errors
        if (d.code === 2503) {
          const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n").toLowerCase();
          return msg.includes("jsx");
        }
        // Check for JSX element name errors (div, span, etc.)
        if (d.code === 2304) {
          const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n").toLowerCase();
          const elementMatch = msg.match(/cannot find name ['"]([a-z0-9]+)['"]/);
          if (elementMatch && jsxElementNames.has(elementMatch[1])) {
            return true;
          }
          // Also check for "JSX" in the message
          return msg.includes("jsx");
        }
        // All other errors should not allow fallback
        return false;
      });
      
      if (allowFallback) {
        logger.info('Attempting transpile fallback for JSX/runtime issues', {
          operation: 'transpile_fallback',
          stage: 'compilation',
          metadata: {
            errorCount: errors.length,
            errors: errors.slice(0, 3),
          },
        });
        
        try {
          const transpiled = ts.transpileModule(options.tsxSource, {
            compilerOptions: {
              jsx: ts.JsxEmit.ReactJSX,
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.CommonJS,
            }
          });
          
          if (transpiled.outputText && transpiled.outputText.length > 0) {
            const baseName = options.entryFileName ?? "Component.tsx";
            const parsedPath = path.parse(baseName);
            const outFile = path.join(outDir, path.format({ ...parsedPath, base: undefined, ext: ".js" }));
            fs.writeFileSync(outFile, transpiled.outputText, "utf8");
            
            logger.info('Transpile fallback successful', {
              operation: 'transpile_success',
              stage: 'compilation',
              metadata: {
                outputLength: transpiled.outputText.length,
                outFile,
              },
            });
            
            compileTimer(true, { 
              method: 'transpile',
              outputLength: transpiled.outputText.length,
            });
            return { success: true, errors: [], outDir, emittedFiles: [outFile] };
          }
        } catch (transpileError) {
          logger.warn('Transpile fallback failed', {
            operation: 'transpile_failed',
            stage: 'compilation',
            metadata: {
              error: transpileError instanceof Error ? transpileError.message : String(transpileError),
            },
          });
        }
      }
      
      logger.error('Compilation failed with semantic errors', {
        operation: 'compilation_failed',
        stage: 'compilation',
        errorType: 'CompilationError',
        errorCode: 'SEMANTIC_ERRORS',
        metadata: {
          errorCount: errors.length,
          hasSemantic,
          allowFallback,
          errors: errors.slice(0, 5), // Log first 5 errors
        },
      });
      
      compileTimer(false, { 
        errorCount: errors.length,
        hasSemantic,
        allowFallback: false,
      });
      return { success: false, errors, outDir: null, emittedFiles: [] };
    }

    logger.debug('No pre-emit errors, proceeding with emit', {
      operation: 'emit_clean',
      stage: 'compilation',
    });

    const emitResult = program.emit();
    const emitErrors = emitResult.diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    const allErrors = [...emitErrors];

    if (allErrors.length > 0) {
      logger.error('Emit failed with errors', {
        operation: 'emit_failed',
        stage: 'compilation',
        errorType: 'EmitError',
        errorCode: 'EMIT_ERRORS',
        metadata: {
          errorCount: allErrors.length,
          errors: allErrors.slice(0, 3),
        },
      });
      
      compileTimer(false, { 
        errorCount: allErrors.length,
        stage: 'emit',
      });
      return { success: false, errors: allErrors, outDir: null, emittedFiles: [] };
    }

    // Collect emitted files by reading the outDir tree
    const emittedFiles: string[] = [];
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else emittedFiles.push(full);
      }
    };
    walk(outDir);

    logger.info('Compilation completed successfully', {
      operation: 'compilation_success',
      stage: 'compilation',
      metadata: {
        emittedFiles: emittedFiles.length,
        outDir,
        files: emittedFiles.map(f => path.basename(f)),
      },
    });

    compileTimer(true, { 
      emittedFiles: emittedFiles.length,
      outDir,
    });
    return { success: true, errors: [], outDir, emittedFiles };

  } catch (error) {
    logger.error('Compilation failed with exception', {
      operation: 'compilation_exception',
      stage: 'compilation',
      errorType: 'CompilationException',
      errorCode: 'COMPILATION_EXCEPTION',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
    
    compileTimer(false, { 
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, errors: [error instanceof Error ? error.message : String(error)], outDir: null, emittedFiles: [] };
  }
}


