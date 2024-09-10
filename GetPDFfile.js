const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const stream = require('stream');
const util = require('util');

const RETRY_DELAY = 1000; 
const MAX_RETRIES = 5; 

async function readLinksFromFile(filename) {
    try {
        const data = fs.readFileSync(filename, 'utf-8');
        const links = [];

        const lines = data.split('\n');
        lines.forEach(line => {
            if (line.trim() && line.startsWith('link: ')) {
                links.push(line.replace('link: ', '').trim());
            }
        });

        return links;
    } catch (error) {
        console.error('Error reading file:', error);
    }
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
    try {
        const response = await axios.get(url);
        return response;
    } catch (error) {
        if (error.response && error.response.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_DELAY;
            console.warn(`Rate limit exceeded. Retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));

            if (retries > 0) {
                return fetchWithRetry(url, retries - 1);
            } else {
                throw new Error('Max retries exceeded');
            }
        } else {
            throw error;
        }
    }
}

async function downloadFile(url, filePath) {
    try {
        const response = await fetchWithRetry(url, MAX_RETRIES);
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading file:', error);
    }
}

async function processLinks(links) {
    try {
        for (const link of links) {
            try {
                const response = await fetchWithRetry(link);
                const html = response.data;
                const $ = cheerio.load(html);

                const linkDownload = $('.last a').attr('href');
                if (linkDownload) {
                    const fileName = path.basename(linkDownload);
                    const filePath = path.join(__dirname, fileName);
                    console.log(`Downloading ${linkDownload} to ${filePath}`);
                    await downloadFile(linkDownload, filePath);
                    console.log(`Downloaded ${fileName}`);
                }
            } catch (error) {
                console.error('Error processing link:', error);
            }
        }
    } catch (error) {
        console.error('Error processing links:', error);
    }
}

async function main() {
    const filename = 'posts.txt'; 
    const links = await readLinksFromFile(filename);
    
    if (links.length > 0) {
        await processLinks(links);
    } else {
        console.log('No links found in the file.');
    }
}

main();
