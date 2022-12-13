'use strict';

// ES6 has no __dirname, we define it in this way
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export { __dirname };