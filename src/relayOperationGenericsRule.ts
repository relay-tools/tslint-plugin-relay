import * as GraphQL from "graphql"
import * as Lint from "tslint"
import * as ts from "typescript"

class Rule extends Lint.Rules.AbstractRule {
  /**
   * @param {ts.SourceFile} sourceFile
   */
  apply(sourceFile) {
    return this.applyWithWalker(new RelayOperationGenericsWalker(sourceFile, this.getOptions()))
  }
}

class RelayOperationGenericsWalker extends Lint.RuleWalker {
  _imports: ts.ImportDeclaration[] = []
  getImports() {
    return this._imports
  }

  visitImportDeclaration(node: ts.ImportDeclaration) {
    this._imports.push(node)
    super.visitImportDeclaration(node)
  }

  visitJsxSelfClosingElement(node: ts.JsxSelfClosingElement) {
    if (node.tagName.getText() === "QueryRenderer") {
      for (const property of node.attributes.properties) {
        if (
          property.kind === ts.SyntaxKind.JsxAttribute &&
          property.name.getText() === "query" &&
          property.initializer
        ) {
          const initializer = property.initializer
          if (initializer.kind === ts.SyntaxKind.JsxExpression) {
            this.visitOperationConfiguration(node, initializer.expression, node.tagName)
          } else {
            this.addFailureAtNode(initializer, "expected a graphql`…` tagged-template expression")
          }
          break
        }
      }
    }

    super.visitJsxSelfClosingElement(node)
  }

  visitCallExpression(node: ts.CallExpression) {
    const functionName = node.expression as ts.Identifier
    if (functionName.text === "commitMutation") {
      const config = node.arguments[1] as undefined | ts.ObjectLiteralExpression
      if (config && config.kind === ts.SyntaxKind.ObjectLiteralExpression) {
        // any = this.visitOperationConfiguration(node, config, functionName)
        for (const property of config.properties) {
          if (property.name && property.name.getText() === "mutation") {
            if (property.kind === ts.SyntaxKind.PropertyAssignment) {
              this.visitOperationConfiguration(node, property.initializer, functionName)
            } else {
              // TODO: Need to expand parsing if we want to support e.g.
              //       short-hand property assignment.
              this.addFailureAtNode(property, "use traditional assignment for mutation query")
            }
            break
          }
        }
      }
    }

    super.visitCallExpression(node)
  }

  visitOperationConfiguration(
    node: ts.CallExpression | ts.JsxSelfClosingElement,
    expression: ts.Expression,
    functionOrTagName: any
  ) {
    const taggedTemplate = expression as ts.TaggedTemplateExpression
    if (
      taggedTemplate.kind === ts.SyntaxKind.TaggedTemplateExpression &&
      taggedTemplate.tag.getText() === "graphql"
    ) {
      const typeArgument = node.typeArguments && (node.typeArguments[0] as ts.TypeReferenceNode)
      if (!typeArgument) {
        const operationName = getOperationName(taggedTemplate)
        const fixes = this.createFixes(functionOrTagName.getEnd(), 0, `<${operationName}>`, operationName)
        this.addFailureAtNode(functionOrTagName, "missing operation type parameter", fixes)
      } else {
        const operationName = getOperationName(taggedTemplate)
        if (
          operationName &&
          (typeArgument.kind !== ts.SyntaxKind.TypeReference || typeArgument.typeName.getText() !== operationName)
        ) {
          const fixes = this.createFixes(
            typeArgument.getStart(),
            typeArgument.getWidth(),
            operationName,
            operationName
          )
          this.addFailureAtNode(
            typeArgument,
            `expected operation type parameter to be \`${operationName}\``,
            fixes
          )
        }
      }
    } else {
      this.addFailureAtNode(taggedTemplate, "expected a graphql`…` tagged-template")
    }
  }

  /**
   * @param {number} start
   * @param {number} width
   * @param {string} replacement
   * @param {string} operationName
   * @returns {Lint.Replacement[]}
   */
  createFixes(start: number, width: number, replacement: string, operationName: string): Lint.Replacement[] {
    const fixes = [new Lint.Replacement(start, width, replacement)]
    if (!this.hasImportForOperation(operationName)) {
      fixes.push(this.importDeclarationFixForOperation(operationName))
    }
    return fixes
  }

  /**
   * @param {string} operationName
   */
  importPathForOperation(operationName) {
    const options = this.getOptions()[0] || {
      artifactDirectory: "__generated__",
      makeRelative: false,
    }
    if (options.makeRelative) {
      throw new Error("[relayOperationGenericsRule] Making import declarations relative is not implemented yet.")
    }
    return `${options.artifactDirectory}/${operationName}.graphql`
  }

  importDeclarationFixForOperation(operationName) {
    const path = this.importPathForOperation(operationName)
    const importDeclaration = `import { ${operationName} } from "${path}"\n`

    const imports = this.getImports()
    const lastImport = imports[imports.length - 1]

    let start = 0
    if (lastImport) {
      start = lastImport.getEnd() + 1
    }

    return new Lint.Replacement(start, 0, importDeclaration)
  }

  /**
   * @param {string} operationName
   */
  hasImportForOperation(operationName) {
    // TODO: So many hoops to jump through without TS :/
    /** @type {any} */
    let asdf

    const importPath = this.importPathForOperation(operationName)

    return this.getImports().some(node => {
      asdf = node.moduleSpecifier
      /** @type {ts.StringLiteral} */
      const path = asdf
      if (path.text === importPath && node.importClause) {
        asdf = node.importClause.namedBindings
        /** @type {ts.NamedImports} */
        const namedBindings = asdf
        if (namedBindings) {
          return namedBindings.elements.some(element => element.name.getText() === operationName)
        }
      }
      return false
    })
  }
}

function getOperationName(taggedTemplate: ts.TaggedTemplateExpression): string | null {
  const template = taggedTemplate.template.getFullText()
  // Strip backticks
  const source = template.substring(1, template.length - 1)

  const ast = GraphQL.parse(source)
  let queryName = null
  GraphQL.visit(ast, {
    OperationDefinition(node) {
      queryName = node.name.value
      return GraphQL.BREAK
    },
  })

  return queryName
}

module.exports = { Rule }
