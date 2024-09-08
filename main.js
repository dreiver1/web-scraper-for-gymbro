const axios = require('axios');
const cheerio = require('cheerio');
const url = 'https://muscleandstrength.com/workouts/muscle-building';

const posts = [];

async function main() {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        $('.grid-x.grid-margin-x.grid-margin-y .cell.small-12.bp600-6').each(function () {
            const title = $(this).find('.node-title a').text().trim();
            const link = $(this).find('.node-title a').attr('href');

            posts.push({
                name: title,
                link: `https://www.muscleandstrength.com${link}`
            });
        });

        console.log(posts.length);
        
        console.log(posts);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

main();