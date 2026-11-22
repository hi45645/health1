export default [
  { ignores: ['node_modules/**','design-review/**','test-results/**','playwright-report/**','data/**'] },
  { files: ['**/*.js','**/*.mjs'],
    rules: {
      'no-dupe-args':'error','no-duplicate-case':'error','no-dupe-class-members':'error',
      'no-unreachable':'error','valid-typeof':'error','no-func-assign':'error',
      'no-unsafe-finally':'error','no-self-assign':'error','use-isnan':'error',
      'no-constant-binary-expression':'error','no-loss-of-precision':'error'
    }
  }
];
