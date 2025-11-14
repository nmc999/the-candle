const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
  );

  try {
    const { data: jobs, error: fetchError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) throw fetchError;
    if (!jobs || jobs.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No pending jobs' })
      };
    }

    const job = jobs[0];
    console.log('Processing job:', job.id);

    await supabase
      .from('processing_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id);

    let result;

    if (job.job_type === 'primary_story') {
      result = await processPrimaryStory(job.input_data);
    } else if (job.job_type === 'dark_story') {
      result = await processDarkStory(job.input_data);
    } else {
      throw new Error('Unknown job type');
    }

    await supabase
      .from('processing_jobs')
      .update({ 
        status: 'completed',
        result_data: result,
        story_id: result.storyId || result.darkStoryId || null,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log('Job completed:', job.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, jobId: job.id })
    };

  } catch (error) {
    console.error('Job processing error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function processPrimaryStory(inputData) {
  const { url, notes } = inputData;
  
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
        content: `Analyze this URL: ${url}

Additional notes: ${notes || 'None'}

Create a story with:
- Compelling title
- 300-word summary focusing on positive impact
- Organization name and location
- 3-5 key impact metrics
- 2 additional source URLs

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "title": "Title",
  "organization": "Org",
  "location": "Location",
  "summary": "300 words",
  "impactMetrics": ["Metric 1", "Metric 2", "Metric 3"],
  "category": "light",
  "additionalSourceUrls": ["https://source1.com", "https://source2.com"]
}`
      }]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'API failed');

  let text = data.content[0].text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  const storyData = JSON.parse(text);
  const allSourceUrls = [url, ...(storyData.additionalSourceUrls || [])];

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
  );

  const { data: insertedData, error } = await supabase.from('stories').insert([{
    title: storyData.title,
    organization: storyData.organization,
    location: storyData.location,
    summary: storyData.summary,
    impact_metrics: storyData.impactMetrics || [],
    category: storyData.category || 'light',
    source_url: allSourceUrls[0],
    source_urls: allSourceUrls,
    related_dark_story_ids: [],
    utm_campaign: 'positive-impact',
    is_draft: inputData.isDraft || false,
    published_at: inputData.publishAt ? new Date(inputData.publishAt).toISOString() : new Date().toISOString()
  }]).select();

  if (error) throw error;

  return {
    storyId: insertedData[0].id,
    story: storyData
  };
}

async function processDarkStory(inputData) {
  const { storyTitle, storyUrl, primaryStoryId } = inputData;
  
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

Create ONE context story about the underlying problem.

Provide:
- Title about the problem
- 150-word summary
- 3 key facts
- 2 source URLs

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "title": "Problem title",
  "summary": "150 words",
  "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
  "sourceUrls": ["https://source1.com", "https://source2.com"]
}`
      }]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Generation failed');

  let text = data.content[0].text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  const darkStory = JSON.parse(text);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
  );

  const { data: insertedData, error } = await supabase.from('stories').insert([{
    title: darkStory.title,
    organization: 'Context Research',
    location: 'Global',
    summary: darkStory.summary,
    impact_metrics: darkStory.keyFacts,
    category: 'dark',
    source_url: darkStory.sourceUrls[0],
    source_urls: darkStory.sourceUrls,
    utm_campaign: 'positive-impact'
  }]).select();

  if (error) throw error;

  const darkStoryId = insertedData[0].id;

  const { error: linkError } = await supabase
    .from('stories')
    .update({ related_dark_story_ids: [darkStoryId] })
    .eq('id', primaryStoryId);
    
  if (linkError) throw linkError;

  return {
    darkStoryId: darkStoryId,
    primaryStoryId: primaryStoryId,
    darkStory: darkStory
  };
}
