import { prefix } from './oxc-message.js';

const message: string = process.argv[2];
if (!message?.startsWith(prefix)) throw new Error('Missing data message prefix');
console.log(JSON.stringify({ message }));
