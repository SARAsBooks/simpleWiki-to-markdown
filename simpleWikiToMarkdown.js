const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');
const turndownPluginGfm = require('turndown-plugin-gfm')
const fs = require('fs').promises;

async function getSimpleWikiArticle(wikiPage) {
    const wikiUrl = `https://simple.wikipedia.org/wiki/${wikiPage}`;
    const response = await axios.get(wikiUrl);

    const dom = new JSDOM(response.data, { url: wikiUrl });
    const document = dom.window.document;

    // Remove all nodes including and after appendices 
    // https://en.wikipedia.org/wiki/Wikipedia:Manual_of_Style/Layout#Order_of_article_elements
    let refsElem = document.querySelector('#Works');
    if (!refsElem) {
        refsElem = document.querySelector('#Publications');
    }
    if (!refsElem) {
        refsElem = document.querySelector('#Discography');
    }
    if (!refsElem) {
        refsElem = document.querySelector('#Filmography');
    }
    if (!refsElem) {
        refsElem = document.querySelector('#Related_pages');
    }
    if (!refsElem) {
        refsElem = document.querySelector('#See_also');
    }
    if (!refsElem) {
        refsElem = document.querySelector('#Notes');
    }
    if (!refsElem) {
        refsElem = document.querySelector('#Notes_and_references');
    }
    if (!refsElem) {
        refsElem = document.querySelector('#References');
    }
    if (!refsElem) {
        refsElem = document.querySelector('#Further_reading');
    }
    if (!refsElem) {
        refsElem = document.querySelector('#External_links');
    }
    if (!refsElem) {
        refsElem = document.querySelector('#Other_websites');
    }

    if (refsElem) {
        let sibling = refsElem.parentElement.nextElementSibling;
        refsElem.parentElement.remove();
        while (sibling) {
            const nextSibling = sibling.nextElementSibling;
            sibling.remove();
            sibling = nextSibling;
        }
    }

    // Remove nodes with "infobox" in the class
    const infoBoxes = document.querySelectorAll('[class*="infobox"]');
    infoBoxes.forEach((box) => box.remove());

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
                return !(wikiPage.includes(':') || wikiPage.includes('/') || wikiPage.includes('#'));
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
        turndownService.use(turndownPluginGfm.tables)
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
    const sortedLinkedWikiPages = Array.from(linkedWikiPages).sort();
    const listOfLinks = sortedLinkedWikiPages.map(title => `\n\n[${title}](https://simple.wikipedia.org/wiki/${title})`).join('')
    const fileContent = `# ${article.title}\n\n` + markdown + source + `\n\n## See also ${listOfLinks}`;
    return { fileContent, linkedWikiPages };
};

module.exports = getSimpleWikiMarkdown;
