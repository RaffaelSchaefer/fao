import { negligible } from './util.js';

/*
X-Y points with values ranging (0, 0) to (1.0, 1.0)
*/
class RelativePoint {
	x: number;

	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	matches(other: RelativePoint) {
		return negligible(this.x, other.x) && negligible(this.y, other.y);
	}
}

export default RelativePoint;
