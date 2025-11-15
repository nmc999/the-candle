const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Enable CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const type = params.type || 'light'; // 'light' or 'dark'
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 21;
    const search = params.search || '';
    const category = params.category || '';

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // Build query
    let query = supabase
      .from('stories')
      .select('*', { count: 'exact' });

    // Filter by type (category in your schema is 'flame', 'light', or 'dark')
    query = query.eq('category', type);

    // Search filter (search in title, excerpt, summary)
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,summary.ilike.%${search}%`);
    }

    // Category filter (you might want to add a 'topic' or 'tags' field for this)
    // For now, we'll store this in a hypothetical 'topic' field
    if (category) {
      query = query.eq('topic', category);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    const stories = data || [];
    const total = count || 0;
    const hasMore = total > (page * limit);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        stories,
        hasMore,
        total,
        page,
        limit
      })
    };

  } catch (error) {
    console.error('Get stories error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message,
        stories: [],
        hasMore: false,
        total: 0
      })
    };
  }
};
