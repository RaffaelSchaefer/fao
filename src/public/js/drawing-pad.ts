import Layer, { type LayerName } from './layer.js';
import RelativePoint from '../../common/relative-point.js';

const HEIGHT_RATIO = 8 / 6;
const MAX_CANVAS_W = 650;
const MAX_CANVAS_H = MAX_CANVAS_W * HEIGHT_RATIO;
const BASE_STROKE_WIDTH = 10;
const CANVAS_MARGIN_HOR = 20;
const CANVAS_MARGIN_VER = 96;

interface DrawingPadLayer {
	canvas?: HTMLCanvasElement;
	context?: CanvasRenderingContext2D;
}

interface DrawingPadState {
	[Layer.TOP]: DrawingPadLayer;
	[Layer.BOTTOM]: DrawingPadLayer;
	canvasDiv?: HTMLDivElement;
	canvasWidth?: number;
	canvasHeight?: number;
	strokeWidth?: number;
}

const drawingPad: DrawingPadState = {
	[Layer.TOP]: {},
	[Layer.BOTTOM]: {},
	canvasDiv: undefined,
	canvasWidth: undefined,
	canvasHeight: undefined,
	strokeWidth: undefined,
};

function ensureCanvasElements(): void {
	const canvasDiv = document.getElementById('drawing-pad');
	if (!(canvasDiv instanceof HTMLDivElement)) {
		throw new Error('Drawing pad container is missing');
	}
	const topCanvas = document.getElementById('new-paint');
	const bottomCanvas = document.getElementById('old-paint');
	if (!(topCanvas instanceof HTMLCanvasElement) || !(bottomCanvas instanceof HTMLCanvasElement)) {
		throw new Error('Required canvas elements are missing');
	}
	const topContext = topCanvas.getContext('2d');
	const bottomContext = bottomCanvas.getContext('2d');
	if (!topContext || !bottomContext) {
		throw new Error('Unable to initialize canvas contexts');
	}

	drawingPad.canvasDiv = canvasDiv;
	drawingPad[Layer.TOP].canvas = topCanvas;
	drawingPad[Layer.TOP].context = topContext;
	drawingPad[Layer.BOTTOM].canvas = bottomCanvas;
	drawingPad[Layer.BOTTOM].context = bottomContext;
}

const drawingPadController = {
	init() {
		ensureCanvasElements();
	},
	adjustSize() {
		const canvasDiv = drawingPad.canvasDiv;
		const topCanvas = drawingPad[Layer.TOP].canvas;
		const bottomCanvas = drawingPad[Layer.BOTTOM].canvas;

		if (!canvasDiv || !topCanvas || !bottomCanvas) {
			return;
		}

		const canvasWidthScaledByViewportWidth = Math.min(
			window.innerWidth - CANVAS_MARGIN_HOR * 2,
			MAX_CANVAS_W
		);
		const canvasWidthScaledByViewportHeight =
			Math.min(window.innerHeight - CANVAS_MARGIN_VER * 2, MAX_CANVAS_H) / HEIGHT_RATIO;

		const canvasWidth = Math.min(canvasWidthScaledByViewportWidth, canvasWidthScaledByViewportHeight);
		drawingPad.canvasWidth = canvasWidth;

		topCanvas.width = canvasWidth;
		bottomCanvas.width = canvasWidth;

		const targetHeight = canvasWidth * HEIGHT_RATIO;
		drawingPad.canvasHeight = targetHeight;

		canvasDiv.style.width = `${canvasWidth}px`;
		canvasDiv.style.height = `${targetHeight}px`;
		topCanvas.height = targetHeight;
		bottomCanvas.height = targetHeight;
		topCanvas.style.height = `${targetHeight}px`;
		bottomCanvas.style.height = `${targetHeight}px`;

		Array.from(document.getElementsByClassName('canvas-aligned')).forEach((el) => {
			const element = el as HTMLElement;
			element.style.width = `${canvasWidth}px`;
		});

		drawingPad.strokeWidth = (BASE_STROKE_WIDTH * canvasWidth) / MAX_CANVAS_W;
	},

	getRelativePointFromPointerEvent(e: PointerEvent): RelativePoint {
		const canvasDiv = drawingPad.canvasDiv;
		const canvasWidth = drawingPad.canvasWidth;
		const canvasHeight = drawingPad.canvasHeight;

		if (!canvasDiv || canvasWidth === undefined || canvasHeight === undefined) {
			throw new Error('Drawing pad is not initialized');
		}

		const rect = canvasDiv.getBoundingClientRect();
		const pointerX = e.clientX - rect.left;
		const pointerY = e.clientY - rect.top;
		return new RelativePoint(pointerX / canvasWidth, pointerY / canvasHeight);
	},

	clearLayer(layer: LayerName) {
		const context = drawingPad[layer].context;
		if (!context || drawingPad.canvasWidth === undefined || drawingPad.canvasHeight === undefined) {
			return;
		}
		context.clearRect(0, 0, drawingPad.canvasWidth, drawingPad.canvasHeight);
	},

	drawStroke(layer: LayerName, points: RelativePoint[], color: string) {
		const context = drawingPad[layer].context;
		if (
			!context ||
			drawingPad.strokeWidth === undefined ||
			drawingPad.canvasWidth === undefined ||
			drawingPad.canvasHeight === undefined
		) {
			return;
		}
		context.strokeStyle = color;
		context.lineJoin = 'round';
		context.lineWidth = drawingPad.strokeWidth;
		context.lineCap = 'round';
		context.beginPath();
		for (const pt of points) {
			context.lineTo(pt.x * drawingPad.canvasWidth, pt.y * drawingPad.canvasHeight);
		}
		context.stroke();
	},
};

export default drawingPadController;
