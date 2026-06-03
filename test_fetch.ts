import fetch from 'node-fetch';

const decodeXmlEntities = (str: string): string => {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
};

async function testRealCbsHeadlines() {
  try {
    const res = await fetch("https://www.cbsnews.com/latest/rss/main", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*"
      }
    });
    const xml = await res.text();
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    let index = 1;
    console.log("Parsing CBS news headlines...");
    while ((match = itemRegex.exec(xml)) !== null && index <= 5) {
      const itemXml = match[1];
      const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      let title = titleMatch ? titleMatch[1].trim() : "None";
      title = title.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/gi, "$1").trim();
      title = title.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      title = decodeXmlEntities(title);
      console.log(`${index}. ${title}`);
      
      const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      console.log(`   Link: ${linkMatch ? linkMatch[1] : 'None'}`);
      index++;
    }
  } catch (err: any) {
    console.error("Error:", err);
  }
}

testRealCbsHeadlines();
