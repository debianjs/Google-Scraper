import puppeteer from "@cloudflare/puppeteer";

/**
 * Google Scraper API for Cloudflare Workers
 * Extracts comprehensive data from Google search results including:
 * - Titles, descriptions, URLs
 * - Images with metadata
 * - Videos with thumbnails
 * - Featured snippets
 * - Knowledge panels
 * - Related searches
 * - Site icons/favicons
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (pathname === "/" || pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "Google Scraper API",
          version: "1.0.0",
          endpoints: [
            "/search?q=query - Search Google and extract all data",
            "/images?q=query - Search Google Images",
            "/videos?q=query - Search Google Videos",
            "/news?q=query - Search Google News",
            "/health - Health check",
          ],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Search endpoint
    if (pathname === "/search") {
      const query = url.searchParams.get("q");
      if (!query) {
        return new Response(
          JSON.stringify({ error: "Missing query parameter 'q'" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        const results = await scrapeGoogleSearch(query, env);
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Images endpoint
    if (pathname === "/images") {
      const query = url.searchParams.get("q");
      if (!query) {
        return new Response(
          JSON.stringify({ error: "Missing query parameter 'q'" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        const results = await scrapeGoogleImages(query, env);
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Videos endpoint
    if (pathname === "/videos") {
      const query = url.searchParams.get("q");
      if (!query) {
        return new Response(
          JSON.stringify({ error: "Missing query parameter 'q'" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        const results = await scrapeGoogleVideos(query, env);
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // News endpoint
    if (pathname === "/news") {
      const query = url.searchParams.get("q");
      if (!query) {
        return new Response(
          JSON.stringify({ error: "Missing query parameter 'q'" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        const results = await scrapeGoogleNews(query, env);
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 404 for unknown endpoints
    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};

/**
 * Scrape Google Search results
 */
