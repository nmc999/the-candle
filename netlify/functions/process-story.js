exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { url, notes, storyId } = JSON.parse(event.body);

    if (!url && !storyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL or story ID is required' })
      };
    }

    // If storyId is provided, this is an edit operation
    const isEdit = !!storyId;

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
        max_tokens: 6000,
        messages: [{
          role: 'user',
          content: `Analyze this URL: ${url}

TASK 1: Create a comprehensive story about this positive initiative.
- Write a 300-word summary focusing on positive impact
- Extract: organization name, location, project details
- Identify 3-5 key impact metrics as bullet points
- Create a compelling title
- Categorize as: "flame" (exciting/inspirational), "light" (wider impact), or "dark" (problems addressed)

TASK 2: Search for and identify related "dark" context.
Think about: What problem does this initiative address? What's the broader context?
Suggest 2-3 search queries that would find articles about the underlying problem/challenge this initiative is tackling.
For example:
- If the story is about clean water projects in Kenya → search for "water crisis Kenya statistics"
- If about literacy programs → search for "global literacy rates" or "education inequality"

Additional notes from curator: ${notes || 'None'}

Respond ONLY with JSON in this exact format:
{
  "title": "Compelling title",
  "organization": "Org name",
  "location": "Location",
  "summary": "300 word summary focusing on the positive impact and what the initiative is doing",
  "impactMetrics": ["Metric 1", "Metric 2", "Metric 3"],
  "category": "flame or light or dark",
  "sourceUrl": "${url}",
  "contextSearchQueries": ["search query 1 about underlying problem", "search query 2", "search query 3"],
  "contextSummary": "2-3 sentence summary of what problem/challenge this initiative addresses"
}

NO markdown, NO backticks, ONLY JSON.`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

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
