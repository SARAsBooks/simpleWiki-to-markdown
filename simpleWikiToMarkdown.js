const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');
const fs = require('fs').promises;

async function getSimpleWikiArticle(wikiPage) {
    const wikiUrl = `https://simple.wikipedia.org/wiki/${wikiPage}`;
    const response = await axios.get(wikiUrl);

    const dom = new JSDOM(response.data, { url: wikiUrl });
    const document = dom.window.document;

    // Remove all nodes including and after id="References"
    const refsElem = document.querySelector('#References').parentElement;
    if (refsElem) {
        let sibling = refsElem.nextElementSibling;
        refsElem.remove();
        while (sibling) {
            const nextSibling = sibling.nextElementSibling;
            sibling.remove();
            sibling = nextSibling;
        }
    }

    // Remove nodes with class="reference"
    const references = document.querySelectorAll('.reference');
    references.forEach((ref) => ref.remove());

    // Remove nodes with "editsection" in the class
    const editSections = document.querySelectorAll('[class*="editsection"]');
    editSections.forEach((section) => section.remove());

    // Make an array of all links with a URL beginning with /wiki/
    const linkedWikiPages = new Set(
        Array.from(document.querySelector('#bodyContent')
            .querySelectorAll('a[href^="/wiki/"]'))
            .map((anchor) => {
                const urlString = anchor.href;
                return urlString.substring(urlString.indexOf('/wiki/') + 6);
            })
            .filter(wikiPage => {
                return !wikiPage.includes(':');
              })
    );

    // Remove all links from the HTML
    const allLinks = Array.from(document.querySelectorAll('a'));
    allLinks.forEach((link) => {
        const newElement = document.createElement('span')
        newElement.innerHTML = link.innerHTML;
        link.replaceWith(newElement);
    });

    // Send the HTML through @mozilla/readability
    const reader = new Readability(document, { url: wikiUrl });
    const article = reader.parse();

    // Return the article and the set of URLs
    return { article, linkedWikiPages };
}

function convertToMarkdown(html) {
    try {
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(html);
        return markdown;
    } catch (error) {
        console.error(`Error converting HTML to Markdown: ${error}`);
    }
}

async function saveAsMarkdownFile(filename, content) {
    await fs.writeFile(filename, content, 'utf-8');
}

async function getSimpleWikiMarkdown(wikiPage) {
    const wikiUrl = `https://simple.wikipedia.org/wiki/${wikiPage}`;
    const { article, linkedWikiPages } = await getSimpleWikiArticle(wikiPage);

    const markdown = convertToMarkdown(article.content);
    const source = `\n\n[Source](${wikiUrl})`;
    const see_also = `\n\n## See also`;
    const listOfLinks = linkedWikiPages.sorted().map(title => `\n[${title}](https://simple.wikipedia.org/wiki/${title})`).join('')
    const content = `# ${article.title}\n\n${markdown}${source}${see_also}${listOfLinks}`;
    return { content, linkedWikiPages };
};

export default getSimpleWikiMarkdown;