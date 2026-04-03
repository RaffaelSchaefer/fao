import fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import { randomItemFrom } from '../../common/util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filename = path.resolve(__dirname, 'prompts.csv');

type PromptRow = {
	keyword: string;
	hint: string;
};

let prompts: PromptRow[] | undefined;

function loadPrompts() {
	return new Promise<PromptRow[]>((resolve, reject) => {
		fs.readFile(filename, (err, fileData) => {
			if (err) {
				reject(err);
				return;
			}
			parse<PromptRow>(fileData, { columns: true, trim: true }, (parseErr, output) => {
				if (parseErr) {
					reject(parseErr);
				} else {
					prompts = output;
					validatePromptHeaders(prompts);
					resolve(output);
				}
			});
		});
	});
}

function validatePromptHeaders(items: PromptRow[]) {
	const item = items[0];
	if (item.keyword && item.hint) {
		return true;
	}
	throw new Error('Incorrect prompt headers');
}

function getRandomPrompt() {
	if (prompts === undefined) {
		console.error('No prompts found');
		return undefined;
	}
	return randomItemFrom(prompts);
}

export { loadPrompts, getRandomPrompt };
