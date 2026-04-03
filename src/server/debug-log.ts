export default function debugLog(str: string) {
	if (process.env.NODE_ENV !== 'production') {
		console.log(str);
	}
}
