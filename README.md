tslint-plugin-relay

This is a work-in-progress to migrate Relay linting rules from [Artsy](https://github.com/artsy/reaction/blob/7e0b8bc25b18e7e2335d1f0165cce88336da5d1c/tslint/relayOperationGenericsRule.js) and from [eslint-plugin-relay](https://github.com/relayjs/eslint-plugin-relay) to [TSLint](https://palantir.github.io/tslint/).

## How do I use this?

Add `tslint-plugin-relay` as a `devDependency` using `yarn add -D tslint-plugin-relay`. Then open your TSLint config file and `"tslint-plugin-relay"` to your `extends` list.

```diff
{
  "extends": [
-   "tslint:recommended"
+   "tslint:recommended",
+   "tslint-plugin-relay"
  ],
```

Now you can add rules from this repo to the `rules` dictionary. See [this blog post](https://palantir.github.io/tslint/2016/03/31/sharable-configurations-rules.html) for more information on sharing rules and configurations across projects.

### Rules

#### relay-operation-generics

Helps enforce type safety and adherence to the following TypeScript/Relay conventions:

- `QueryRenderer` components must include type parameters (includes fix).
- `QueryRenderer` components must use `graphql` tagged template strings for their `query` prop.
- calls to `commitMutation` must use  `graphql` tagged template strings for their `mutation` option.
- calls to `commitMutation` must include type parameters (includes fix).
- calls to `commitMutation` must use full object literal syntax for their `mutation` option.

```json
"relay-operation-generics": [
  true,
  { "artifactDirectory": "__generated__", "makeRelative": false }
]
```

## How do I work on this?

```sh
git clone https://github.com/relay-tools/tslint-plugin-relay.git
cd tslint-plugin-relay
yarn install
# Open VS Code with `code .`
```

(We're still figuring out a testing strategy. See [#2](https://github.com/relay-tools/tslint-plugin-relay/issues/2).)

## How do I deploy this?

```sh
yarn release
```
