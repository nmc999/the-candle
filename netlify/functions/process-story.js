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

    // STEP 1: Analyze the primary URL and get additional sources
    const primaryResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
          content: `Analyze this URL about a positive initiative: ${url}

TASK 1: Create a comprehensive story
- Write a 300-word summary focusing on positive impact
- Extract: organization name, location, project details
- Identify 3-5 key impact metrics as bullet points
- Create a compelling title
- Categorize as: "flame" (exciting/inspirational) or "light" (wider impact)

TASK 2: Suggest 2 additional credible sources
Think: Where else has this initiative been covered? What are similar sources?
Provide 2 realistic URLs where similar or related positive stories might be found (news sites, the organization's site, impact reports, etc.)

TASK 3: Identify the underlying problem
What challenge/problem does this initiative address? Be specific.
Example: If it's about clean water in Kenya → "Water scarcity and waterborne disease in East Africa"

Additional notes: ${notes || 'None'}

Respond ONLY with JSON:
{
  "title": "Compelling title",
  "organization": "Org name",
  "location": "Location",
  "summary": "300 word summary",
  "impactMetrics": ["Metric 1", "Metric 2", "Metric 3"],
  "category": "flame or light",
  "additionalSourceUrls": ["https://similar-source-1.com", "https://similar-source-2.com"],
  "underlyingProblem": "Specific problem this addresses",
  "problemKeywords": ["keyword1", "keyword2", "keyword3"]
}

NO markdown, NO backticks, ONLY JSON.`
        }]
      })
    });

    const primaryData = await primaryResponse.json();
    if (!primaryResponse.ok) {
      throw new Error(primaryData.error?.message || 'Primary analysis failed');
    }

    let primaryText = primaryData.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const primaryStory = JSON.parse(primaryText);

    // STEP 2: Generate 3 "Dark" context stories
    const darkResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: `The positive initiative we're covering addresses this problem: "${primaryStory.underlyingProblem}"

Keywords: ${primaryStory.problemKeywords.join(', ')}

Create 3 SEPARATE "Dark" stories that provide context about this problem:

Story 1: Statistical overview / scale of the problem
Story 2: Human impact / real-world consequences  
Story 3: Systemic causes / why this problem persists

For EACH story, provide:
- A compelling title focused on the problem (not solutions)
- 200-word summary explaining the challenge
- 3-4 key statistics or facts
- 3 credible source URLs where information about this problem can be found (news articles, research papers, WHO/UN reports, etc.)

Respond ONLY with JSON:
{
  "darkStories": [
    {
      "title": "Title about the problem",
      "summary": "200 word explanation of the problem",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://source1.com", "https://source2.com", "https://source3.com"]
    },
    {
      "title": "Second problem angle title",
      "summary": "200 words",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://source1.com", "https://source2.com", "https://source3.com"]
    },
    {
      "title": "Third problem angle title",
      "summary": "200 words",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://source1.com", "https://source2.com", "https://source3.com"]
    }
  ]
}

NO markdown, NO backticks, ONLY JSON.`
        }]
      })
    });

    const darkData = await darkResponse.json();
    if (!darkResponse.ok) {
      throw new Error(darkData.error?.message || 'Dark story generation failed');
    }

    let darkText = darkData.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const darkStoriesData = JSON.parse(darkText);

    // Combine all sources for the primary story
    const allSourceUrls = [url, ...primaryStory.additionalSourceUrls];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        primaryStory: {
          ...primaryStory,
          sourceUrls: allSourceUrls
        },
        darkStories: darkStoriesData.darkStories
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
