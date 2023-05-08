
export const random = (e: number) => {
	let t = []
	for (let n = 0; n < e; n++) {
		t.push((16 * Math.random() | 0).toString(16))
	}
	return t.join("")
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
