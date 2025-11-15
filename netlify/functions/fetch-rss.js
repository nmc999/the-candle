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

    // Process only first 2 feeds to avoid timeout
    // Process 2 feeds that haven't been checked recently
    const feedsToProcess = feeds
      .sort((a, b) => {
        const aTime = a.last_checked_at ? new Date(a.last_checked_at) : new Date(0);
        const bTime = b.last_checked_at ? new Date(b.last_checked_at) : new Date(0);
        return aTime - bTime;
      })
      .slice(0, 2);

console.log(`Processing feeds: ${feedsToProcess.map(f => f.name).join(', ')}`);
    
    for (const feed of feedsToProcess) {
      try {
        console.log(`Fetching feed: ${feed.name}`);

        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
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

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentArticles = articles
          .filter(article => {
            const pubDate = new Date(article.pubDate);
            return pubDate > sevenDaysAgo;
          })
          .slice(0, 5); // Only process 5 most recent articles per feed

        console.log(`Processing ${recentArticles.length} articles from ${feed.name}`);

        for (const article of recentArticles) {
          try {
            const { data: existing } = await supabase
              .from('article_queue')
              .select('id')
              .eq('url', article.link)
              .maybeSingle();

            if (existing) {
              console.log(`Already queued: ${article.title}`);
              continue;
            }

            const evaluation = await evaluateArticleRelevance(
              article.title,
              article.description || ''
            );

            console.log(`"${article.title}" scored ${evaluation.score}`);

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

              if (!insertError) {
                console.log(`Queued: ${article.title}`);
                totalArticlesQueued++;
              }
            }
          } catch (err) {
            console.error('Article error:', err.message);
          }
        }

        await supabase
          .from('rss_feeds')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', feed.id);

      } catch (err) {
        console.error(`Feed error ${feed.name}:`, err.message);
      }
    }

    console.log(`Discovered ${totalArticlesDiscovered}, queued ${totalArticlesQueued}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        feedsProcessed: feedsToProcess.length,
        articlesDiscovered: totalArticlesDiscovered,
        articlesQueued: totalArticlesQueued
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function parseRSSFeed(xmlText) {
  const articles = [];
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
    const description = extractTag(itemXml, 'description') || extractTag(itemXml, 'summary');
    const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'published');
    
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
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .trim();
}

async function evaluateArticleRelevance(title, description) {
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
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Rate this article's relevance to positive impact work (charity, NGO, humanitarian aid, social good).

Title: ${title}
Description: ${description}

Respond ONLY with JSON:
{"score": 0.0-1.0, "reasoning": "brief reason"}`
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error('API failed');

    let text = data.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(text);
    
    return {
      score: result.score || 0,
      reasoning: result.reasoning || 'No reason'
    };
  } catch (error) {
    console.error('AI error:', error);
    return { score: 0, reasoning: 'Failed' };
  }
}
