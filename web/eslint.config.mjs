import tseslint from 'typescript-eslint';

const signalFactories = new Set(['signal', 'computed', 'linkedSignal', 'input', 'model',
  'viewChild', 'viewChildren', 'contentChild', 'contentChildren', 'resource', 'httpResource', 'asReadonly']);

function factoryName(expression) {
  if (expression?.type === 'Identifier') return expression.name;
  if (expression?.type !== 'MemberExpression' || expression.computed) return undefined;
  if (expression.property.name === 'required') return factoryName(expression.object);
  return expression.property.name;
}

const signalNames = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: { prefix: 'Name this signal {{prefix}}{{name}}.' },
  },
  create(context) {
    return {
      PropertyDefinition(node) {
        if (node.key.type !== 'Identifier' || node.value?.type !== 'CallExpression') return;
        if (!signalFactories.has(factoryName(node.value.callee))) return;
        const prefix = node.accessibility === 'private' ? '_$' : '$';
        const name = node.key.name;
        if (name.startsWith(prefix) && /^[a-z][a-zA-Z0-9]*$/.test(name.slice(prefix.length))) return;
        context.report({ node: node.key, messageId: 'prefix', data: {
          prefix, name: name.replace(/^[_$]+/, ''),
        } });
      },
    };
  },
};

export default tseslint.config(
  { ignores: ['dist/**', '.angular/**', 'vidoo-data/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    plugins: { vidoo: { rules: { 'signal-names': signalNames } } },
    rules: {
      'vidoo/signal-names': 'error',
      '@typescript-eslint/explicit-member-accessibility': ['error', {
        accessibility: 'explicit',
        overrides: { constructors: 'no-public' },
      }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'classMethod', modifiers: ['private'], leadingUnderscore: 'require', format: ['camelCase'] },
        { selector: 'classMethod', leadingUnderscore: 'forbid', format: ['camelCase'] },
      ],
    },
  },
);
