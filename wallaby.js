module.exports = function(wallaby) {
  return {
    files: [
      "tsconfig.json",
      "rules/**/*.ts?(x)",
      "rules/**/*.snap",
      "rules/**/*.json",
      "!rules/**/*.test.ts?(x)",
    ],
    tests: ["rules/**/*.test.ts?(x)"],

    env: {
      type: "node",
      runner: "node",
    },

    testFramework: "jest",
  }
}
