import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const serverInfo = {
    port: 3000,
    cpuCount: os.cpus().length,
    __filename,
    __dirname
};