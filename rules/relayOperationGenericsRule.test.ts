import { IOptions, Replacement } from "tslint"
import { createSourceFile, ScriptKind, ScriptTarget } from "typescript"
import { Rule } from "./relayOperationGenericsRule"

import * as dedent from "dedent"

const ruleOptions: IOptions = {
  ruleArguments: [],
  ruleSeverity: "error",
  ruleName: "Test Rule",
  disabledIntervals: [],
}

const applyRuleToSourceText = (text: string, options: IOptions = ruleOptions) => {
  const rule = new Rule(options)
  const sourceFile = createSourceFile("tmp.ts", text, ScriptTarget.ES2016, true, ScriptKind.TSX)
  return rule.apply(sourceFile)
}

describe("QueryRenderer", () => {
  it("requires graphql tagged template", () => {
    const result = applyRuleToSourceText(dedent`
      <QueryRenderer
      query={""} />
    `)

    expect(result.length).toBe(1)
  })

  it("requires QueryRenderers to have type parameters", () => {
    const result = applyRuleToSourceText(dedent`
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
    const fix = result[0].getFix()!
    const fixes = fix instanceof Array ? fix : [fix]
    expect(Replacement.applyAll(sourceText, fixes)).toEqual(dedent`
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
    const result = applyRuleToSourceText(dedent`
      commitMutation(this.props.relay.environment, {
        mutation: "",
      })
    `)

    expect(result.length).toBe(1)
  })

  it("fails on shorthand object literal assignment", () => {
    const result = applyRuleToSourceText(dedent`
      commitMutation(this.props.relay.environment, {
        mutation,
      })
    `)

    expect(result.length).toBe(1)
  })
})
