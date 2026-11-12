import obsidian from 'eslint-plugin-obsidianmd'

export default [
	...obsidian.configs.recommended,
	{ ignores: ['**/*.test.ts', 'main.js'] },
	{ files: ['**/*.ts'], languageOptions: { parserOptions: { projectService: true } } }
]
