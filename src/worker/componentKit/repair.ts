import * as ts from 'typescript'

export type RepairContext = {
  errors: string[];
  evaluationReasons?: string[];
  diagnostics?: ts.Diagnostic[]; // Optional: structured diagnostics for better parsing
};

export function attemptRepair(tsxSource: string, ctx: RepairContext): string {
  try {
    const sourceFile = ts.createSourceFile('module.tsx', tsxSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

    // Determine if React import is present
    const hasReactImport = sourceFile.statements.some(
      (s): boolean => ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier) && s.moduleSpecifier.text === 'react'
    )

    const jsxError = ctx.errors.some(e => {
      const lower = e.toLowerCase()
      return lower.includes('jsx') || lower.includes("cannot find name 'div'")
    })

    // Collect missing identifier names - prefer diagnostics if available
    const missingNames = new Set<string>()
    
    if (ctx.diagnostics) {
      // Use structured diagnostics when available
      for (const diagnostic of ctx.diagnostics) {
        // Diagnostic code 2304 = Cannot find name
        if (diagnostic.code === 2304) {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
          // Extract identifier from diagnostic message
          if (diagnostic.relatedInformation) {
            for (const related of diagnostic.relatedInformation) {
              const relatedMsg = typeof related.messageText === 'string' 
                ? related.messageText 
                : ts.flattenDiagnosticMessageText(related.messageText, '\n')
              const match = relatedMsg.match(/'([A-Za-z0-9_]+)'/)
              if (match && match[1] && match[1] !== 'React') {
                missingNames.add(match[1])
              }
            }
          }
          // Also try to extract from main message
          const match = message.match(/Cannot find name '([A-Za-z0-9_]+)'/)
          if (match && match[1] && match[1] !== 'React') {
            missingNames.add(match[1])
          }
        }
      }
    } else {
      // Fallback to string parsing
      for (const err of ctx.errors) {
        const match = err.match(/Cannot find name '([A-Za-z0-9_]+)'/)
        const name = match?.[1]
        if (name && name !== 'React') missingNames.add(name)
      }
    }

    const factory = ts.factory

    const addReactImport = jsxError && !hasReactImport

    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      // Visitor uses closure over transformation context
      const visit: ts.Visitor = (node: ts.Node): ts.Node => {
        if (ts.isJsxExpression(node) && node.expression && ts.isIdentifier(node.expression) && missingNames.has(node.expression.text)) {
          return factory.updateJsxExpression(node, factory.createStringLiteral(''))
        }
        if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
          const key = node.name.text
          if ((key === 'children' || key === 'title' || key === 'text' || key === 'content') && ts.isIdentifier(node.initializer) && missingNames.has(node.initializer.text)) {
            return factory.updatePropertyAssignment(node, node.name, factory.createStringLiteral(''))
          }
        }
        return ts.visitEachChild(node, visit, context)
      }
      return (root) => ts.visitNode(root, visit) as ts.SourceFile
    }
    const transformedResult = ts.transform(sourceFile, [transformer])
    const transformed = transformedResult.transformed[0]

    // Do not inject React import via AST to keep exact quote style; we'll prepend textually
    const finalSourceFile = transformed

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
    let output = printer.printFile(finalSourceFile)
    if (addReactImport) {
      output = "import React from 'react';\n" + output
    }
    return output
  } catch {
    return tsxSource
  }
}


