const VIEW = {
	HOME: 'home',
	SETUP: 'setup',
	GAME: 'game',
	RULES: 'rules',
	FAQ: 'faq',
} as const;

export type ViewName = (typeof VIEW)[keyof typeof VIEW];

export default VIEW;
