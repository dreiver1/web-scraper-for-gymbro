const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const categoryUrl = 'https://www.muscleandstrength.com/workout-routines';
const { setup } = require('axios-cache-adapter');

const api = setup({
    cache: {
        maxAge: 15 * 60 * 1000
    }
});

api.interceptors.response.use(null, (error) => {
    if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000;
        console.log(`Rate limit exceeded. Retrying after ${delay} ms`);
        return new Promise((resolve) => {
            setTimeout(() => resolve(api(error.config)), delay);
        });
    }
    return Promise.reject(error);
});

async function writePosts(posts) {
    const fileStream = fs.createWriteStream('posts.txt', { flags: 'a', encoding: 'utf-8' });
    posts.forEach(post => {
        fileStream.write(`name: ${post.name}\n`);
        fileStream.write(`link: ${post.link}\n`);
        fileStream.write('---\n');
    });
    fileStream.end(); 
}

async function main() {
    try {
        const posts = await getPosts();
        if (posts.length > 0) {
            await writePosts(posts);
            console.log('Posts saved to posts.txt');
        }
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

async function getPosts() {
    try {
        const posts = [];
        const response = await api.get(categoryUrl);
        const html = response.data;
        const $ = cheerio.load(html);

        const cells = $('.grid-x.grid-margin-x.grid-margin-y.small-up-2.bp600-up-3.medium-up-4 .cell');

        for (const cell of cells.toArray()) {
            const link = $(cell).find('a').attr('href');
            if (link) {
                const linkCategory = `https://www.muscleandstrength.com${link}`;
                const actualPosts = await getPost(linkCategory);
                console.log(actualPosts)
                if (actualPosts) {
                    posts.push(...actualPosts);
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        return posts;
    } catch (error) {
        console.error('Error fetching posts:', error);
    }
}

async function getPost(linkCategory) {
    try {
        const response = await api.get(linkCategory);
        const html = response.data;
        const $ = cheerio.load(html);
        const posts = [];

        $('.grid-x.grid-margin-x.grid-margin-y .cell.small-12.bp600-6').each(function () {
            const title = $(this).find('.node-title a').text().trim();
            const linkPost = $(this).find('.node-title a').attr('href');

            posts.push({
                name: title,
                link: `https://www.muscleandstrength.com${linkPost}`
            });
        });

        return posts;
    } catch (error) {
        console.error('Error fetching post:', error);
    }
}

main();
