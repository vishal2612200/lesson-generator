import { parse } from '@babel/parser'
import traverse, { NodePath } from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'

export function sanitizeComponentAst(source: string): string {
	// Strip markdown code fences first (cheap pre-pass)
	let src = source.replace(/```[\s\S]*?```/g, (m) => {
		const inner = m.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '')
		return inner
	})
	// Remove ambient declarations that can leak into app TS
	src = src.replace(/declare\s+module\s+[^\n]+\n?/g, '')

	const ast = parse(src, {
		sourceType: 'module',
		plugins: ['typescript', 'jsx'],
	})

	traverse(ast, {
		ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
			const from = path.node.source.value
			if (from !== 'react') {
				path.remove()
			}
		},
		CallExpression(path: NodePath<t.CallExpression>) {
			// Remove require("...")
			if (t.isIdentifier(path.node.callee, { name: 'require' })) {
				path.remove()
			}
		},
		Import(path: NodePath<t.Import>) {
			// dynamic import()
			const callExpr = path.parentPath
			if (callExpr?.isCallExpression()) {
				callExpr.remove()
			}
		},
		JSXAttribute(path: NodePath<t.JSXAttribute>) {
			// Normalize className templates
			if (t.isJSXIdentifier(path.node.name, { name: 'className' })) {
				const val = path.node.value
				if (t.isStringLiteral(val)) return
				if (t.isJSXExpressionContainer(val)) {
					const expr = val.expression
					// className={`foo bar`} -> "foo bar"
					if (
						t.isTemplateLiteral(expr) &&
						expr.expressions.length === 0
					) {
						path.node.value = t.stringLiteral(expr.quasis.map(q => q.value.cooked || '').join(''))
						return
					}
					// Any other expression -> fallback static class
					path.node.value = t.stringLiteral('lesson-section')
				}
			}
		},
	})

	const { code } = generate(ast, { retainLines: false })
	return code
}

export function validateComponentAst(source: string): { isValid: boolean; errors: string[] } {
	const errors: string[] = []
	try {
		const ast = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
		traverse(ast, {
			ImportDeclaration(path) {
				const from = path.node.source.value
				if (from !== 'react') {
					errors.push(`External import: ${from}`)
				}
			},
			CallExpression(path) {
				if (t.isIdentifier(path.node.callee, { name: 'require' })) {
					errors.push('Require statement detected')
				}
			},
			Import(path) {
				const callExpr = path.parentPath
				if (callExpr?.isCallExpression()) {
					errors.push('Dynamic import() detected')
				}
			},
		})
	} catch (e) {
		errors.push('AST parse error')
	}
	return { isValid: errors.length === 0, errors }
}

export function extractTypeScriptFromResponse(response: string): string {
	// Prefer fenced code blocks without regex by scanning markers
	const fence = '```'
	let start = -1
	let best: { s: number; e: number } | null = null
	for (let i = 0; i < response.length - 2; i++) {
		if (response.slice(i, i + 3) === fence) {
			if (start === -1) {
				start = i + 3
			} else {
				const end = i
				if (!best || end - start > best.e - best.s) best = { s: start, e: end }
				start = -1
			}
		}
	}
	if (best) {
		let block = response.slice(best.s, best.e)
		// strip optional language header on first line (typescript|tsx|ts)
		block = block.replace(/^(typescript|tsx|ts)\n/, '')
		return block.trim()
	}
	return response.trim()
}
