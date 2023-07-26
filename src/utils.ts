
/**
 * Generate a string of random hexadecimal chars
 */
export const randomHexString = (len: number) => {
	const t = []
	for (let n = 0; n < len; n++) {
		t.push((16 * Math.random() | 0).toString(16))
	}
	return t.join("")
}
