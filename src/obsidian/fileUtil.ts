import { App, TFile, resolveSubpath } from 'obsidian'
import { CanvasNode } from './canvas-internal'

export async function readFileContent(
	app: App,
	file: TFile,
	subpath?: string | undefined
) {
	const body = await app.vault.read(file)

	if (subpath) {
		const cache = app.metadataCache.getFileCache(file)
		if (cache) {
			const resolved = resolveSubpath(cache, subpath)
			if (resolved.start || resolved.end) {
				const subText = body.slice(resolved.start.offset, resolved.end?.offset)
				if (subText) {
					return subText
				} else {
					console.warn('Failed to get subpath', { file, subpath })
				}
			}
		}
	} else {
		return body
	}
}

export async function readNodeContent(node: CanvasNode) {
	const app = node.app
	const nodeData = node.getData()
	switch (nodeData.type) {
		case 'text':
			return nodeData.text
		case 'file':
			const file = app.vault.getAbstractFileByPath(nodeData.file)
			if (file instanceof TFile) {
				const body = await app.vault.read(file)
				if (node.subpath) {
					return await readFileContent(app, file, nodeData.subpath)
				} else {
					return `## ${file.basename}\n${body}`
				}
			} else {
				console.debug('Cannot read from file type', file)
			}
	}
}
