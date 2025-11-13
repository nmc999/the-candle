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

    // STEP 1: Analyze the primary URL
    console.log('Calling Anthropic API for primary analysis...');
    
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
Provide 2 realistic URLs where similar positive stories might be found.

TASK 3: Identify the underlying problem
What challenge does this initiative address?

Additional notes: ${notes || 'None'}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "title": "Compelling title",
  "organization": "Org name",
  "location": "Location",
  "summary": "300 word summary",
  "impactMetrics": ["Metric 1", "Metric 2", "Metric 3"],
  "category": "flame",
  "additionalSourceUrls": ["https://source1.com", "https://source2.com"],
  "underlyingProblem": "Problem description",
  "problemKeywords": ["keyword1", "keyword2"]
}`
        }]
      })
    });

    const primaryData = await primaryResponse.json();
    
    if (!primaryResponse.ok) {
      console.error('Anthropic API error:', primaryData);
      throw new Error(primaryData.error?.message || 'Primary analysis failed');
    }

    console.log('Primary response received');
    
    let primaryText = primaryData.content[0].text;
    console.log('Raw primary text:', primaryText);
    
    // Clean the text
    primaryText = primaryText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    console.log('Cleaned primary text:', primaryText);
    
    let primaryStory;
    try {
      primaryStory = JSON.parse(primaryText);
      console.log('Primary story parsed successfully');
    } catch (parseError) {
      console.error('JSON parse error for primary story:', parseError);
      console.error('Text that failed to parse:', primaryText);
      throw new Error(`Failed to parse primary story JSON: ${parseError.message}`);
    }

    // STEP 2: Generate Dark stories
    console.log('Calling Anthropic API for dark stories...');
    
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
          content: `Problem: "${primaryStory.underlyingProblem}"
Keywords: ${primaryStory.problemKeywords.join(', ')}

Create 3 separate "Dark" stories about this problem:

Story 1: Statistical overview
Story 2: Human impact
Story 3: Systemic causes

For EACH story provide:
- Title about the problem
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
      "sourceUrls": ["https://source1.com", "https://source2.com", "https://source3.com"]
    },
    {
      "title": "Second title",
      "summary": "200 words",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://source1.com", "https://source2.com", "https://source3.com"]
    },
    {
      "title": "Third title",
      "summary": "200 words",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "sourceUrls": ["https://source1.com", "https://source2.com", "https://source3.com"]
    }
  ]
}`
        }]
      })
    });

    const darkData = await darkResponse.json();
    
    if (!darkResponse.ok) {
      console.error('Anthropic API error for dark stories:', darkData);
      throw new Error(darkData.error?.message || 'Dark story generation failed');
    }

    console.log('Dark response received');
    
    let darkText = darkData.content[0].text;
    console.log('Raw dark text:', darkText);
    
    darkText = darkText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    console.log('Cleaned dark text:', darkText);
    
    let darkStoriesData;
    try {
      darkStoriesData = JSON.parse(darkText);
      console.log('Dark stories parsed successfully');
    } catch (parseError) {
      console.error('JSON parse error for dark stories:', parseError);
      console.error('Text that failed to parse:', darkText);
      throw new Error(`Failed to parse dark stories JSON: ${parseError.message}`);
    }

    const allSourceUrls = [url, ...primaryStory.additionalSourceUrls];

    console.log('All processing complete, returning result');

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
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      })
    };
  }
};
