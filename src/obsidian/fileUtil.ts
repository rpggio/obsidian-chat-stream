import { App, TFile, resolveSubpath } from 'obsidian'
import type { CanvasNode } from './canvas-internal'

async function readFileContent(app: App, file: TFile, subpath: string) {
	const cache = app.metadataCache.getFileCache(file)
	const resolved = cache && resolveSubpath(cache, subpath)
	if (!resolved) throw new Error('A linked heading or block could not be resolved. Check the Canvas link.')
	const body = await app.vault.read(file)
	return body.slice(resolved.start.offset, resolved.end?.offset)
}

export async function readNodeContent(node: CanvasNode) {
	const nodeData = node.getData()
	if (nodeData.type === 'text') return nodeData.text
	if (nodeData.type !== 'file') return

	const app = node.app
	const file = app.vault.getFileByPath(nodeData.file)
	if (!file || !(file instanceof TFile)) return
	if (nodeData.subpath) return readFileContent(app, file, nodeData.subpath)
	if (['png', 'jpg', 'jpeg'].includes(file.extension)) {
		const image = Buffer.from(await app.vault.readBinary(file))
		const mime = file.extension === 'png' ? 'image/png' : 'image/jpeg'
		return `data:${mime};base64,${image.toString('base64')}`
	}
	if (file.extension === 'md') return `## ${file.basename}\n${await app.vault.read(file)}`
}
