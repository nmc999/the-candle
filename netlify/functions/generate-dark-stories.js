exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { storyTitle, storyUrl, problemContext } = JSON.parse(event.body);

    if (!storyTitle) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Story title required' })
      };
    }

    console.log('Generating dark stories for:', storyTitle);

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
          content: `For this positive initiative: "${storyTitle}"
Source: ${storyUrl || 'Not provided'}
Context: ${problemContext || 'Analyze the underlying challenge this addresses'}

Create 3 separate "Dark" stories providing context about the problem:

Story 1: Statistical overview of the challenge
Story 2: Human impact and real-world consequences
Story 3: Systemic causes and why this problem persists

For EACH story provide:
- Title focused on the problem (not solutions)
- 200-word summary explaining the challenge
- 3-4 key facts/statistics
- 3 credible source URLs (news, research, WHO/UN reports, etc.)

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "darkStories": [
    {
      "title": "Problem title",
      "summary": "200 words",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://source1.com", "https://source2.com", "https://source3.com"]
    },
    {
      "title": "Second angle title",
      "summary": "200 words",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://source1.com", "https://source2.com", "https://source3.com"]
    },
    {
      "title": "Third angle title",
      "summary": "200 words",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://source1.com", "https://source2.com", "https://source3.com"]
    }
  ]
}`
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Dark story generation failed');
    }

    let text = data.content[0].text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const result = JSON.parse(text);

    console.log('Dark stories generated successfully');

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
