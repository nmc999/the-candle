exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { url, notes } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    console.log('Processing URL:', url);

    // Make BOTH API calls in parallel for speed
    console.log('Starting parallel API calls...');
    
    const [primaryResponse, darkResponse] = await Promise.all([
      // Primary story call
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Analyze this URL about a positive initiative: ${url}

Additional notes: ${notes || 'None'}

Create a comprehensive story with:
- Compelling title
- 300-word summary focusing on positive impact
- Organization name and location
- 3-5 key impact metrics
- Category: "flame" (exciting/inspirational) or "light" (wider impact)
- 2 additional source URLs where similar stories might be found
- Underlying problem this addresses (1 sentence)
- 3 keywords about the problem

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "title": "Title here",
  "organization": "Org name",
  "location": "Location",
  "summary": "300 words",
  "impactMetrics": ["Metric 1", "Metric 2", "Metric 3"],
  "category": "flame",
  "additionalSourceUrls": ["https://source1.com", "https://source2.com"],
  "underlyingProblem": "Problem description",
  "problemKeywords": ["keyword1", "keyword2", "keyword3"]
}`
          }]
        })
      }),
      
      // Dark stories call (runs simultaneously)
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 6000,
          messages: [{
            role: 'user',
            content: `Create 3 contextual "Dark" stories about challenges related to this URL: ${url}

Create stories about:
1. Statistical overview of the problem
2. Human impact stories
3. Systemic causes

For EACH story provide:
- Title about the problem (not solutions)
- 200-word summary
- 3-4 key facts
- 3 source URLs

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "darkStories": [
    {
      "title": "Problem title",
      "summary": "200 words",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://s1.com", "https://s2.com", "https://s3.com"]
    },
    {
      "title": "Title 2",
      "summary": "200 words",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://s1.com", "https://s2.com", "https://s3.com"]
    },
    {
      "title": "Title 3",
      "summary": "200 words",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://s1.com", "https://s2.com", "https://s3.com"]
    }
  ]
}`
          }]
        })
      })
    ]);

    console.log('Both API calls completed');

    // Parse primary response
    const primaryData = await primaryResponse.json();
    if (!primaryResponse.ok) {
      throw new Error(primaryData.error?.message || 'Primary analysis failed');
    }

    let primaryText = primaryData.content[0].text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const primaryStory = JSON.parse(primaryText);
    console.log('Primary story parsed');

    // Parse dark response
    const darkData = await darkResponse.json();
    if (!darkResponse.ok) {
      throw new Error(darkData.error?.message || 'Dark stories failed');
    }

    let darkText = darkData.content[0].text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const darkStoriesData = JSON.parse(darkText);
    console.log('Dark stories parsed');

    const allSourceUrls = [url, ...primaryStory.additionalSourceUrls];

    const result = {
      primaryStory: {
        ...primaryStory,
        sourceUrls: allSourceUrls
      },
      darkStories: darkStoriesData.darkStories
    };

    console.log('Returning result');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Error:', error.message);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
