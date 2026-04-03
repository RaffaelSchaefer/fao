/**
 * Schemas for socket.io messages
 */

import Ajv from 'ajv';
import MESSAGE from '../common/message.js';
import GameError from './game-error.js';
const ajv = new Ajv();

const usernameMinLength = 1;
const usernameMaxLength = 20;

const SCHEMA = {};

SCHEMA[MESSAGE.CREATE_ROOM] = {
	$id: MESSAGE.CREATE_ROOM,
	properties: {
		username: {
			type: 'string',
			minLength: usernameMinLength,
			maxLength: usernameMaxLength,
		},
	},
	required: ['username'],
};
SCHEMA[MESSAGE.JOIN_ROOM] = {
	$id: MESSAGE.JOIN_ROOM,
	properties: {
		username: {
			type: 'string',
			minLength: usernameMinLength,
			maxLength: usernameMaxLength,
		},
		roomCode: {
			type: 'string',
			minLength: 1,
		},
	},
	required: ['username', 'roomCode'],
};
SCHEMA[MESSAGE.LEAVE_ROOM] = {
	$id: MESSAGE.LEAVE_ROOM,
	properties: {},
	required: [],
};
SCHEMA[MESSAGE.START_GAME] = {
	$id: MESSAGE.START_GAME,
	properties: {},
	required: [],
};
SCHEMA[MESSAGE.SUBMIT_STROKE] = {
	$id: MESSAGE.SUBMIT_STROKE,
	properties: {
		points: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					x: {
						type: 'number',
						minimum: -100,
						maximum: 100,
					},
					y: {
						type: 'number',
						minimum: -100,
						maximum: 100,
					},
				},
				required: ['x', 'y'],
			},
			minItems: 2,
			maxItems: 500,
		},
	},
	required: ['points'],
};
SCHEMA[MESSAGE.SUBMIT_VOTE] = {
	$id: MESSAGE.SUBMIT_VOTE,
	properties: {
		targetName: {
			type: 'string',
			minLength: 1,
			maxLength: usernameMaxLength,
		},
	},
	required: ['targetName'],
};
SCHEMA[MESSAGE.ADD_CUSTOM_TOPIC] = {
	$id: MESSAGE.ADD_CUSTOM_TOPIC,
	properties: {
		keyword: {
			type: 'string',
			minLength: 1,
			maxLength: 30,
		},
		hint: {
			type: 'string',
			maxLength: 50,
		},
	},
	required: ['keyword'],
};
SCHEMA[MESSAGE.REMOVE_CUSTOM_TOPIC] = {
	$id: MESSAGE.REMOVE_CUSTOM_TOPIC,
	properties: {
		index: {
			type: 'integer',
			minimum: 0,
		},
	},
	required: ['index'],
};
SCHEMA[MESSAGE.TOGGLE_CUSTOM_TOPICS] = {
	$id: MESSAGE.TOGGLE_CUSTOM_TOPICS,
	properties: {
		customOnly: {
			type: 'boolean',
		},
	},
	required: ['customOnly'],
};
SCHEMA[MESSAGE.SET_GAME_MODE] = {
	$id: MESSAGE.SET_GAME_MODE,
	properties: {
		mode: {
			type: 'string',
			enum: ['classic', 'timed'],
		},
	},
	required: ['mode'],
};

for (let schema of Object.values(SCHEMA)) {
	ajv.addSchema(schema, schema.$id);
}
console.log(`Message schemas loaded.`);

function validateMessageFromClient(messageName, json) {
	if (!SCHEMA[messageName]) {
		return true;
	}

	let res = ajv.validate(messageName, json);
	if (!res) {
		console.warn(ajv.errorsText());
		throw new GameError('Invalid message');
	}
	return res;
}

export { validateMessageFromClient };
