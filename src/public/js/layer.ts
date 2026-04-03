const Layer = {
	TOP: 'TOP',
	BOTTOM: 'BOTTOM',
} as const;

export type LayerName = (typeof Layer)[keyof typeof Layer];

export default Layer;
