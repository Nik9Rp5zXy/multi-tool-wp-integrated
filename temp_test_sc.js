const axios = require('axios');
const cheerio = require('cheerio');

async function testSites() {
    try {
        const ph = await axios.get('https://www.pornhub.com/video/search?search=turkish', { headers: {'User-Agent': 'Mozilla/5.0'} });
        const $ph = cheerio.load(ph.data);
        console.log('ph items:', $ph('.pcVideoListItem').length);
        console.log('ph first title:', $ph('.pcVideoListItem .title a').first().text());
        console.log('ph duration:', $ph('.pcVideoListItem .duration').first().text());
        console.log('ph link:', $ph('.pcVideoListItem .title a').first().attr('href'));
    } catch(e) { console.log('ph error', e.message); }

    try {
        const xh = await axios.get('https://xhamster.com/search/video?q=turkish', { headers: {'User-Agent': 'Mozilla/5.0'} });
        const $xh = cheerio.load(xh.data);
        console.log('xh items:', $xh('.video-thumb').length);
        console.log('xh first title:', $xh('.video-thumb .video-thumb-info__name').first().text());
        console.log('xh link:', $xh('.video-thumb a.video-thumb__image-container').first().attr('href'));
    } catch(e) { console.log('xh error', e.message); }
}

testSites();
