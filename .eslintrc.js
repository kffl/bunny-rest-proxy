module.exports = {
    env: {
        es2021: true,
        node: true,
        jest: true
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module'
    },
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
        'no-console': 1,
        'prettier/prettier': 2,
        '@typescript-eslint/ban-ts-comment': 'off'
    }
};
