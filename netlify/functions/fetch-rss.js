const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; The-Candle/1.0; +https://thecandle.live)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  customFields: {
    item: ['description', 'content', 'content:encoded', 'summary']
  }
});

exports.handler = async (event, context) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
  );

  try {
    console.log('Fetching active RSS feeds...');

    // Get all active feeds
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

        const rssFeed = await parser.parseURL(feed.url);

        // Get articles from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentArticles = rssFeed.items.filter(item => {
          const pubDate = new Date(item.pubDate || item.isoDate);
          return pubDate > sevenDaysAgo;
        });

        console.log(`Found ${recentArticles.length} recent articles in ${feed.name}`);
        totalArticlesDiscovered += recentArticles.length;

        // Process each article
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
              article.contentSnippet || article.description || '',
              article.link
            );

            // Only queue if relevance score > 0.6
            if (evaluation.score >= 0.6) {
              const { error: insertError } = await supabase
                .from('article_queue')
                .insert([{
                  rss_feed_id: feed.id,
                  title: article.title,
                  url: article.link,
                  description: article.contentSnippet || article.description,
                  published_date: article.pubDate || article.isoDate,
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
            } else {
              console.log(`Skipped (low score ${evaluation.score}): ${article.title}`);
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
          role: 'user',
          content: `Evaluate if this article is about positive impact work (humanitarian aid, charity, NGO activities, development projects, social good).

Title: ${title}
Description: ${description}

Respond ONLY with valid JSON (no markdown):
{
  "score": 0.0-1.0,
  "reasoning": "brief explanation"
}

Score guidelines:
- 0.9-1.0: Clearly about positive impact work with specific initiatives
- 0.7-0.8: Likely relevant, mentions aid/charity/NGO work
- 0.5-0.6: Possibly relevant, vague or indirect connection
- 0.0-0.4: Not relevant (policy, crisis news, general announcements)`
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API failed');

    let text = data.content[0].text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const result = JSON.parse(text);
    return {
      score: result.score || 0,
      reasoning: result.reasoning || 'No reasoning provided'
    };

  } catch (error) {
    console.error('AI evaluation error:', error);
    return { score: 0, reasoning: 'Evaluation failed' };
  }
}
