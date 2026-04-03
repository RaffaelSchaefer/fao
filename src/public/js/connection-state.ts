const CONNECTION_STATE = {
	CONNECT: 'CONNECT',
	RECONNECT: 'RECONNECT',
	DISCONNECT: 'DISCONNECT',
} as const;

export type ConnectionState = (typeof CONNECTION_STATE)[keyof typeof CONNECTION_STATE];

export default CONNECTION_STATE;
