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

    console.log('Processing primary story for URL:', url);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `Analyze this URL about a positive initiative: ${url}

Additional notes: ${notes || 'None'}

Create a comprehensive story with:
- Compelling title
- 300-word summary focusing on positive impact
- Organization name and location
- 3-5 key impact metrics
- Category: "flame" (most exciting/inspirational) or "light" (wider impact)
- 2 additional credible source URLs

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "title": "Title",
  "organization": "Org",
  "location": "Location",
  "summary": "300 words",
  "impactMetrics": ["Metric 1", "Metric 2", "Metric 3"],
  "category": "flame",
  "additionalSourceUrls": ["https://source1.com", "https://source2.com"]
}`
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API failed');
    }

    let text = data.content[0].text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const storyData = JSON.parse(text);
    
    const allSourceUrls = [url, ...(storyData.additionalSourceUrls || [])];

    console.log('Primary story processed successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        title: storyData.title,
        organization: storyData.organization,
        location: storyData.location,
        summary: storyData.summary,
        impactMetrics: storyData.impactMetrics,
        category: storyData.category,
        sourceUrls: allSourceUrls
      })
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
