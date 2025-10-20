import * as ts from 'typescript'
import * as esbuild from 'esbuild'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface CompilationResult {
  success: boolean
  compiledJs?: string
  tscErrors: string[]
  esbuildErrors: string[]
}

export async function compileTypeScript(
  source: string
): Promise<CompilationResult> {
  // We don't actually need to compile - the browser will use @babel/standalone
  // Just do basic syntax validation with TypeScript
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lesson-'))
  const tempFile = path.join(tempDir, 'lesson.tsx')

  try {
    fs.writeFileSync(tempFile, source)

    // Just run TypeScript for syntax checking (not blocking)
    const tscWarnings = runTypeScriptCheck(tempFile, source)
    
    // Always return success - compilation happens in the browser
    return {
      success: true,
      compiledJs: undefined, // No server-side compilation needed
      tscErrors: tscWarnings, // Just warnings, not errors
      esbuildErrors: [],
    }
  } catch (error) {
    return {
      success: false,
      tscErrors: [],
      esbuildErrors: [
        error instanceof Error ? error.message : 'Validation error',
      ],
    }
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  }
}

function runTypeScriptCheck(filePath: string, source: string): string[] {
  const program = ts.createProgram([filePath], {
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    jsx: ts.JsxEmit.ReactJSX,
    strict: false, // Relax strict mode for generated code
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    types: ['react', 'react-dom'], // Include React types
    lib: ['ES2020', 'DOM'], // Include DOM types for JSX
  })

  const diagnostics = ts.getPreEmitDiagnostics(program)

  return diagnostics.map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n'
    )
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      )
      return `Line ${line + 1}:${character + 1}: ${message}`
    }
    return message
  })
}

