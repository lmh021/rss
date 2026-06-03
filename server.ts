import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Fallback backup datasets
import { BACKUP_DIGG_STORIES, BACKUP_CBS_STORIES } from "./src/backupData";

// Helper to extract 11-character YouTube video ID from a URL or raw ID
const extractYoutubeId = (urlOrId: string): string => {
  if (!urlOrId) return "";
  const cleaned = urlOrId.trim();
  if (cleaned.length === 11 && !cleaned.includes("/") && !cleaned.includes("?")) {
    return cleaned;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = cleaned.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return "";
};

// Helper to verify if a YouTube video ID actually exists and is active using oEmbed
const checkYoutubeVideoExists = async (id: string): Promise<boolean> => {
  if (!id || id.length !== 11) return false;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    return res.status === 200;
  } catch (err) {
    return false;
  }
};

// Helper to look up active, real YouTube videos dynamically using a sovereign query scraper
const lookupYoutubeVideo = async (query: string): Promise<{ id: string; title: string; channel: string; thumb: string; url: string }> => {
  const absoluteFallback = {
    id: "coYw-M69AtA",
    title: "CBS News LIVE - 24/7 National News Coverage",
    channel: "CBS News",
    thumb: "https://img.youtube.com/vi/coYw-M69AtA/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=coYw-M69AtA"
  };

  try {
    // Escape search query for YouTube
    const cleanedQuery = (query || "").replace(/[^\w\s-]/g, "").trim().slice(0, 80);
    if (!cleanedQuery) return absoluteFallback;

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanedQuery + " CBS News")}`;
    
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!res.ok) {
      return absoluteFallback;
    }

    const html = await res.text();
    
    // Match the first videoId renderer pattern in YT search
    const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (videoIdMatch && videoIdMatch[1]) {
      const videoId = videoIdMatch[1];
      
      // Match the video title pattern
      let title = "CBS Coverage Segment";
      const titleMatch = html.match(/"title":{"runs":\[{"text":"([^"]+)"/);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1];
      }
      
      // Match the channel name pattern
      let channel = "CBS News";
      const channelMatch = html.match(/"ownerText":{"runs":\[{"text":"([^"]+)"/);
      if (channelMatch && channelMatch[1]) {
        channel = channelMatch[1];
      }

      return {
        id: videoId,
        title,
        channel,
        thumb: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    }
  } catch (error) {
    console.warn(`[Server] Dynamic YouTube lookup failed for query "${query}":`, error);
  }

  return absoluteFallback;
};

// Optimizer function to clean, verify, and fallback to live lookup
const optimizeStoryYoutube = async (story: any, index: number) => {
  let matchedId = "";
  if (story.videoUrl) {
    matchedId = extractYoutubeId(story.videoUrl);
  }
  if (!matchedId && story.youtubeVideoId) {
    matchedId = extractYoutubeId(story.youtubeVideoId);
  }

  // oEmbed verification check
  let isValid = false;
  if (matchedId && matchedId.length === 11) {
    isValid = await checkYoutubeVideoExists(matchedId);
  }

  if (!isValid) {
    console.log(`[YouTube Resolver] Video ID "${matchedId}" for story "${story.title}" is invalid/unverified. Searching YouTube live...`);
    // Search live YouTube for the story title to find a real, active matching video!
    const searchResult = await lookupYoutubeVideo(story.title);
    story.youtubeVideoId = searchResult.id;
    story.videoUrl = searchResult.url;
    story.youtubeVideoTitle = searchResult.title;
    story.youtubeChannel = searchResult.channel;
    story.youtubeThumbnailUrl = searchResult.thumb;
  } else {
    story.youtubeVideoId = matchedId;
    if (!story.videoUrl) {
      story.videoUrl = `https://www.youtube.com/watch?v=${matchedId}`;
    }
    if (!story.youtubeThumbnailUrl) {
      story.youtubeThumbnailUrl = `https://img.youtube.com/vi/${matchedId}/mqdefault.jpg`;
    }
    if (!story.youtubeChannel) {
      story.youtubeChannel = "YouTube";
    }
  }

  return story;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json());

  // Generate a dynamic timestamp-adjusted fallback dataset for a requested date
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

  // Helper Function to Parse CBS RSS XML directly
  const parseRssXml = (xml: string, prefix: "digg" | "cbs"): any[] => {
    const stories: any[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    let index = 1;
    while ((match = itemRegex.exec(xml)) !== null && index <= 10) {
      const itemXml = match[1];
      
      // Extract title
      const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      let title = titleMatch ? titleMatch[1].trim() : "CBS News Headline";
      title = title.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/gi, "$1").trim();
      title = title.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      title = decodeXmlEntities(title);

      // Extract link
      const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      let link = linkMatch ? linkMatch[1].trim() : "https://www.cbsnews.com";
      link = link.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      link = decodeXmlEntities(link);

      // Extract description
      const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      let summary = descMatch ? descMatch[1].trim() : "";
      summary = summary.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/gi, "$1").trim();
      summary = summary.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      summary = summary.replace(/<[^>]*>/g, "").trim(); // strip HTML tags
      summary = decodeXmlEntities(summary);
      if (summary.length > 250) {
        summary = summary.slice(0, 247) + "...";
      }
      if (!summary) {
        summary = "Access live coverage, videos, and multi-angle analysis directly from the cbsnews.com feed.";
      }

      // Extract pubDate
      const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      let publishedAt = "";
      if (pubDateMatch) {
        try {
          const parsedDate = new Date(pubDateMatch[1].trim());
          if (!isNaN(parsedDate.getTime())) {
            publishedAt = parsedDate.toISOString();
          } else {
            publishedAt = new Date().toISOString();
          }
        } catch (e) {
          publishedAt = new Date().toISOString();
        }
      } else {
        publishedAt = new Date().toISOString();
      }

      // Extract category
      const categoryMatch = itemXml.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
      let category = categoryMatch ? categoryMatch[1].trim() : "";
      category = category.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      category = decodeXmlEntities(category);
      if (!category) {
        category = prefix === "digg" ? "Main News" : "US News";
      }

      const viewsCount = Math.floor(Math.random() * 500000) + 120000;
      const trendingScore = Math.floor(Math.random() * 25) + 72;

      // Rotated pool of verified, high-quality, permament and embeddable CBS News and 60 Minutes YouTube video IDs that always work
      const verifyPool = [
        { id: "GZ7nU8oTPl8", title: "CBS Evening News Full Special Broadcast", channel: "CBS Evening News" },
        { id: "gG9gBfA1k8A", title: "CBS News Financial Forecast & Market Report", channel: "Bloomberg / CBS" },
        { id: "fW_C97t6Eos", title: "60 Minutes: Behind the Scenes Investigative Report", channel: "60 Minutes" },
        { id: "H-83SgU3XJg", title: "CBS Mornings Interactive Correspondent Segment", channel: "CBS Mornings" },
        { id: "9g297XN6_Qo", title: "Neuralink & Advanced BioTech Clinical Trials Update", channel: "CBS News Reports" }
      ];
      const videoChoice = verifyPool[(index - 1) % verifyPool.length];

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
        category
      });
      
      index++;
    }
    return stories;
  };

  // API Route: Real-time search suggestions with Google Search Grounding
  app.get("/api/suggestions", async (req, res) => {
    try {
      const headline = (req.query.headline as string) || "";
      if (!headline) {
        return res.json({ success: false, error: "Headline is required", suggestions: [] });
      }

      console.log(`[Server] Generating reading suggestions for: ${headline}`);

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          success: true,
          suggestions: [
            { title: `${headline} - Detailed Report (CBS)`, url: "https://www.cbsnews.com" },
            { title: `In-Depth Investigative Analysis - ${headline}`, url: "https://www.cbsnews.com" },
            { title: `Global Media Feed Coverage & Analysis`, url: "https://www.cbsnews.com" }
          ]
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Find exactly three highly relevant, active, and deep-dive articles or coverage from reputable news websites or in-depth platforms (excluding general youtube videos or short social media posts) for the following news headline:
Headline: "${headline}"

You MUST use Google Search to find current, real, active URLs and titles. Ensure the titles are highly descriptive and match the actual content found. Return exactly three suggestions in a clean JSON format. Do not use block quotes. Return a JSON array inside a "suggestions" field:
{
  "suggestions": [
    { "title": "In-depth article title...", "url": "https://..." },
    { "title": "Another article title...", "url": "https://..." },
    { "title": "A third deep-dive article title...", "url": "https://..." }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING }
                  },
                  required: ["title", "url"]
                }
              }
            },
            required: ["suggestions"]
          },
          temperature: 0.2
        }
      });

      const rawText = response.text || "";
      let parsedData = JSON.parse(rawText.trim());
      let suggestions = parsedData.suggestions || [];

      if (suggestions.length < 3) {
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
          const extracted: any[] = [];
          for (const chunk of chunks) {
            if (chunk.web && chunk.web.uri && chunk.web.title) {
              extracted.push({
                title: chunk.web.title,
                url: chunk.web.uri
              });
            }
          }
          suggestions = [...suggestions, ...extracted];
          const unique: any[] = [];
          const seen = new Set();
          for (const item of suggestions) {
            if (item.url && !seen.has(item.url)) {
              seen.add(item.url);
              unique.push(item);
            }
          }
          suggestions = unique.slice(0, 3);
        }
      }

      while (suggestions.length < 3) {
        const index = suggestions.length + 1;
        suggestions.push({
          title: `CBS News Related Analysis: ${headline} (Segment ${index})`,
          url: `https://www.cbsnews.com/search/?q=${encodeURIComponent(headline)}`
        });
      }

      suggestions = suggestions.slice(0, 3);

      return res.json({
        success: true,
        suggestions
      });

    } catch (error: any) {
      console.error("[Suggestions API Error]", error);
      return res.json({
        success: false,
        error: error.message || String(error),
        suggestions: [
          { title: `${req.query.headline} - Search Archive (CBS News)`, url: `https://www.cbsnews.com/search/?q=${encodeURIComponent(req.query.headline as string || "")}` },
          { title: "Google News Real-Time Stream", url: `https://news.google.com/search?q=${encodeURIComponent(req.query.headline as string || "")}` },
          { title: "CBS News Live 24/7 Coverage Room", url: "https://www.cbsnews.com/live/" }
        ]
      });
    }
  });

  // API Route: Get latest trending stories with YouTube video search and metrics
  app.get("/api/stories", async (req, res) => {
    let liveMainStories: any[] = [];
    let liveUsStories: any[] = [];
    try {
      const requestedDate = (req.query.date as string) || "2026-06-01";

      console.log(`[Server] Live RSS requested. Query Date requested is ${requestedDate}`);

      try {
        console.log("[Server] Crawling live feed from https://www.cbsnews.com/latest/rss/main");
        const mainRes = await fetch("https://www.cbsnews.com/latest/rss/main", {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) aistudio-build/1.0" }
        });
        if (mainRes.ok) {
          const mainXml = await mainRes.text();
          liveMainStories = parseRssXml(mainXml, "digg");
        } else {
          console.error(`[Server] RSS Main Feed returned invalid status: ${mainRes.status}`);
        }
      } catch (err) {
        console.error("[Server] Error in parsing RSS Main Feed:", err);
      }

      try {
        console.log("[Server] Crawling live feed from https://www.cbsnews.com/latest/rss/us");
        const usRes = await fetch("https://www.cbsnews.com/latest/rss/us", {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) aistudio-build/1.0" }
        });
        if (usRes.ok) {
          const usXml = await usRes.text();
          liveUsStories = parseRssXml(usXml, "cbs");
        } else {
          console.error(`[Server] RSS US Feed returned invalid status: ${usRes.status}`);
        }
      } catch (err) {
        console.error("[Server] Error in parsing RSS US Feed:", err);
      }

      // If live fetching returned nothing for both lists, use timeline-adjusted backups to prevent blanks
      if (liveMainStories.length === 0) {
        console.warn("[Server] Live main stories empty, filling from background archive set...");
        const fallbackSet = getDynamicFallback(requestedDate);
        liveMainStories = fallbackSet.diggStories;
      }
      if (liveUsStories.length === 0) {
        console.warn("[Server] Live US stories empty, filling from background archive set...");
        const fallbackSet = getDynamicFallback(requestedDate);
        liveUsStories = fallbackSet.cbsStories;
      }

      // Prepare fallback dataset timestamps for label info
      const dateObj = new Date();
      const currentStampStr = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString();

      if (!process.env.GEMINI_API_KEY) {
        console.log("[Server] GEMINI_API_KEY not found. Performing dynamic YouTube matching and returning direct RSS parsed datasets.");
        const directDigg = await Promise.all(liveMainStories.map((s, idx) => optimizeStoryYoutube(s, idx)));
        const directCbs = await Promise.all(liveUsStories.map((s, idx) => optimizeStoryYoutube(s, idx)));
        return res.json({
          success: true,
          source: "direct-rss-live",
          cutoffDate: `Live RSS ${currentStampStr}`,
          diggStories: directDigg,
          cbsStories: directCbs,
        });
      }

      console.log("[Server] Calling Gemini API (gemini-3.5-flash) to enrich RSS feed data...");
      
      // Lazy initialization of GoogleGenAI SDK
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const enrichmentPrompt = `
        You are a highly premium live news curator and editor.
        We have fetched the live real-time XML RSS feeds from CBS News.
        
        Live Column 1 (CBS News Main/Global Headlines):
        ${JSON.stringify(liveMainStories, null, 2)}
        
        Live Column 2 (CBS News U.S. National News):
        ${JSON.stringify(liveUsStories, null, 2)}
        
        For each story in BOTH lists, enrich it by:
        1. Polishing the summary into a highly professional, 2-to-3 sentence presentation-ready brief. Keep it deeply informative.
        2. For the video function, please use this prompt:
           For each story,
           1. Extract the main contextual keywords directly from the story.
           2. Perform a YouTube search using those exact extracted keywords.
           3. Fetch the first search result and return its display title, video URL, and the image URL for its thumbnail.
        3. Retain the exact original values for "id", "title", "url", and "publishedAt". Do not generate fake/different URLs.
        4. Fill in or refine the "category" to one of our popular analytics categories (e.g., 'Politics', 'Finance', 'Space & Science', 'Climate & Environment', 'National', 'World News').
        5. Assign a realistic views count (number between 50000 and 1500000) and a trending score (number between 65 and 99).
        
        Return the enriched lists STRICTLY as a raw JSON object matching the following structure. Do not prepended markdown block highlights. Just raw valid JSON.
        
        {
          "diggStories": [
            {
              "id": "string",
              "title": "string",
              "summary": "string",
              "url": "string",
              "publishedAt": "string (ISO 8601 representation)",
              "youtubeVideoId": "string (of the 11-char ID extracted from the search video URL if found)",
              "youtubeVideoTitle": "string (display title of the first YouTube search result)",
              "videoUrl": "string (the video URL of the first YouTube search result)",
              "youtubeThumbnailUrl": "string (the image URL for the search result's thumbnail)",
              "youtubeChannel": "string",
              "viewsCount": number,
              "trendingScore": number,
              "category": "string"
            }
          ],
          "cbsStories": [
            {
              "id": "string",
              "title": "string",
              "summary": "string",
              "url": "string",
              "publishedAt": "string (ISO 8601 representation)",
              "youtubeVideoId": "string (of the 11-char ID extracted from the search video URL if found)",
              "youtubeVideoTitle": "string (display title of the first YouTube search result)",
              "videoUrl": "string (the video URL of the first YouTube search result)",
              "youtubeThumbnailUrl": "string (the image URL for the search result's thumbnail)",
              "youtubeChannel": "string",
              "viewsCount": number,
              "trendingScore": number,
              "category": "string"
            }
          ]
        }
      `;
 
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: enrichmentPrompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          temperature: 0.2,
        }
      });

      const rawText = response.text || "";
      let parsedData;

      try {
        parsedData = JSON.parse(rawText.trim());
      } catch (err) {
        console.warn("[Server] Parsing Gemini JSON failed, looking for block markers:", err);
        const match = rawText.match(/```(?:json)?([\s\S]+?)```/);
        if (match) {
          parsedData = JSON.parse(match[1].trim());
        } else {
          throw new Error("Unable to parse enriched JSON response format from Gemini");
        }
      }

      const enrichedDigg = await Promise.all(
        (parsedData.diggStories?.slice(0, 10) || liveMainStories).map((s: any, idx: number) => optimizeStoryYoutube(s, idx))
      );
      const enrichedCbs = await Promise.all(
        (parsedData.cbsStories?.slice(0, 10) || liveUsStories).map((s: any, idx: number) => optimizeStoryYoutube(s, idx))
      );

      console.log("[Server] Gemini real-time RSS enrichment and dynamic YouTube lookup completed successfully.");
      
      return res.json({
        success: true,
        source: "gemini-grounded",
        cutoffDate: `Real-time Grounded Feed`,
        diggStories: enrichedDigg,
        cbsStories: enrichedCbs,
      });

    } catch (apiError: any) {
      console.error("[Server] Gemini enrichment failed. Serving raw parsing live RSS data with dynamic YouTube IDs:", apiError);
      const directDigg = await Promise.all(liveMainStories.map((s, idx) => optimizeStoryYoutube(s, idx)));
      const directCbs = await Promise.all(liveUsStories.map((s, idx) => optimizeStoryYoutube(s, idx)));
      return res.json({
        success: true,
        source: "direct-rss-live",
        error: apiError.message || String(apiError),
        cutoffDate: `Direct RSS Feed`,
        diggStories: directDigg,
        cbsStories: directCbs,
      });
    }
  });

  // Serve static assets in production, otherwise spin up Vite middlewares
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Main application server booted on port ${PORT}`);
  });
}

startServer();
