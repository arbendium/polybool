import base from '@arbendium/eslint-config-base';

export default [
	...base,
	{
		rules: {
			'import/no-cycle': 'off',
			'import/prefer-default-export': 'off',
			'no-console': 'off',
			'no-underscore-dangle': 'off',
		},
	},
	{
		files: ['*.js', 'test/**'],
		rules: {
			'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
		},
	},
];
