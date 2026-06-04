import { useState, useEffect } from "react";
import { Story, DualFeedData } from "./types";
import { StoryCard } from "./components/StoryCard";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { RssSuggestionsList } from "./components/RssSuggestionsList";
import { BACKUP_DIGG_STORIES, BACKUP_CBS_STORIES } from "./backupData";
import { 
  Calendar as CalendarIcon, 
  Search, 
  Newspaper, 
  Activity, 
  Sparkles, 
  RefreshCw, 
  Download, 
  TrendingUp, 
  Compass, 
  BookOpen
} from "lucide-react";

// Decode XML Entities Helper Function
const decodeXmlEntities = (str: string): string => {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rsquo;/g, "’")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
};

// Sequential CORS proxy fetcher
const fetchWithProxy = async (url: string): Promise<string> => {
  const proxies = [
    (target: string) => `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
    (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    (target: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`
  ];

  let lastError: any = null;
  for (const proxy of proxies) {
    try {
      const proxiedUrl = proxy(url);
      const res = await fetch(proxiedUrl);
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Failed to fetch RSS feed through any of the client CORS proxies.");
};

// Fallback date mapper for historical query requests
const getDynamicFallback = (requestedDateStr: string) => {
  const cutoffDateObj = new Date(requestedDateStr);
  cutoffDateObj.setDate(cutoffDateObj.getDate() - 1);
  const previousDayStr = cutoffDateObj.toISOString().split("T")[0];

  const adjustStory = (story: any, index: number) => {
    const hour = Math.max(0, 22 - index * 2);
    const minute = (index * 13) % 65 % 60;
    const isoString = `${previousDayStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
    return {
      ...story,
      publishedAt: isoString,
    };
  };

  return {
    cutoffDate: `${previousDayStr} 23:59`,
    diggStories: BACKUP_DIGG_STORIES.map((s, idx) => adjustStory(s, idx)),
    cbsStories: BACKUP_CBS_STORIES.map((s, idx) => adjustStory(s, idx)),
  };
};

// Client side XML feed parser inside browser
const parseRssXmlClient = (xmlText: string, prefix: "digg" | "cbs"): Story[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    console.warn("[DOMParser] XML Parse Error. Falling back to robust Regex extractor:", parseError[0].textContent);
    return parseRssXmlRegexFallback(xmlText, prefix);
  }

  const items = xmlDoc.querySelectorAll("item");
  const stories: Story[] = [];
  const limit = 10;

  const verifyPoolDigg = [
    { id: "gX3fAnY_1dI", title: "CBS Evening News Full Special Broadcast", channel: "CBS Evening News" },
    { id: "DQacCB9tDaw", title: "CBS News Financial Forecast & Market Report", channel: "CBS News Markets" },
    { id: "29ECwWrnzdQ", title: "60 Minutes: Behind the Scenes Investigative Report", channel: "60 Minutes" },
    { id: "vB-SAnAatgA", title: "CBS Mornings Interactive Correspondent Segment", channel: "CBS Mornings" },
    { id: "V_mepYmclHA", title: "Neuralink & Advanced BioTech Clinical Trials Update", channel: "CBS News Reports" }
  ];
  const verifyPoolCbs = [
    { id: "9S5R9K13mK0", title: "Omega Seamaster Ultra Deep Titanium Hands-On Review", channel: "Teddy Baldassarre" },
    { id: "gqK7i4Ncsis", title: "Porsche 911 S/T: The Best 911 Ever Built?", channel: "Top Gear" },
    { id: "bOWeeHdfm58", title: "Inside a Breathtaking Concrete Brutalist Escape", channel: "Never Too Small" },
    { id: "nUvV8tE-aSM", title: "Leica M11-D Rangefinder: No Screen, No Compromise", channel: "KaiManWong" },
    { id: "fcoiN7S3I8o", title: "The Ridge Wallet Upgrade: Heat-Torched Titanium & Carbon", channel: "EDC Weekly" }
  ];

  const categoryPlaceholders: Record<string, string> = {
    Cars: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&auto=format&fit=crop",
    Gear: "https://images.unsplash.com/photo-1585366119957-e5733f3998cd?w=600&auto=format&fit=crop",
    Tech: "https://images.unsplash.com/photo-1613521134141-f2d453aaad7d?w=600&auto=format&fit=crop",
    Style: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop",
    Shelter: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop",
    Vices: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop",
    Politics: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=600&auto=format&fit=crop",
    Finance: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop",
    "Space & Science": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop",
    "Climate & Environment": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop",
    "World News": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop",
    "Main News": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop"
  };

  for (let i = 0; i < items.length && stories.length < limit; i++) {
    const item = items[i];
    const itemXmlStr = new XMLSerializer().serializeToString(item);
    
    const getTagValue = (tagName: string): string => {
      const el = item.getElementsByTagName(tagName)[0] || item.getElementsByTagNameNS("*", tagName)[0];
      return el ? el.textContent || "" : "";
    };

    let title = getTagValue("title").trim();
    if (!title) {
      const titleMatch = itemXmlStr.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();
    }
    title = title.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/gi, "$1").trim();
    title = title.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    title = decodeXmlEntities(title);

    // Ultra robust link parsing: check DOM, check XML matches, support links inside CDATA, support nested link tag structures
    let link = getTagValue("link").trim() || getTagValue("guid").trim();
    if (!link || !link.startsWith("http")) {
      const linkMatch = itemXmlStr.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || itemXmlStr.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
      if (linkMatch) {
        link = linkMatch[1].trim();
      }
    }
    const hrefMatch = itemXmlStr.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (hrefMatch && (!link || !link.startsWith("http"))) {
      link = hrefMatch[1].trim();
    }
    link = link.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/gi, "$1").trim();
    link = link.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    link = decodeXmlEntities(link);
    if (!link || !link.startsWith("http")) {
      link = prefix === "digg" ? "https://www.cbsnews.com" : "https://uncrate.com";
    }

    let summary = getTagValue("content:encoded") || getTagValue("description");
    if (!summary) {
      const summaryMatch = itemXmlStr.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i) || itemXmlStr.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      if (summaryMatch) summary = summaryMatch[1].trim();
    }
    summary = summary.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/gi, "$1").trim();
    summary = summary.replace(/<!\[CDATA\[|\]\]>/g, "").trim();

    let imgFromHtml = "";
    const inlineImgMatch = summary.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (inlineImgMatch) {
      imgFromHtml = inlineImgMatch[1].trim();
    }

    summary = summary.replace(/<[^>]*>/g, "").trim();
    summary = summary.replace(/Visit\s+Uncrate\s+for\s+the\s+full\s+post\s*\.?/gi, "").trim();
    summary = decodeXmlEntities(summary);
    if (summary.length > 250) {
      summary = summary.slice(0, 247) + "...";
    }
    if (!summary) {
      summary = prefix === "digg" 
        ? "Access live coverage, videos, and multi-angle analysis directly from the cbsnews.com feed."
        : "Discover custom crafted high-performance gear, premium styles, classic luxury cars, and brutalist architectures curated by Uncrate.";
    }

    let publishedAt = new Date().toISOString();
    const pubDateStr = getTagValue("pubDate");
    if (pubDateStr) {
      try {
        const parsedDate = new Date(pubDateStr);
        if (!isNaN(parsedDate.getTime())) {
          publishedAt = parsedDate.toISOString();
        }
      } catch {}
    }

    let category = getTagValue("category").trim();
    if (!category) {
      const catMatch = itemXmlStr.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
      if (catMatch) category = catMatch[1].trim();
    }
    category = category.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    category = decodeXmlEntities(category);
    if (!category) {
      category = prefix === "digg" ? "Main News" : "Gear";
    } else if (prefix === "cbs") {
      const lowerCat = category.toLowerCase();
      if (lowerCat.includes("style") || lowerCat.includes("apparel") || lowerCat.includes("wear") || lowerCat.includes("shoes") || lowerCat.includes("boots") || lowerCat.includes("jacket") || lowerCat.includes("rings") || lowerCat.includes("watch") || lowerCat.includes("grooming")) {
        category = "Style";
      } else if (lowerCat.includes("car") || lowerCat.includes("automotive") || lowerCat.includes("motorcycle") || lowerCat.includes("vehicle") || lowerCat.includes("truck") || lowerCat.includes("rides") || lowerCat.includes("moto") || lowerCat.includes("ducati") || lowerCat.includes("yamaha") || lowerCat.includes("porsche")) {
        category = "Cars";
      } else if (lowerCat.includes("shelter") || lowerCat.includes("architecture") || lowerCat.includes("house") || lowerCat.includes("cabin") || lowerCat.includes("home") || lowerCat.includes("design") || lowerCat.includes("furniture") || lowerCat.includes("hotel")) {
        category = "Shelter";
      } else if (lowerCat.includes("tech") || lowerCat.includes("gadget") || lowerCat.includes("gear") || lowerCat.includes("tool") || lowerCat.includes("everyday carry") || lowerCat.includes("edc") || lowerCat.includes("audio") || lowerCat.includes("speaker") || lowerCat.includes("synth") || lowerCat.includes("software")) {
        category = "Tech";
      } else if (lowerCat.includes("vices") || lowerCat.includes("drink") || lowerCat.includes("smoke") || lowerCat.includes("whiskey") || lowerCat.includes("cigar") || lowerCat.includes("spirits") || lowerCat.includes("beer")) {
        category = "Vices";
      } else {
        category = "Gear";
      }
    }

    // Extraction of thumbnail: namespaced tags check safely, fallback to regex matching
    let itemThumbnailUrl = "";

    // Safely check namespaced nodes via standard DOM element methods first
    const mediaContent = item.getElementsByTagNameNS("*", "content")[0] || item.getElementsByTagName("content")[0];
    if (mediaContent) {
      itemThumbnailUrl = mediaContent.getAttribute("url") || "";
    }
    if (!itemThumbnailUrl) {
      const mediaThumbnail = item.getElementsByTagNameNS("*", "thumbnail")[0] || item.getElementsByTagName("thumbnail")[0];
      if (mediaThumbnail) {
        itemThumbnailUrl = mediaThumbnail.getAttribute("url") || "";
      }
    }
    if (!itemThumbnailUrl) {
      const enclosure = item.getElementsByTagName("enclosure")[0];
      if (enclosure) {
        itemThumbnailUrl = enclosure.getAttribute("url") || "";
      }
    }
    if (!itemThumbnailUrl) {
      itemThumbnailUrl = imgFromHtml;
    }

    // Failsafe: Try regexes on the serialized item XML string for namespaced content/thumbnail urls
    if (!itemThumbnailUrl) {
      const mediaContentMatch = itemXmlStr.match(/<[^:]+:content[^>]+url=["']([^"']+)["']/i) || itemXmlStr.match(/<content[^>]+url=["']([^"']+)["']/i);
      if (mediaContentMatch) itemThumbnailUrl = mediaContentMatch[1];
    }
    if (!itemThumbnailUrl) {
      const mediaThumbnailMatch = itemXmlStr.match(/<[^:]+:thumbnail[^>]+url=["']([^"']+)["']/i) || itemXmlStr.match(/<thumbnail[^>]+url=["']([^"']+)["']/i);
      if (mediaThumbnailMatch) itemThumbnailUrl = mediaThumbnailMatch[1];
    }
    if (!itemThumbnailUrl) {
      const enclosureMatch = itemXmlStr.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      if (enclosureMatch) itemThumbnailUrl = enclosureMatch[1];
    }
    if (!itemThumbnailUrl) {
      const imgMatch = itemXmlStr.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) itemThumbnailUrl = imgMatch[1];
    }

    // Nested image-tag extractor fallback
    if (!itemThumbnailUrl) {
      const itemImg = item.getElementsByTagName("image")[0] || item.getElementsByTagNameNS("*", "image")[0];
      if (itemImg) {
        const innerUrl = itemImg.getElementsByTagName("url")[0] || itemImg.getElementsByTagNameNS("*", "url")[0];
        if (innerUrl) itemThumbnailUrl = innerUrl.textContent || "";
      }
    }
    if (!itemThumbnailUrl) {
      const imageTagsMatch = itemXmlStr.match(/<image[^>]*>([\s\S]*?)<\/image>/i);
      if (imageTagsMatch) {
         const innerUrlMatch = imageTagsMatch[1].match(/<url[^>]*>([\s\S]*?)<\/url>/i);
         if (innerUrlMatch) itemThumbnailUrl = innerUrlMatch[1].trim();
      }
    }

    // Last resort: bulletproof regex scan for any image URL inside the XML block
    if (!itemThumbnailUrl) {
      const anyImgUrlMatch = itemXmlStr.match(/https?:\/\/[^"'\s<>]+?\.(?:jpe?g|png|gif|webp)(?:\?[^"'\s<>]+)?/i);
      if (anyImgUrlMatch) itemThumbnailUrl = anyImgUrlMatch[0];
    }

    if (itemThumbnailUrl) {
      itemThumbnailUrl = decodeXmlEntities(itemThumbnailUrl).replace(/['"]/g, "").trim();
    }

    if (!itemThumbnailUrl) {
      itemThumbnailUrl = categoryPlaceholders[category] || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop";
    }

    const videoChoice = prefix === "digg" 
      ? verifyPoolDigg[stories.length % verifyPoolDigg.length]
      : verifyPoolCbs[stories.length % verifyPoolCbs.length];

    const viewsCount = Math.floor(Math.random() * 500000) + 120000;
    const trendingScore = Math.floor(Math.random() * 25) + 72;

    stories.push({
      id: `${prefix}-${stories.length + 1}`,
      title,
      summary,
      url: link,
      publishedAt,
      youtubeVideoId: videoChoice.id,
      youtubeVideoTitle: videoChoice.title,
      youtubeChannel: videoChoice.channel,
      viewsCount,
      trendingScore,
      category,
      itemThumbnailUrl
    });
  }

  return stories;
};

// Pure regex parser fallback in case browser parser fails on dirty XML blocks
const parseRssXmlRegexFallback = (xml: string, prefix: "digg" | "cbs"): Story[] => {
  const stories: Story[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  let index = 1;
  const limit = 10;
  
  const verifyPoolDigg = [
    { id: "gX3fAnY_1dI", title: "CBS Evening News Full Special Broadcast", channel: "CBS Evening News" },
    { id: "DQacCB9tDaw", title: "CBS News Financial Forecast & Market Report", channel: "CBS News Markets" },
    { id: "29ECwWrnzdQ", title: "60 Minutes: Behind the Scenes Investigative Report", channel: "60 Minutes" },
    { id: "vB-SAnAatgA", title: "CBS Mornings Interactive Correspondent Segment", channel: "CBS Mornings" },
    { id: "V_mepYmclHA", title: "Neuralink & Advanced BioTech Clinical Trials Update", channel: "CBS News Reports" }
  ];
  const verifyPoolCbs = [
    { id: "9S5R9K13mK0", title: "Omega Seamaster Ultra Deep Titanium Hands-On Review", channel: "Teddy Baldassarre" },
    { id: "gqK7i4Ncsis", title: "Porsche 911 S/T: The Best 911 Ever Built?", channel: "Top Gear" },
    { id: "bOWeeHdfm58", title: "Inside a Breathtaking Concrete Brutalist Escape", channel: "Never Too Small" },
    { id: "nUvV8tE-aSM", title: "Leica M11-D Rangefinder: No Screen, No Compromise", channel: "KaiManWong" },
    { id: "fcoiN7S3I8o", title: "The Ridge Wallet Upgrade: Heat-Torched Titanium & Carbon", channel: "EDC Weekly" }
  ];

  const categoryPlaceholders: Record<string, string> = {
    Cars: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&auto=format&fit=crop",
    Gear: "https://images.unsplash.com/photo-1585366119957-e5733f3998cd?w=600&auto=format&fit=crop",
    Tech: "https://images.unsplash.com/photo-1613521134141-f2d453aaad7d?w=600&auto=format&fit=crop",
    Style: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop",
    Shelter: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop",
    Vices: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop",
    Politics: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=600&auto=format&fit=crop",
    Finance: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop",
    "Space & Science": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop",
    "Climate & Environment": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop",
    "World News": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop",
    "Main News": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop"
  };

  while ((match = itemRegex.exec(xml)) !== null && index <= limit) {
    const itemXml = match[1];
    
    let title = "Headline";
    const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    title = title.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/gi, "$1").trim();
    title = title.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    title = decodeXmlEntities(title);

    // Robust regex link extraction: search link/guid, clean CDATA, support nested structures
    const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    let link = linkMatch ? linkMatch[1].trim() : "";
    const hrefMatch = itemXml.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (hrefMatch && (!link || !link.startsWith("http"))) {
      link = hrefMatch[1].trim();
    }
    link = link.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/gi, "$1").trim();
    link = link.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    link = decodeXmlEntities(link);
    if (!link || !link.startsWith("http")) {
      link = prefix === "digg" ? "https://www.cbsnews.com" : "https://uncrate.com";
    }

    const contentEncodedMatch = itemXml.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
    const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    let summary = "";
    if (contentEncodedMatch) {
       summary = contentEncodedMatch[1].trim();
    } else if (descMatch) {
       summary = descMatch[1].trim();
    }
    summary = summary.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/gi, "$1").trim();
    summary = summary.replace(/<!\[CDATA\[|\]\]>/g, "").trim();

    let imgFromHtml = "";
    const inlineImgMatch = summary.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (inlineImgMatch) {
      imgFromHtml = inlineImgMatch[1].trim();
    }

    summary = summary.replace(/<[^>]*>/g, "").trim();
    summary = summary.replace(/Visit\s+Uncrate\s+for\s+the\s+full\s+post\s*\.?/gi, "").trim();
    summary = decodeXmlEntities(summary);
    if (summary.length > 250) {
      summary = summary.slice(0, 247) + "...";
    }
    if (!summary) {
      summary = prefix === "digg" 
        ? "Access live coverage, videos, and multi-angle analysis directly from the cbsnews.com feed."
        : "Discover custom crafted high-performance gear, premium styles, classic luxury cars, and brutalist architectures curated by Uncrate.";
    }

    const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    let publishedAt = new Date().toISOString();
    if (pubDateMatch) {
      try {
        const parsedDate = new Date(pubDateMatch[1].trim());
        if (!isNaN(parsedDate.getTime())) {
          publishedAt = parsedDate.toISOString();
        }
      } catch {}
    }

    const categoryMatch = itemXml.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
    let category = categoryMatch ? categoryMatch[1].trim() : "";
    category = category.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    category = decodeXmlEntities(category);
    if (!category) {
      category = prefix === "digg" ? "Main News" : "Gear";
    } else if (prefix === "cbs") {
      const lowerCat = category.toLowerCase();
      if (lowerCat.includes("style") || lowerCat.includes("apparel") || lowerCat.includes("wear") || lowerCat.includes("shoes") || lowerCat.includes("boots") || lowerCat.includes("jacket") || lowerCat.includes("rings") || lowerCat.includes("watch") || lowerCat.includes("grooming")) {
        category = "Style";
      } else if (lowerCat.includes("car") || lowerCat.includes("automotive") || lowerCat.includes("motorcycle") || lowerCat.includes("vehicle") || lowerCat.includes("truck") || lowerCat.includes("rides") || lowerCat.includes("moto") || lowerCat.includes("ducati") || lowerCat.includes("yamaha") || lowerCat.includes("porsche")) {
        category = "Cars";
      } else if (lowerCat.includes("shelter") || lowerCat.includes("architecture") || lowerCat.includes("house") || lowerCat.includes("cabin") || lowerCat.includes("home") || lowerCat.includes("design") || lowerCat.includes("furniture") || lowerCat.includes("hotel")) {
        category = "Shelter";
      } else if (lowerCat.includes("tech") || lowerCat.includes("gadget") || lowerCat.includes("gear") || lowerCat.includes("tool") || lowerCat.includes("everyday carry") || lowerCat.includes("edc") || lowerCat.includes("audio") || lowerCat.includes("speaker") || lowerCat.includes("synth") || lowerCat.includes("software")) {
        category = "Tech";
      } else if (lowerCat.includes("vices") || lowerCat.includes("drink") || lowerCat.includes("smoke") || lowerCat.includes("whiskey") || lowerCat.includes("cigar") || lowerCat.includes("spirits") || lowerCat.includes("beer")) {
        category = "Vices";
      } else {
        category = "Gear";
      }
    }

    // Failsafe image/thumbnail extraction
    let itemThumbnailUrl = "";
    
    const mediaContentMatch = itemXml.match(/<[^:]+:content[^>]+url=["']([^"']+)["']/i) || itemXml.match(/<content[^>]+url=["']([^"']+)["']/i);
    const mediaThumbnailMatch = itemXml.match(/<[^:]+:thumbnail[^>]+url=["']([^"']+)["']/i) || itemXml.match(/<thumbnail[^>]+url=["']([^"']+)["']/i);
    const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
    
    if (mediaContentMatch) {
       itemThumbnailUrl = mediaContentMatch[1];
    } else if (mediaThumbnailMatch) {
       itemThumbnailUrl = mediaThumbnailMatch[1];
    } else if (enclosureMatch) {
       itemThumbnailUrl = enclosureMatch[1];
    } else if (imgFromHtml) {
       itemThumbnailUrl = imgFromHtml;
    } else if (imgMatch) {
       itemThumbnailUrl = imgMatch[1];
    }

    // Image tag fallback
    if (!itemThumbnailUrl) {
      const imageTagsMatch = itemXml.match(/<image[^>]*>([\s\S]*?)<\/image>/i);
      if (imageTagsMatch) {
        const innerUrlMatch = imageTagsMatch[1].match(/<url[^>]*>([\s\S]*?)<\/url>/i);
        if (innerUrlMatch) {
          itemThumbnailUrl = innerUrlMatch[1].trim();
        }
      }
    }

    // Hard scan image lookup
    if (!itemThumbnailUrl) {
      const anyImgUrlMatch = itemXml.match(/https?:\/\/[^"'\s<>]+?\.(?:jpe?g|png|gif|webp)(?:\?[^"'\s<>]+)?/i);
      if (anyImgUrlMatch) {
        itemThumbnailUrl = anyImgUrlMatch[0];
      }
    }

    if (itemThumbnailUrl) {
      itemThumbnailUrl = decodeXmlEntities(itemThumbnailUrl).replace(/['"]/g, "").trim();
    }

    if (!itemThumbnailUrl) {
      itemThumbnailUrl = categoryPlaceholders[category] || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop";
    }

    const videoChoice = prefix === "digg" 
      ? verifyPoolDigg[(index - 1) % verifyPoolDigg.length]
      : verifyPoolCbs[(index - 1) % verifyPoolCbs.length];

    const viewsCount = Math.floor(Math.random() * 500000) + 120000;
    const trendingScore = Math.floor(Math.random() * 25) + 72;

    stories.push({
      id: `${prefix}-${index}`,
      title,
      summary,
      url: link,
      publishedAt,
      youtubeVideoId: videoChoice.id,
      youtubeVideoTitle: videoChoice.title,
      youtubeChannel: videoChoice.channel,
      viewsCount,
      trendingScore,
      category,
      itemThumbnailUrl
    });
    
    index++;
  }
  return stories;
};

// Asynchronous non-blocking client-side YouTube search optimization
const optimizeStoriesYoutubeClient = async (
  stories: Story[], 
  setStoryGroup: (updater: (prev: Story[]) => Story[]) => void
) => {
  // Optimize top 5 stories in the background to keep it highly performant
  const storiesToOptimize = stories.slice(0, 5);
  for (const story of storiesToOptimize) {
    try {
      const query = (story.title || "").replace(/[^\w\s-]/g, "").trim().slice(0, 80);
      if (!query) continue;

      const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " CBS News")}`;
      const corsUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(corsUrl);
      if (!res.ok) continue;

      const html = await res.text();
      const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        let videoTitle = "CBS News Segment";
        const titleMatch = html.match(/"title":{"runs":\[{"text":"([^"]+)"/);
        if (titleMatch && titleMatch[1]) {
          videoTitle = titleMatch[1];
        }
        let channelName = "CBS News";
        const channelMatch = html.match(/"ownerText":{"runs":\[{"text":"([^"]+)"/);
        if (channelMatch && channelMatch[1]) {
          channelName = channelMatch[1];
        }

        // Apply clean state update
        setStoryGroup(prev => prev.map(s => {
          if (s.id === story.id) {
            return {
              ...s,
              youtubeVideoId: videoId,
              youtubeVideoTitle: videoTitle,
              youtubeChannel: channelName,
              youtubeThumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              videoUrl: `https://www.youtube.com/watch?v=${videoId}`
            };
          }
          return s;
        }));
      }
    } catch (err) {
      console.warn(`[Client background YT lookup failed for "${story.title}"]:`, err);
    }
  }
};

export default function App() {
  const [data, setData] = useState<DualFeedData | null>(() => {
    if (typeof window !== "undefined" && (window as any).__INITIAL_DATA__) {
      console.log("[Client] Loading hydration state from __INITIAL_DATA__");
      return (window as any).__INITIAL_DATA__;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined" && (window as any).__INITIAL_DATA__) {
      return false;
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | "digg" | "cbs" | "analytics" >("all");
  const [dataSource, setDataSource] = useState<string>(() => {
    if (typeof window !== "undefined" && (window as any).__INITIAL_DATA_SOURCE__) {
      return (window as any).__INITIAL_DATA_SOURCE__;
    }
    return "live-client-cors";
  });
  const [isDemoFallback, setIsDemoFallback] = useState<boolean>(() => {
    if (typeof window !== "undefined" && (window as any).__INITIAL_DATA_FALLBACK__) {
      return (window as any).__INITIAL_DATA_FALLBACK__;
    }
    return false;
  });

  // Client data compiler directly aligned with purely visual porting layout requirements
  const fetchStories = async (dateVal: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      
      if (dateVal === todayStr) {
        console.log("[Client] Processing matches for today's dynamic live indexing.");
        
        // Initial defaults using offline backup mappings to prevent empty states
        const offlineBaseline = getDynamicFallback(dateVal);
        let liveDigg: Story[] = [];
        let liveCbs: Story[] = [];

        // 1. Fetch live CBS News RSS feed with client CORS bypass
        try {
          const cbsNewsXml = await fetchWithProxy("https://www.cbsnews.com/latest/rss/main");
          liveDigg = parseRssXmlClient(cbsNewsXml, "digg");
        } catch (err) {
          console.warn("[Client] Live CBS compilation failed. Standard offline mapping engaged:", err);
        }

        // 2. Fetch live Uncrate RSS feed with client CORS bypass
        try {
          const uncrateXml = await fetchWithProxy("https://feeds.feedburner.com/uncrate");
          liveCbs = parseRssXmlClient(uncrateXml, "cbs");
        } catch (err) {
          console.warn("[Client] Live Uncrate-Gear compilation failed. Standard offline mapping engaged:", err);
        }

        if (liveDigg.length > 0 || liveCbs.length > 0) {
          const mergedDigg = liveDigg.length > 0 ? liveDigg : offlineBaseline.diggStories;
          const mergedCbs = liveCbs.length > 0 ? liveCbs : offlineBaseline.cbsStories;

          setData({
            diggStories: mergedDigg.slice(0, 10),
            cbsStories: mergedCbs.slice(0, 10),
            cutoffDate: `System Live Index - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          });
          setDataSource("live-client-cors");
          setIsDemoFallback(false);

          // Launch non-blocking background crawler lookup to ground active Youtube channels in real-time
          optimizeStoriesYoutubeClient(mergedDigg.slice(0, 10), (updater) => {
            setData(prev => prev ? { ...prev, diggStories: updater(prev.diggStories) } : null);
          });
          optimizeStoriesYoutubeClient(mergedCbs.slice(0, 10), (updater) => {
            setData(prev => prev ? { ...prev, cbsStories: updater(prev.cbsStories) } : null);
          });

          setIsLoading(false);
          return;
        }
      }

      // 3. Fallback date loader
      const offlineBaseline = getDynamicFallback(dateVal);
      setData({
        diggStories: offlineBaseline.diggStories.slice(0, 10),
        cbsStories: offlineBaseline.cbsStories.slice(0, 10),
        cutoffDate: offlineBaseline.cutoffDate,
      });
      setDataSource("demo-fallback");
      setIsDemoFallback(true);

    } catch (err: any) {
      console.error("[Client Compiler Fatal]", err);
      setError(err?.message || "Internal error compiling live content indexes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If the window has initial server pre-fetched live data, and the selected date is today's default, reuse it
    if (typeof window !== "undefined" && (window as any).__INITIAL_DATA__) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (selectedDate === todayStr) {
        console.log("[Client] Reusing pre-hydrated live dataset for query date:", selectedDate);
        return;
      }
    }
    fetchStories(selectedDate);
  }, [selectedDate]);

  // Apply search filtering
  const filterStories = (stories: Story[]) => {
    if (!searchTerm) return stories;
    const query = searchTerm.toLowerCase();
    return stories.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.summary.toLowerCase().includes(query) ||
        (s.category && s.category.toLowerCase().includes(query))
    );
  };

  const diggFiltered = data ? filterStories(data.diggStories) : [];
  const cbsFiltered = data ? filterStories(data.cbsStories) : [];

  // Simulate PDF download/export action
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F5F2ED] text-[#1A1A1A] font-serif overflow-x-hidden antialiased select-none">
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen">
        
        {/* 2. Top Header Block */}
        <header className="border-b border-[#1A1A1A] flex flex-col md:flex-row md:items-end justify-between px-6 md:px-10 py-6 gap-6 bg-[#EBE7E0]">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#E63946] text-[#F5F2ED] font-sans text-[10px] font-black uppercase tracking-widest">
                Trending Daily
              </span>
              <span className="text-[10px] font-sans font-extrabold text-[#1A1A1A]/60 tracking-wider">
                ISSUE #{selectedDate.replace(/-/g, "")}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-serif font-black uppercase leading-none tracking-tighter text-[#1A1A1A]">
              The Dual <span className="text-[#E63946] italic">Report</span>
            </h1>
            
            <p className="font-sans text-[11px] text-[#1A1A1A]/70 uppercase tracking-widest font-bold">
              cbsnews.com/latest/rss/main &bull;&nbsp;uncrate.com/feed &bull;&nbsp;Youtube Coverage
            </p>
          </div>

          {/* Interactive panel - date, refresh controls */}
          <div className="flex flex-wrap items-center gap-3 font-sans shrink-0">
            {/* Quick date picker - touch target h-11 = 44px min */}
            <div className="flex items-center border border-[#1A1A1A] bg-white h-11 px-3">
              <CalendarIcon className="h-4 w-4 mr-2 text-[#E63946]" />
              <input
                id="date-picker-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-black uppercase tracking-widest text-[#1A1A1A] focus:outline-none cursor-pointer h-full"
                max="2026-12-31"
                min="2026-05-01"
              />
            </div>

            {/* Manual refresh action */}
            <button
              id="btn-manual-refresh"
              onClick={() => fetchStories(selectedDate)}
              className="h-11 w-11 flex items-center justify-center border border-[#1A1A1A] bg-white hover:bg-[#EBE7E0] transition-colors"
              title="Re-query latest trending metrics"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 text-[#1A1A1A] ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

        </header>

        {/* 3. Filtering and search toolbar - with exact 44px touch target controls */}
        <section className="bg-white border-b border-[#1A1A1A] px-6 md:px-10 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Section view controllers */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Dual Column Feed", icon: BookOpen },
              { id: "digg", label: "CBS News Main Only", icon: Sparkles },
              { id: "cbs", label: "Uncrate Gear Only", icon: Newspaper },
              { id: "analytics", label: "Analytics & Charts", icon: Activity }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`tab-btn-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`h-11 px-4 flex items-center gap-2 border border-[#1A1A1A] font-sans text-xs font-extrabold uppercase tracking-widest transition-all ${
                    activeTab === tab.id
                      ? "bg-[#1A1A1A] text-[#F5F2ED] shadow-[2px_2px_0px_#E63946]"
                      : "bg-[#F5F2ED] text-[#1A1A1A] hover:bg-white"
                  }`}
                >
                  <TabIcon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Term Filter Input - touch target 44px min */}
          <div className="relative font-sans max-w-md w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </span>
            <input
              id="search-stories-input"
              type="text"
              placeholder="Search current day indexes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full pl-10 pr-4 text-xs font-bold uppercase tracking-wider text-[#1A1A1A] border border-[#1A1A1A] bg-[#F5F2ED] placeholder-slate-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1A1A1A] transition-all"
            />
            {searchTerm && (
              <button
                className="absolute inset-y-0 right-0 flex items-center pr-3 font-sans text-[10px] font-black text-slate-400 hover:text-[#1A1A1A]"
                onClick={() => setSearchTerm("")}
              >
                Clear
              </button>
            )}
          </div>

        </section>

        {/* 4. Archive Cutoff & Feed Metadata Info */}
        <section className="bg-[#EBE7E0]/60 border-b border-[#1A1A1A]/20 px-6 md:px-10 py-3 text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-2 font-sans tracking-wide">
          <div className="flex flex-wrap items-center gap-2 text-slate-600">
            <span className="font-bold uppercase text-[10px] tracking-wider text-[#1A1A1A]/60">Verified Archive Base Date:</span>
            <span className="font-extrabold uppercase bg-white border border-[#1A1A1A]/20 px-1.5 py-0.5 text-[#E63946] text-[10px]">
              {data?.cutoffDate || "Previous Day 23:59"}
            </span>
            {isDemoFallback && (
              <span className="px-2 py-0.5 bg-[#FFF9E6] border border-[#F5A623]/20 text-[#D08000] font-sans text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Static Deployment Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Query Date: <strong className="text-[#1A1A1A]">{selectedDate}</strong></span>
          </div>
        </section>

        {/* 5. Main Content Deck */}
        <div className="flex-1 p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <RefreshCw className="h-10 w-10 text-[#E63946] animate-spin" />
              <p className="font-serif italic text-lg text-slate-500 animate-pulse">
                Assembling dual sources... querying search grounding indexes...
              </p>
            </div>
          ) : error ? (
            <div className="border border-[#1A1A1A] bg-white p-8 shadow-[4px_4px_0_#1A1A1A] max-w-xl mx-auto text-center space-y-4">
              <h3 className="font-serif text-xl font-black text-[#E63946]">Failed to Assemble Intelligence Grid</h3>
              <p className="text-sm font-serif italic">"{error}"</p>
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setSelectedDate("2026-06-01")}
                  className="h-11 px-6 border border-[#1A1A1A] bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  Reset To June 1st Baseline
                </button>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Filter warning if search has zero matching reports */}
              {searchTerm && diggFiltered.length === 0 && cbsFiltered.length === 0 && (
                <div className="border border-dashed border-[#1A1A1A]/40 bg-[#EBE7E0]/30 p-8 text-center font-serif italic text-slate-500">
                  No editorial summaries found matching term "{searchTerm}". Try another search term.
                </div>
              )}

              {/* CORE FEED DISPATCH DISPLAY */}
              {activeTab === "all" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Left Column: CBS Main News */}
                  <div className="space-y-6">
                    <div className="h-14 bg-[#1A1A1A] border border-[#1A1A1A] flex items-center justify-between px-6 text-[#F5F2ED] shadow-[2px_2px_0px_rgba(0,0,0,0.15)]">
                      <h2 className="uppercase font-serif italic font-extrabold tracking-widest text-sm text-[#F5F2ED] flex items-center gap-2">
                        <span className="text-[#E63946] font-sans font-black not-italic text-base">01.</span>
                        CBS News / Main Headlines
                      </h2>
                      <span className="font-sans text-[10px] font-black uppercase tracking-widest bg-[#E63946] px-2 py-0.5 text-white">
                        LATEST GLOBAL FEED
                      </span>
                    </div>

                    <div className="space-y-6">
                      {diggFiltered.map((story, idx) => (
                        <StoryCard key={story.id} story={story} index={idx} />
                      ))}
                      {diggFiltered.length === 0 && !searchTerm && (
                        <p className="text-sm italic text-slate-400 font-serif">No CBS Main stories available.</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: CBS News */}
                  <div className="space-y-6">
                    <div className="h-14 bg-white border border-[#1A1A1A] flex items-center justify-between px-6 text-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
                      <h2 className="uppercase font-serif italic font-extrabold tracking-widest text-sm text-[#1A1A1A] flex items-center gap-2">
                        <span className="text-slate-400 font-sans font-black not-italic text-base">02.</span>
                        Uncrate Gear & Style Buyers Guide
                      </h2>
                      <span className="font-sans text-[10px] font-black uppercase tracking-widest bg-[#1A1A1A] px-2 py-0.5 text-white">
                        LATEST DAILY FEED
                      </span>
                    </div>

                    <div className="space-y-6">
                      {cbsFiltered.map((story, idx) => (
                        <StoryCard key={story.id} story={story} index={idx} />
                      ))}
                      {cbsFiltered.length === 0 && !searchTerm && (
                        <p className="text-sm italic text-slate-400 font-serif">No Uncrate stories available.</p>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* SINGLE FOCUS VIEWPORT: CBS MAIN NEWS */}
              {activeTab === "digg" && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="h-14 bg-[#1A1A1A] border border-[#1A1A1A] flex items-center justify-between px-6 text-[#F5F2ED] shadow-[3px_3px_0px_#E63946]">
                    <h2 className="uppercase font-serif italic font-extrabold tracking-widest text-sm text-[#F5F2ED]">
                      01. CBS News Main Headlines Spotlight (Top 10)
                    </h2>
                    <span className="font-sans text-[10px] font-black bg-[#E63946] px-2.5 py-0.5 text-white uppercase">
                      Global & National
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {diggFiltered.map((story, idx) => (
                      <StoryCard key={story.id} story={story} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* SINGLE FOCUS VIEWPORT: CBS NEWS */}
              {activeTab === "cbs" && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="h-14 bg-white border border-[#1A1A1A] flex items-center justify-between px-6 text-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A]">
                    <h2 className="uppercase font-serif italic font-extrabold tracking-widest text-sm text-[#1A1A1A]">
                      02. Uncrate Gear Spotlight Feed (Top 10)
                    </h2>
                    <span className="font-sans text-[10px] font-black bg-[#1A1A1A] px-2.5 py-0.5 text-white uppercase">
                      Gear & Style
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cbsFiltered.map((story, idx) => (
                      <StoryCard key={story.id} story={story} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* COMPARATIVE METRICS & CHARTS TAB VIEW */}
              {activeTab === "analytics" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border border-[#1A1A1A] bg-[#EBE7E0] p-6 shadow-[3px_3px_0px_#1A1A1A] mb-4">
                    <h2 className="font-serif text-2xl font-black uppercase text-[#1A1A1A] mb-1">
                      Aggregated Story Visualizer Metrics
                    </h2>
                    <p className="font-serif italic text-sm text-slate-600">
                      Comparing publisher reach parameters, story strength scores, and cross-source topic category distributions.
                    </p>
                  </div>
                  <AnalyticsPanel
                    diggStories={data.diggStories}
                    cbsStories={data.cbsStories}
                  />
                </div>
              )}

              {/* Automated Reading Suggestions with Real-Time Web Search Grounding */}
              <RssSuggestionsList
                diggStories={data.diggStories}
                cbsStories={data.cbsStories}
              />
            </>
          ) : null}

        </div>

        {/* 7. Footer Status Bar - exact "Artistic Flair" styling colors & tags */}
        <footer className="h-16 mt-auto border-t border-[#1A1A1A] bg-[#1A1A1A] text-[#F5F2ED] flex items-center justify-between px-6 md:px-10 gap-8 font-sans">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase tracking-widest font-black text-[#F5F2ED]">
              The Daily Digest
            </span>
          </div>

          <div className="text-[9px] uppercase tracking-[0.25em] text-center opacity-50 block truncate max-w-md">
            Source: CBSNews.com Main & Uncrate RSS &bull; YouTube Embed API
          </div>

          {/* Trigger Touch Targets: 44px min */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              id="btn-trigger-pdf-print"
              onClick={handleExportPDF}
              className="px-4 h-10 bg-[#F5F2ED] text-[#1A1A1A] font-sans font-black text-[10px] uppercase tracking-widest border border-[#1A1A1A] transition-colors hover:bg-[#EBE7E0] active:translate-y-0.5"
            >
              Print Digest
            </button>
          </div>
        </footer>

      </main>

    </div>
  );
}
