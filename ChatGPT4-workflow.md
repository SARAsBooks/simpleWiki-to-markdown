> document an automation workflow in nodejs to retrieve a specified /wiki/ page from simple.wikipedia.org, remove all nodes with class="reference", remove all nodes with "editsection" in the class, remove all nodes including and after id="References", then send the html through @mozilla/readability, make an array of all links with a url beginning with /wiki/ then remove all links from the html, then pass the html through turndown, and return the markdown and the array of urls

To implement the described automation workflow in Node.js, you will need to install a few packages. Make sure you have Node.js installed, then create a new project and run the following commands:

```
npm init -y
npm install axios
npm install jsdom
npm install @mozilla/readability
npm install turndown
```

Now, create a file called wikiToMarkdown.js and add the following code:

```
const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');

async function getSimpleWikiMarkdown(wikiPage) {
  const wikiUrl = `https://simple.wikipedia.org/wiki/${wikiPage}`;
  const response = await axios.get(wikiUrl);

  const dom = new JSDOM(response.data);
  const document = dom.window.document;

  // Remove nodes with class="reference"
  const references = document.querySelectorAll('.reference');
  references.forEach((ref) => ref.remove());

  // Remove nodes with "editsection" in the class
  const editSections = document.querySelectorAll('[class*="editsection"]');
  editSections.forEach((section) => section.remove());

  // Remove all nodes including and after id="References"
  const refsElem = document.querySelector('#References');
  if (refsElem) {
    refsElem.remove();
    let sibling = refsElem.nextElementSibling;
    while (sibling) {
      const nextSibling = sibling.nextElementSibling;
      sibling.remove();
      sibling = nextSibling;
    }
  }

  // Send the HTML through @mozilla/readability
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  // Make an array of all links with a URL beginning with /wiki/
  const allLinks = Array.from(document.querySelectorAll('a[href^="/wiki/"]'));
  const wikiLinks = allLinks.map((link) => link.href);

  // Remove all links from the HTML
  allLinks.forEach((link) => link.remove());

  // Pass the HTML through turndown
  const turndownService = new TurndownService();
  const markdown = turndownService.turndown(article.content);

  // Return the markdown and the array of URLs
  return { markdown, wikiLinks };
}

module.exports = getSimpleWikiMarkdown;
```

Now you can use the getSimpleWikiMarkdown function from another file, like this:

```
const getSimpleWikiMarkdown = require('./wikiToMarkdown');

(async () => {
  const { markdown, wikiLinks } = await getSimpleWikiMarkdown('Node.js');

  console.log('Markdown content:');
  console.log(markdown);

  console.log('Wiki links:');
  console.log(wikiLinks);
})();
```

This code will get the specified wiki page, process it as described, and return the markdown content and an array of URLs.