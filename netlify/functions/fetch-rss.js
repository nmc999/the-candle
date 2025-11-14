const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
  );

  try {
    console.log('Fetching active RSS feeds...');

    const { data: feeds, error: feedError } = await supabase
      .from('rss_feeds')
      .select('*')
      .eq('is_active', true);

    if (feedError) throw feedError;

    console.log(`Found ${feeds.length} active feeds`);

    let totalArticlesDiscovered = 0;
    let totalArticlesQueued = 0;

    for (const feed of feeds) {
      try {
        console.log(`Fetching feed: ${feed.name}`);

        // Fetch RSS feed with better headers
        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${feed.name}: ${response.status}`);
          continue;
        }

        const xmlText = await response.text();
        const articles = parseRSSFeed(xmlText);

        console.log(`Found ${articles.length} articles in ${feed.name}`);
        totalArticlesDiscovered += articles.length;

        // Get articles from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentArticles = articles.filter(article => {
          const pubDate = new Date(article.pubDate);
          return pubDate > sevenDaysAgo;
        });

        console.log(`${recentArticles.length} recent articles from ${feed.name}`);

        for (const article of recentArticles) {
          try {
            // Check if article already in queue
            const { data: existing } = await supabase
              .from('article_queue')
              .select('id')
              .eq('url', article.link)
              .maybeSingle();

            if (existing) {
              console.log(`Article already in queue: ${article.title}`);
              continue;
            }

            // Evaluate with AI
            const evaluation = await evaluateArticleRelevance(
              article.title,
              article.description || '',
              article.link
            );

            console.log(`Article "${article.title}" scored ${evaluation.score}: ${evaluation.reasoning}`);

            // Queue if relevance score > 0.5
            if (evaluation.score >= 0.5) {
              const { error: insertError } = await supabase
                .from('article_queue')
                .insert([{
                  rss_feed_id: feed.id,
                  title: article.title,
                  url: article.link,
                  description: article.description,
                  published_date: article.pubDate,
                  ai_relevance_score: evaluation.score,
                  ai_reasoning: evaluation.reasoning,
                  status: 'pending'
                }]);

              if (insertError) {
                console.error('Error inserting article:', insertError);
              } else {
                console.log(`Queued: ${article.title} (score: ${evaluation.score})`);
                totalArticlesQueued++;
              }
            }

          } catch (articleError) {
            console.error(`Error processing article: ${articleError.message}`);
          }
        }

        // Update last checked time
        await supabase
          .from('rss_feeds')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', feed.id);

      } catch (feedError) {
        console.error(`Error fetching feed ${feed.name}:`, feedError.message);
      }
    }

    console.log(`Summary: Discovered ${totalArticlesDiscovered} articles, queued ${totalArticlesQueued} relevant ones`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        feedsProcessed: feeds.length,
        articlesDiscovered: totalArticlesDiscovered,
        articlesQueued: totalArticlesQueued
      })
    };

  } catch (error) {
    console.error('RSS fetch error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function parseRSSFeed(xmlText) {
  const articles = [];
  
  // Simple regex-based parsing (works for most RSS/Atom feeds)
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  
  let matches = [...xmlText.matchAll(itemRegex)];
  if (matches.length === 0) {
    matches = [...xmlText.matchAll(entryRegex)];
  }
  
  for (const match of matches) {
    const itemXml = match[1];
    
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link') || extractAttribute(itemXml, 'link', 'href');
    const description = extractTag(itemXml, 'description') || extractTag(itemXml, 'summary') || extractTag(itemXml, 'content');
    const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'published') || extractTag(itemXml, 'updated');
    
    if (title && link) {
      articles.push({
        title: cleanText(title),
        link: link.trim(),
        description: cleanText(description),
        pubDate: pubDate || new Date().toISOString()
      });
    }
  }
  
  return articles;
}

function extractTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function extractAttribute(xml, tagName, attrName) {
  const regex = new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["']`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function evaluateArticleRelevance(title, description, url) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: '