async function scrapeGoogleSearch(query, env) {
  const browser = await puppeteer.launch(env.MYBROWSER);
  const page = await browser.newPage();

  try {
    // Set user agent to avoid detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate to Google search
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
    await page.goto(searchUrl, { waitUntil: "networkidle0", timeout: 30000 });

    // Wait for results to load
    await page.waitForSelector("#search", { timeout: 10000 });

    // Extract all data
    const data = await page.evaluate(() => {
      const results = {
        query: document.querySelector('input[name="q"]')?.value || "",
        searchInfo: {},
        organicResults: [],
        featuredSnippet: null,
        knowledgePanel: null,
        peopleAlsoAsk: [],
        relatedSearches: [],
        images: [],
        videos: [],
        news: [],
        siteLinks: [],
      };

      // Search info (number of results, time)
      const searchStats = document.querySelector("#result-stats");
      if (searchStats) {
        results.searchInfo.text = searchStats.textContent.trim();
      }

      // Organic search results
      const organicElements = document.querySelectorAll(".g, .Gx5Zad");
      organicElements.forEach((element) => {
        const titleElement = element.querySelector("h3");
        const linkElement = element.querySelector("a");
        const snippetElement = element.querySelector(".VwiC3b, .yXK7lf, .s");
        const faviconElement = element.querySelector("img[src*='favicon']");

        if (titleElement && linkElement) {
          results.organicResults.push({
            title: titleElement.textContent.trim(),
            url: linkElement.href,
            displayUrl: element.querySelector("cite")?.textContent.trim() || "",
            snippet: snippetElement?.textContent.trim() || "",
            favicon: faviconElement?.src || null,
          });
        }
      });

      // Featured snippet
      const featuredSnippetElement = document.querySelector(".xpdopen, .kp-blk, .IZ6rdc");
      if (featuredSnippetElement) {
        const snippetTitle = featuredSnippetElement.querySelector("h3, .LC20lb");
        const snippetText = featuredSnippetElement.querySelector(".hgKElc, .X5LH0c");
        const snippetLink = featuredSnippetElement.querySelector("a");

        results.featuredSnippet = {
          title: snippetTitle?.textContent.trim() || "",
          text: snippetText?.textContent.trim() || "",
          url: snippetLink?.href || "",
        };
      }

      // Knowledge panel
      const knowledgePanelElement = document.querySelector(".kp-wholepage, .knowledge-panel");
      if (knowledgePanelElement) {
        const title = knowledgePanelElement.querySelector(".qrShPb, h2")?.textContent.trim();
        const subtitle = knowledgePanelElement.querySelector(".wwUB2c")?.textContent.trim();
        const description = knowledgePanelElement.querySelector(".kno-rdesc span")?.textContent.trim();
        const image = knowledgePanelElement.querySelector("g-img img, .kno-ibrg img")?.src;

        results.knowledgePanel = {
          title: title || "",
          subtitle: subtitle || "",
          description: description || "",
          image: image || null,
          facts: [],
        };

        // Extract facts from knowledge panel
        const factElements = knowledgePanelElement.querySelectorAll(".rVusze, .wDYxhc");
        factElements.forEach((fact) => {
          const label = fact.querySelector(".w8qArf")?.textContent.trim();
          const value = fact.querySelector(".kno-fv")?.textContent.trim();
          if (label && value) {
            results.knowledgePanel.facts.push({ label, value });
          }
        });
      }

      // People Also Ask
      const paaElements = document.querySelectorAll(".related-question-pair, .JolIg");
      paaElements.forEach((element) => {
        const question = element.querySelector(".CSkcDe, span")?.textContent.trim();
        if (question) {
          results.peopleAlsoAsk.push({ question });
        }
      });

      // Related searches
      const relatedElements = document.querySelectorAll(".k8XOCe, .s75CSd");
      relatedElements.forEach((element) => {
        const text = element.textContent.trim();
        const link = element.closest("a")?.href;
        if (text && link) {
          results.relatedSearches.push({ text, url: link });
        }
      });

      // Images in search results
      const imageElements = document.querySelectorAll("g-img img, .ivg-i img");
      imageElements.forEach((img, index) => {
        if (index < 20) {
          // Limit to first 20 images
          results.images.push({
            src: img.src,
            alt: img.alt || "",
            width: img.naturalWidth || null,
            height: img.naturalHeight || null,
          });
        }
      });

      // Video results
      const videoElements = document.querySelectorAll(".RzdJxc, .VibNM");
      videoElements.forEach((element) => {
        const title = element.querySelector("h3")?.textContent.trim();
        const link = element.querySelector("a")?.href;
        const thumbnail = element.querySelector("img")?.src;
        const duration = element.querySelector(".J1mWY")?.textContent.trim();
        const source = element.querySelector(".Zg1NU")?.textContent.trim();

        if (title && link) {
          results.videos.push({
            title,
            url: link,
            thumbnail: thumbnail || null,
            duration: duration || null,
            source: source || "",
          });
        }
      });

      // News results
      const newsElements = document.querySelectorAll(".SoaBEf, .WlydOe");
      newsElements.forEach((element) => {
        const title = element.querySelector(".mCBkyc, .n0jPhd")?.textContent.trim();
        const link = element.querySelector("a")?.href;
        const source = element.querySelector(".NUnG9d span, .CEMjEf")?.textContent.trim();
        const time = element.querySelector(".OSrXXb, .WG9SHc span")?.textContent.trim();
        const snippet = element.querySelector(".GI74Re, .Y3v8qd")?.textContent.trim();

        if (title && link) {
          results.news.push({
            title,
            url: link,
            source: source || "",
            time: time || "",
            snippet: snippet || "",
          });
        }
      });

      // Site links (additional links from main result)
      const siteLinkElements = document.querySelectorAll(".usJj9c");
      siteLinkElements.forEach((element) => {
        const title = element.querySelector("h3")?.textContent.trim();
        const link = element.querySelector("a")?.href;
        const snippet = element.querySelector(".s")?.textContent.trim();

        if (title && link) {
          results.siteLinks.push({
            title,
            url: link,
            snippet: snippet || "",
          });
        }
      });

      return results;
    });

    await browser.close();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Scrape Google Images
 */
async function scrapeGoogleImages(query, env) {
  const browser = await puppeteer.launch(env.MYBROWSER);
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&hl=en`;
    await page.goto(searchUrl, { waitUntil: "networkidle0", timeout: 30000 });

    // Scroll to load more images
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });

    const data = await page.evaluate(() => {
      const images = [];
      const imageElements = document.querySelectorAll("img");

      imageElements.forEach((img) => {
        // Filter out small images (likely icons or UI elements)
        if (img.naturalWidth > 100 && img.naturalHeight > 100) {
          const container = img.closest("a");
          images.push({
            src: img.src,
            thumbnail: img.src,
            alt: img.alt || "",
            width: img.naturalWidth,
            height: img.naturalHeight,
            link: container?.href || "",
          });
        }
      });

      return {
        query: document.querySelector('input[name="q"]')?.value || "",
        totalImages: images.length,
        images: images.slice(0, 50), // Limit to 50 images
      };
    });

    await browser.close();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Scrape Google Videos
 */
async function scrapeGoogleVideos(query, env) {
  const browser = await puppeteer.launch(env.MYBROWSER);
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=vid&hl=en`;
    await page.goto(searchUrl, { waitUntil: "networkidle0", timeout: 30000 });

    await page.waitForSelector(".g", { timeout: 10000 });

    const data = await page.evaluate(() => {
      const videos = [];
      const videoElements = document.querySelectorAll(".g");

      videoElements.forEach((element) => {
        const title = element.querySelector("h3")?.textContent.trim();
        const link = element.querySelector("a")?.href;
        const thumbnail = element.querySelector("img")?.src;
        const source = element.querySelector(".UPmit")?.textContent.trim();
        const duration = element.querySelector(".J1mWY")?.textContent.trim();
        const uploadDate = element.querySelector(".P7xzyf")?.textContent.trim();
        const description = element.querySelector(".VwiC3b")?.textContent.trim();

        if (title && link) {
          videos.push({
            title,
            url: link,
            thumbnail: thumbnail || null,
            source: source || "",
            duration: duration || null,
            uploadDate: uploadDate || "",
            description: description || "",
          });
        }
      });

      return {
        query: document.querySelector('input[name="q"]')?.value || "",
        totalVideos: videos.length,
        videos,
      };
    });

    await browser.close();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Scrape Google News
 */
async function scrapeGoogleNews(query, env) {
  const browser = await puppeteer.launch(env.MYBROWSER);
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws&hl=en`;
    await page.goto(searchUrl, { waitUntil: "networkidle0", timeout: 30000 });

    await page.waitForSelector(".SoaBEf, .WlydOe", { timeout: 10000 });

    const data = await page.evaluate(() => {
      const articles = [];
      const articleElements = document.querySelectorAll(".SoaBEf, .WlydOe, .Gx5Zad");

      articleElements.forEach((element) => {
        const title = element.querySelector(".mCBkyc, .n0jPhd, h3")?.textContent.trim();
        const link = element.querySelector("a")?.href;
        const source = element.querySelector(".NUnG9d span, .CEMjEf, cite")?.textContent.trim();
        const time = element.querySelector(".OSrXXb, .WG9SHc span, .f")?.textContent.trim();
        const snippet = element.querySelector(".GI74Re, .Y3v8qd, .st")?.textContent.trim();
        const thumbnail = element.querySelector("img")?.src;

        if (title && link) {
          articles.push({
            title,
            url: link,
            source: source || "",
            publishedTime: time || "",
            snippet: snippet || "",
            thumbnail: thumbnail || null,
          });
        }
      });

      return {
        query: document.querySelector('input[name="q"]')?.value || "",
        totalArticles: articles.length,
        articles,
      };
    });

    await browser.close();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

            
