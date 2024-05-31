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
			if (!resolved) {
				console.warn('Failed to get subpath', { file, subpath })
				return body
			}
			if (resolved.start || resolved.end) {
				const subText = body.slice(resolved.start.offset, resolved.end?.offset)
				if (subText) {
					return subText
				} else {
					console.warn('Failed to get subpath', { file, subpath })
					return body
				}
			}
		}
	}

	return body
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
				const ext = file.extension
				if (node.subpath) {
					return await readFileContent(app, file, nodeData.subpath)
				} else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
					const fileBuffer = Buffer.from(await app.vault.adapter.readBinary(file.path))
					return `data:image/${ext};base64,${fileBuffer.toString('base64')}`
				} else {
					const body = await app.vault.read(file)
					return `## ${file.basename}\n${body}`
				}
			} else {
				console.debug('Cannot read from file type', file)
			}
	}
}
