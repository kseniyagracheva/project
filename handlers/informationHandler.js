import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { serverInfo } from '../config.js';

export async function getInformation(req, res) {
    try {
        // Чтение файла с информацией
        const filePath = path.join(serverInfo.__dirname, 'info.txt');
        const fileData = await fs.readFile(filePath, 'utf8');

        // Получаем информацию о сервере
        const currentServerInfo = {
            hostname: os.hostname(),
            platform: os.platform(),
            architecture: os.arch(),
            cpuCount: serverInfo.cpuCount,
            freeMemory: os.freemem(),
            totalMemory: os.totalmem(),
        };

        res.render('information', {
            fileData,
            serverInfo: currentServerInfo,
        });
    } catch (error) {
        console.error('Ошибка при получении информации:', error);
        res.status(500).send('Ошибка при получении информации');
    }
}
