import { flatMap } from "lodash"
import { IOptions, Replacement, RuleFailure } from "tslint"
import { createSourceFile, ScriptKind, ScriptTarget } from "typescript"
import { Rule } from "./relayOperationGenericsRule"

import * as dedent from "dedent"

const applyRuleToSourceText = (text: string, options: IOptions = ruleOptions) => {
  const rule = new Rule(options)
  const sourceFile = createSourceFile("tmp.ts", text, ScriptTarget.ES2016, true, ScriptKind.TSX)
  return rule.apply(sourceFile)
}

const applyRuleFixes = (text: string, rule: RuleFailure | RuleFailure[]) => {
  const rules = rule instanceof Array ? rule : [rule]
  const fixes = flatMap(
    rules
      .filter(r => r.hasFix())
      .map(r => r.getFix()!)
      .map(f => (f instanceof Array ? f : [f])),
  )
  return Replacement.applyAll(text, fixes)
}

const ruleOptions: IOptions = {
  ruleArguments: [],
  ruleSeverity: "error",
  ruleName: "Test Rule",
  disabledIntervals: [],
}

describe("QueryRenderer", () => {
  it("requires graphql tagged template", () => {
    const result = applyRuleToSourceText(`
      <QueryRenderer
      query={""} />
    `)

    expect(result.length).toBe(1)
  })

  it("requires QueryRenderers to have type parameters", () => {
    const result = applyRuleToSourceText(`
      <QueryRenderer
      query={graphql\`
        query FavoriteArtistsQuery {
          me {
            ...Artists_me
          }
        }
      \`} />
    `)

    expect(result.length).toBe(1)
  })

  it("has import autofix", () => {
    const sourceText = dedent`
      export default <QueryRenderer
      query={graphql\`
        query FavoriteArtistsQuery {
          me {
            ...Artists_me
          }
        }
      \`} />
    `
    const result = applyRuleToSourceText(sourceText)

    expect(result[0].hasFix()).toBeTruthy()
    expect(applyRuleFixes(sourceText, result)).toEqual(dedent`
      import { FavoriteArtistsQuery } from "__generated__/FavoriteArtistsQuery.graphql"
      export default <QueryRenderer<FavoriteArtistsQuery>
      query={graphql\`
        query FavoriteArtistsQuery {
          me {
            ...Artists_me
          }
        }
      \`} />
    `)
  })
})

describe("commitMutation", () => {
  it("requires graphql tagged template", () => {
    const result = applyRuleToSourceText(`
      commitMutation(this.props.relay.environment, {
        mutation: "",
      })
    `)

    expect(result.length).toBe(1)
  })

  it("fails on shorthand object literal assignment", () => {
    const result = applyRuleToSourceText(`
      commitMutation(this.props.relay.environment, {
        mutation,
      })
    `)

    expect(result.length).toBe(1)
  })
})
