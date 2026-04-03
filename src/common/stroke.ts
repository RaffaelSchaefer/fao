import type RelativePoint from './relative-point.js';

class Stroke {
	username: string;

	points: RelativePoint[];

	constructor(username: string, points: RelativePoint[]) {
		this.username = username;
		this.points = points; // array of relativePoints to connect
	}
}

export default Stroke;
