exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { storyTitle, storyUrl } = JSON.parse(event.body);

    if (!storyTitle) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Story title required' })
      };
    }

    console.log('Generating dark story for:', storyTitle);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `For this positive initiative: "${storyTitle}"

Create ONE "Dark" context story about the underlying problem this addresses.

Provide:
- Title about the problem (not the solution)
- 150-word summary of the challenge
- 3 key statistics/facts
- 2 credible source URLs

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "title": "Problem title",
  "summary": "150 words about the challenge",
  "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
  "sourceUrls": ["https://source1.com", "https://source2.com"]
}`
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Generation failed');
    }

    let text = data.content[0].text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const darkStory = JSON.parse(text);

    console.log('Dark story generated');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ darkStory })
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
