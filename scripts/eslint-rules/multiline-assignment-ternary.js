/**
 * Require ternaries in multiline variable declarations to split at `?` and `:`.
 *
 * This catches formatting like:
 *   const value =
 *     condition ? consequent : alternate
 *
 * Prefer:
 *   const value = condition
 *     ? consequent
 *     : alternate
 */
'use strict'

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description: 'require multiline variable-declaration ternaries to split branches onto separate lines'
    },
    schema: [],
    messages: {
      splitTernary: 'Split multiline variable-declaration ternaries at `?` and `:`.'
    }
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (node.init?.type !== 'ConditionalExpression') return
        if (node.loc.start.line === node.loc.end.line) return
        if (node.init.loc.start.line !== node.init.loc.end.line) return
        context.report({ node: node.init, messageId: 'splitTernary' })
      }
    }
  }
}
