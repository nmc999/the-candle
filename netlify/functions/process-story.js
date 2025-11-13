const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
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

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
          content: `Analyze this URL: ${url}

Create a 300-word summary focusing on positive impact. Extract: organization name, location, 3-5 impact metrics.
Categorize as: "flame" (exciting/inspirational), "light" (wider impact), or "dark" (problems addressed).

Notes: ${notes || 'None'}

Respond ONLY with JSON:
{
  "title": "Compelling title",
  "organization": "Org name",
  "location": "Location",
  "summary": "300 word summary",
  "impactMetrics": ["Metric 1", "Metric 2", "Metric 3"],
  "category": "flame/light/dark",
  "sourceUrl": "${url}"
}

NO markdown, NO backticks, ONLY JSON.`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    // Extract and parse the response
    let text = data.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const storyData = JSON.parse(text);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(storyData)
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
