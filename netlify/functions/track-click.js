const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { storyId, referrer, utmSource, utmMedium, utmCampaign } = JSON.parse(event.body);

    if (!storyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Story ID required' })
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // Get current click count
    const { data: story, error: fetchError } = await supabase
      .from('stories')
      .select('click_count')
      .eq('id', storyId)
      .single();

    if (fetchError) throw fetchError;

    const newCount = (story.click_count || 0) + 1;

    // Update click count
    const { error: updateError } = await supabase
      .from('stories')
      .update({ click_count: newCount })
      .eq('id', storyId);

    if (updateError) throw updateError;

    console.log(`Click tracked for story ${storyId}, new count: ${newCount}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: true, clickCount: newCount })
    };

  } catch (error) {
    console.error('Track click error:', error);
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
