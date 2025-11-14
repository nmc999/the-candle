// Configuration - REPLACE THESE VALUES
const SUPABASE_URL = 'https://mrospkpmkxrjprzehtng.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yb3Nwa3Bta3hyanByemVodG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMDc0NjgsImV4cCI6MjA3ODU4MzQ2OH0.hHstHsxfGMdeSlq-bhXx9H7kEBUKsd-0Jd566ZS8MXA';
const ADMIN_PASSWORD = 'Crossfire13"';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// App State
let currentPage = 'home';
let isAuthenticated = false;
let stories = { flame: [], light: [], dark: [] };
let allStories = [];
let editingStory = null;
let analytics = {
    totalClicks: 0,
    subscriberCount: 0,
    storyCounts: { flame: 0, light: 0, dark: 0 }
};
let currentFilter = 'all';
let currentSearchTerm = '';

// Initialize app
async function init() {
    checkRoute();
    await loadStories();
    if (currentPage === 'dashboard' && isAuthenticated) {
        await loadAnalytics();
    }
    renderApp();
    setupEventListeners();
}

// Check URL route
function checkRoute() {
    if (window.DASHBOARD_MODE === true) {
        currentPage = 'dashboard';
        return;
    }
    
    const path = window.location.pathname;
    if (path === '/dashboard' || path === '/dashboard.html') {
        currentPage = 'dashboard';
    }
}

// Load stories from Supabase
async function loadStories() {
    try {
        const { data, error } = await supabase
            .from('stories')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allStories = data || [];
        stories = { flame: [], light: [], dark: [] };
        allStories.forEach(story => {
            if (stories[story.category]) {
                stories[story.category].push(story);
            }
        });
        
        console.log('Loaded stories:', allStories.length); // Debug log
    } catch (error) {
        console.error('Error loading stories:', error);
    }
}

// Load analytics data
async function loadAnalytics() {
    try {
        const { count: subCount } = await supabase
            .from('email_subscribers')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
        
        analytics.subscriberCount = subCount || 0;

        analytics.storyCounts = {
            flame: stories.flame.length,
            light: stories.light.length,
            dark: stories.dark.length
        };

        const { data: clickData } = await supabase
            .from('stories')
            .select('click_count');
        
        analytics.totalClicks = clickData?.reduce((sum, s) => sum + (s.click_count || 0), 0) || 0;

    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Generate UTM link
function generateUTMLink(url, storyTitle) {
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('utm_source', 'the-candle');
        urlObj.searchParams.set('utm_medium', 'referral');
        urlObj.searchParams.set('utm_campaign', 'positive-impact');
        urlObj.searchParams.set('utm_content', storyTitle.toLowerCase().replace(/\s+/g, '-').substring(0, 50));
        return urlObj.toString();
    } catch (e) {
        return url;
    }
}

// Track click
async function trackClick(storyId, url) {
    console.log('Tracking click for story:', storyId, 'URL:', url);
    
    try {
        const response = await fetch('/.netlify/functions/track-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                storyId,
                referrer: document.referrer || 'direct',
                utmSource: 'the-candle',
                utmMedium: 'referral',
                utmCampaign: 'positive-impact'
            })
        });
        
        if (!response.ok) {
            console.error('Track click failed:', response.status);
        } else {
            console.log('Click tracked successfully');
        }
    } catch (error) {
        console.error('Error tracking click:', error);
    }
    
    window.open(url, '_blank');
}

// Render the app
function renderApp() {
    const app = document.getElementById('app');
    
    if (currentPage === 'home') {
        app.innerHTML = renderHomePage();
    } else if (currentPage === 'dashboard') {
        if (!isAuthenticated) {
            app.innerHTML = renderPasswordModal();
        } else {
            app.innerHTML = renderDashboard();
        }
    } else if (['flame', 'light', 'dark', 'wax', 'wick'].includes(currentPage)) {
        app.innerHTML = renderSectionPage(currentPage);
    }
}

function renderHomePage() {
    return `
        <div class="home-page">
            <h1>The Candle</h1>
            <p class="tagline">Illuminating positive impact across the globe</p>
            
            <div class="candle-visualization">
                <div class="dark-zone" data-section="dark" style="pointer-events: auto;">
                    <span class="dark-label" style="pointer-events: none;">The Dark</span>
                </div>
                
                <div class="light-zone" data-section="light" style="pointer-events: auto;">
                    <span class="light-label" style="pointer-events: none;">The Light</span>
                </div>
                
                <div class="wax-zone" data-section="wax" style="pointer-events: auto; width: 120px; height: 280px;">
                    <svg width="120" height="280" viewBox="0 0 120 280" style="pointer-events: none;">
                        <defs>
                            <linearGradient id="waxGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style="stop-color:#f4e4c1;stop-opacity:1" />
                                <stop offset="50%" style="stop-color:#f9f3e3;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#f4e4c1;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <path class="candle-body" d="M 30 40 L 90 40 L 85 270 L 35 270 Z" fill="url(#waxGradient)" stroke="#d4a574" stroke-width="2"/>
                        <ellipse cx="60" cy="40" rx="30" ry="8" fill="#f4e4c1"/>
                    </svg>
                </div>
                
                <div class="wick-zone" data-section="wick" style="pointer-events: auto; width: 120px; height: 50px;">
                    <svg width="120" height="50" viewBox="0 0 120 50" style="pointer-events: none;">
                        <rect x="55" y="0" width="10" height="45" fill="#2a2a2a" rx="2"/>
                    </svg>
                </div>
                
                <div class="flame-zone" data-section="light" style="pointer-events: auto; width: 120px; height: 100px;">
                    <svg width="120" height="100" viewBox="0 0 120 100" class="flame" style="pointer-events: none;">
                        <ellipse cx="60" cy="50" rx="35" ry="50" fill="#ff6b35" opacity="0.9"/>
                        <ellipse cx="60" cy="55" rx="22" ry="35" fill="#ffa500"/>
                        <ellipse cx="60" cy="60" rx="12" ry="22" fill="#ffeb3b"/>
                    </svg>
                </div>
            </div>
            
            <div id="tooltip" class="hover-tooltip">
                <h4 id="tooltip-title"></h4>
                <p id="tooltip-desc"></p>
            </div>
            
            <p class="instruction">Click on any zone to explore • Hover for descriptions</p>
            
            <div style="margin-top: 60px; max-width: 500px; text-align: center;">
                <h3 style="color: #ffd700; margin-bottom: 15px;">Stay Illuminated</h3>
                <p style="color: #ccc; margin-bottom: 20px;">Get weekly stories of positive impact in your inbox</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <input 
                        type="email" 
                        id="email-signup" 
                        placeholder="your@email.com"
                        style="padding: 12px; border-radius: 6px; border: 2px solid #ffd700; background: rgba(255,255,255,0.1); color: white; flex: 1; max-width: 300px;"
                    />
                    <button 
                        onclick="subscribeEmail()"
                        style="padding: 12px 24px; background: #d4a017; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"
                    >
                        Subscribe
                    </button>
                </div>
                <div id="email-status" style="margin-top: 10px; font-size: 0.9rem;"></div>
            </div>
        </div>
    `;
}

function renderSectionPage(section) {
    const sectionConfig = {
        flame: { icon: '💡', title: 'The Light', description: 'Stories of positive impact and meaningful change' },
        light: { icon: '💡', title: 'The Light', description: 'Stories of positive impact and meaningful change' },
        dark: { icon: '🌑', title: 'The Dark', description: 'Understanding the problems that make positive work necessary' },
        wax: { icon: '🕯️', title: 'The Wax', description: 'Support organizations making a difference' },
        wick: { icon: '🔥', title: 'The Wick', description: 'About The Candle' }
    };
    
    const config = sectionConfig[section];
    
    if (section === 'wax') {
        return renderWaxPage(config);
    }
    
    if (section === 'wick') {
        return renderWickPage(config);
    }
    
    // Combine flame and light stories
    let sectionStories = [];
    if (section === 'flame' || section === 'light') {
        sectionStories = [...(stories.flame || []), ...(stories.light || [])];
        sectionStories.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
        sectionStories = stories[section] || [];
    }
    
    return `
        <div class="section-page">
            <div class="section-content">
                <a class="back-button" data-action="home">← Back to Home</a>
                <div class="section-header">
                    <span style="font-size: 2rem;">${config.icon}</span>
                    <h1>${config.title}</h1>
                </div>
                <p class="section-description">${config.description}</p>
                ${sectionStories.length === 0 ? 
                    '<div class="story-card"><p>No stories yet. Check back soon!</p></div>' :
                    sectionStories.map(story => renderStoryCard(story, section)).join('')
                }
            </div>
        </div>
    `;
}

function renderStoryCard(story, section) {
    const sourceUrls = story.source_urls || [story.source_url];
    const relatedDarkIds = story.related_dark_story_ids || [];
    
    const relatedDarkStories = relatedDarkIds
        .map(id => allStories.find(s => s.id === id))
        .filter(s => s);
    
    return `
        <div class="story-card">
            <h3>${story.title}</h3>
            <div class="story-meta">
                <strong>${story.organization}</strong> • ${story.location}
            </div>
            <p class="story-summary">${story.summary}</p>
            
            <div class="impact-metrics">
                <h4>Key Impact Metrics:</h4>
                <ul>
                    ${story.impact_metrics.map(metric => `<li>${metric}</li>`).join('')}
                </ul>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="color: #333; margin-bottom: 10px;">Sources:</h4>
                ${sourceUrls.map((url, idx) => {
                    const utmLink = generateUTMLink(url, story.title);
                    return `<div style="margin-bottom: 8px;">
                        <a href="#" class="source-link" data-story-id="${story.id}" data-utm-link="${utmLink.replace(/"/g, '&quot;')}">
                            Source ${idx + 1} →
                        </a>
                    </div>`;
                }).join('')}
            </div>
            
            ${(section === 'flame' || section === 'light') && relatedDarkStories.length > 0 ? `
                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                    <h4 style="color: #333; margin-bottom: 15px;">📖 Understanding the Challenge</h4>
                    <p style="color: #666; font-size: 0.9rem; margin-bottom: 15px;">
                        To fully appreciate this initiative, explore the context:
                    </p>
                    ${relatedDarkStories.map(darkStory => `
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
                            <a href="#" onclick="navigateToStory('dark', ${darkStory.id}); return false;" 
                               style="color: #555; text-decoration: none; font-weight: 600; display: block; margin-bottom: 5px;">
                                ${darkStory.title} →
                            </a>
                            <p style="color: #777; font-size: 0.85rem; margin: 0;">
                                ${darkStory.summary.substring(0, 150)}...
                            </p>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function renderWaxPage(config) {
    return `
        <div class="section-page">
            <div class="section-content">
                <a class="back-button" data-action="home">← Back to Home</a>
                <div class="section-header">
                    <span style="font-size: 2rem;">${config.icon}</span>
                    <h1>${config.title}</h1>
                </div>
                <p class="section-description">${config.description}</p>
                <div class="org-grid">
                    <div class="org-card">
                        <div class="org-logo">🏥</div>
                        <h3>Doctors Without Borders</h3>
                        <p>Medical humanitarian aid worldwide</p>
                        <a href="https://www.doctorswithoutborders.org/" target="_blank" class="org-link">Visit Website</a>
                    </div>
                    <div class="org-card">
                        <div class="org-logo">🌍</div>
                        <h3>UNICEF</h3>
                        <p>Supporting children's rights globally</p>
                        <a href="https://www.unicef.org/" target="_blank" class="org-link">Visit Website</a>
                    </div>
                    <div class="org-card">
                        <div class="org-logo">🌊</div>
                        <h3>Ocean Conservancy</h3>
                        <p>Protecting ocean ecosystems</p>
                        <a href="https://oceanconservancy.org/" target="_blank" class="org-link">Visit Website</a>
                    </div>
                    <div class="org-card">
                        <div class="org-logo">🍃</div>
                        <h3>World Wildlife Fund</h3>
                        <p>Conservation of nature and wildlife</p>
                        <a href="https://www.worldwildlife.org/" target="_blank" class="org-link">Visit Website</a>
                    </div>
                    <div class="org-card">
                        <div class="org-logo">💧</div>
                        <h3>charity: water</h3>
                        <p>Bringing clean water to developing nations</p>
                        <a href="https://www.charitywater.org/" target="_blank" class="org-link">Visit Website</a>
                    </div>
                    <div class="org-card">
                        <div class="org-logo">📚</div>
                        <h3>Room to Read</h3>
                        <p>Global literacy and gender equality in education</p>
                        <a href="https://www.roomtoread.org/" target="_blank" class="org-link">Visit Website</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderWickPage(config) {
    return `
        <div class="section-page">
            <div class="section-content">
                <a class="back-button" data-action="home">← Back to Home</a>
                <div class="section-header">
                    <span style="font-size: 2rem;">${config.icon}</span>
                    <h1>${config.title}</h1>
                </div>
                <p class="section-description">${config.description}</p>
                <div class="story-card">
                    <h3>Our Story</h3>
                    <p class="story-summary">
                        The Candle was founded on a simple belief: the world needs more light. While traditional news media gravitates toward crisis and conflict, countless positive initiatives go unreported. Organizations across the globe are solving problems, improving lives, and creating lasting change—but their stories remain in the shadows.
                        <br><br>
                        We created The Candle to illuminate these stories. Using intelligent technology to discover and curate positive impact narratives, we bring attention to the work that matters. Our mission is not to ignore the darkness, but to show the candles being lit within it.
                    </p>
                </div>
            </div>
        </div>
    `;
}

function renderPasswordModal() {
    return `
        <div class="password-modal">
            <div class="password-modal-content">
                <h2>Dashboard Access</h2>
                <p style="color: #666; margin-bottom: 20px;">Administrator login required</p>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password-input" placeholder="Enter admin password">
                </div>
                <button class="btn" onclick="checkPassword()">Login</button>
                <div id="password-error" class="status-message error hidden" style="margin-top: 15px;">
                    Incorrect password
                </div>
            </div>
        </div>
    `;
}

function renderDashboard() {
    if (editingStory) {
        return renderEditStory();
    }
    
    return `
        <div class="dashboard-page">
            <div class="dashboard-header">
                <h1>🕯️ The Candle Dashboard</h1>
                <button onclick="logout()" class="btn" style="background: #6c757d;">Logout</button>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${analytics.storyCounts.flame + analytics.storyCounts.light + analytics.storyCounts.dark}</div>
                    <div class="stat-label">Total Stories</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.totalClicks}</div>
                    <div class="stat-label">Total Clicks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.subscriberCount}</div>
                    <div class="stat-label">Email Subscribers</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.storyCounts.flame}/${analytics.storyCounts.light}/${analytics.storyCounts.dark}</div>
                    <div class="stat-label">Flame/Light/Dark</div>
                </div>
            </div>
            
            <div class="dashboard-tabs">
                <button class="tab-btn active" data-tab="add">➕ Add Story</button>
                <button class="tab-btn" data-tab="manage">📚 Manage Stories</button>
                <button class="tab-btn" data-tab="jobs">⚙️ Jobs</button>
                <button class="tab-btn" data-tab="subscribers">📧 Subscribers</button>
                <button class="tab-btn" data-tab="analytics">📊 Analytics</button>
            </div>
            
            <div id="tab-content">
                ${renderAddStoryTab()}
            </div>
        </div>
    `;
}

function renderAddStoryTab() {
    return `
        <div class="tab-panel">
            <h2>Add New Story</h2>
            <div class="form-group">
                <label>URL of Positive Initiative</label>
                <input type="url" id="url-input" placeholder="https://example.com/positive-impact-story">
            </div>
            <div class="form-group">
                <label>Notes (Optional)</label>
                <textarea id="notes-input" rows="3" placeholder="Any additional context for the AI..."></textarea>
            </div>
            <button class="btn" id="process-btn" onclick="processStory()">🤖 Process with AI</button>
            <div id="status-message" style="margin-top: 20px;"></div>
        </div>
    `;
}

function renderManageStoriesTab() {
    return `
        <div class="tab-panel">
            <h2>All Stories (${allStories.length})</h2>
            
            <div style="margin-bottom: 20px; display: flex; gap: 10px;">
                <button class="btn-small" onclick="filterStories('all')" id="filter-all" style="background: #b8860b;">All</button>
                <button class="btn-small" onclick="filterStories('light')" id="filter-light">Light</button>
                <button class="btn-small" onclick="filterStories('dark')" id="filter-dark">Dark</button>
                <button class="btn-small" onclick="filterStories('with-context')" id="filter-context">Has Context</button>
                <button class="btn-small" onclick="filterStories('no-context')" id="filter-no-context">Needs Context</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <input 
                    type="text" 
                    id="story-search" 
                    placeholder="Search stories by title, organization, or location..." 
                    style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px;"
                    oninput="searchStories()"
                />
            </div>
            
            <div class="story-list" id="story-list">
                ${renderStoryItems(allStories)}
            </div>
        </div>
    `;
}

function renderStoryItems(storiesToShow) {
    if (storiesToShow.length === 0) {
        return '<p style="color: #666; text-align: center; padding: 40px;">No stories match your filter.</p>';
    }
    
    const bulkActionsHtml = `
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: none;" id="bulk-actions">
            <strong id="selected-count">0 selected</strong> •
            <button onclick="bulkDelete()" class="btn-small btn-danger" style="margin-left: 10px;">Delete Selected</button>
            <button onclick="bulkChangeCategory('light')" class="btn-small" style="margin-left: 10px;">Set to Light</button>
            <button onclick="bulkChangeCategory('dark')" class="btn-small" style="margin-left: 10px;">Set to Dark</button>
            <button onclick="clearSelection()" class="btn-small" style="background: #6c757d; margin-left: 10px;">Clear Selection</button>
        </div>
    `;
    
    return bulkActionsHtml + storiesToShow.map(story => {
        const hasContext = story.related_dark_story_ids && story.related_dark_story_ids.length > 0;
        const statusBadge = hasContext 
            ? '<span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 10px;">✓ Context</span>'
            : '<span style="background: #ffa500; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 10px;">⚠ No Context</span>';
        
        return `
            <div class="story-item" data-story-id="${story.id}" data-category="${story.category}" data-has-context="${hasContext}">
                <div class="story-item-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" class="story-checkbox" data-story-id="${story.id}" onchange="updateBulkActions()" style="width: 20px; height: 20px; cursor: pointer;">
                        <h3>${story.title}${statusBadge}</h3>
                    </div>
                    <span class="badge badge-${story.category}">${story.category}</span>
                </div>
                <div class="story-item-meta">
                    ${story.organization} • ${story.location} • ${story.click_count || 0} clicks • ${new Date(story.created_at).toLocaleDateString()}
                </div>
                <div class="story-item-actions">
                    <button class="btn-small btn-preview" data-story-id="${story.id}" style="background: #2196F3;">Preview</button>
                    <button class="btn-small btn-edit" data-story-id="${story.id}">Edit</button>
                    ${!hasContext && story.category !== 'dark' ? 
                        `<button class="btn-small btn-add-context" data-story-id="${story.id}" data-story-title="${story.title.replace(/"/g, '&quot;')}" data-story-url="${story.source_url}" style="background: #555;">Add Context</button>` 
                        : ''}
                    <button class="btn-small btn-delete" data-story-id="${story.id}" style="background: #dc3545;">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderJobsTab() {
    return `
        <div class="tab-panel">
            <h2>Processing Jobs</h2>
            <div id="jobs-list">
                <p style="color: #666;">Loading jobs...</p>
            </div>
        </div>
    `;
}

function renderSubscribersTab() {
    return `
        <div class="tab-panel">
            <h2>Email Subscribers (${analytics.subscriberCount})</h2>
            <button onclick="exportSubscribers()" class="btn" style="margin-bottom: 20px;">📥 Export to CSV</button>
            <div id="subscribers-list">
                <p style="color: #666;">Loading subscribers...</p>
            </div>
        </div>
    `;
}

function renderAnalyticsTab() {
    return `
        <div class="tab-panel">
            <h2>Story Performance</h2>
            <div class="analytics-table">
                <table>
                    <thead>
                        <tr>
                            <th>Story Title</th>
                            <th>Category</th>
                            <th>Clicks</th>
                            <th>Published</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allStories
                            .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
                            .map(story => `
                                <tr>
                                    <td>${story.title}</td>
                                    <td><span class="badge badge-${story.category}">${story.category}</span></td>
                                    <td><strong>${story.click_count || 0}</strong></td>
                                    <td>${new Date(story.created_at).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderEditStory() {
    const story = editingStory;
    const sourceUrls = story.source_urls || [story.source_url];
    
    return `
        <div class="tab-panel">
            <h2>Edit Story</h2>
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="title-input" value="${story.title || ''}" />
            </div>
            <div class="form-group">
                <label>Organization</label>
                <input type="text" id="org-input" value="${story.organization || ''}" />
            </div>
            <div class="form-group">
                <label>Location</label>
                <input type="text" id="location-input" value="${story.location || ''}" />
            </div>
            <div class="form-group">
                <label>Summary</label>
                <textarea id="summary-input" rows="8">${story.summary || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Impact Metrics (one per line)</label>
                <textarea id="metrics-input" rows="5">${(story.impact_metrics || []).join('\n')}</textarea>
            </div>
            <div class="form-group">
                <label>Category</label>
                <select id="category-input">
                    <option value="flame" ${story.category === 'flame' ? 'selected' : ''}>Flame</option>
                    <option value="light" ${story.category === 'light' ? 'selected' : ''}>Light</option>
                    <option value="dark" ${story.category === 'dark' ? 'selected' : ''}>Dark</option>
                </select>
            </div>
            <div class="form-group">
                <label>Source URLs (one per line)</label>
                <textarea id="sources-input" rows="3">${sourceUrls.join('\n')}</textarea>
            </div>
            <button class="btn" onclick="saveEditedStory()">Save Changes</button>
            <button class="btn" onclick="cancelEdit()" style="background: #6c757d; margin-left: 10px;">Cancel</button>
            <div id="status-message" style="margin-top: 20px;"></div>
        </div>
    `;
}

function navigateToStory(section, storyId) {
    currentPage = section;
    renderApp();
    setTimeout(() => {
        const element = document.querySelector(`[data-story-id="${storyId}"]`);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function checkPassword() {
    const input = document.getElementById('password-input');
    const error = document.getElementById('password-error');
    
    if (input.value === ADMIN_PASSWORD) {
        isAuthenticated = true;
        loadAnalytics().then(() => renderApp());
    } else {
        error.classList.remove('hidden');
    }
}

function logout() {
    isAuthenticated = false;
    currentPage = 'home';
    window.location.href = '/';
}

async function subscribeEmail() {
    const emailInput = document.getElementById('email-signup');
    const statusDiv = document.getElementById('email-status');
    const email = emailInput.value.trim();
    
    if (!email || !email.includes('@')) {
        statusDiv.innerHTML = '<span style="color: #ff6b6b;">Please enter a valid email</span>';
        return;
    }
    
    try {
        const { error } = await supabase
            .from('email_subscribers')
            .insert([{ email }]);
        
        if (error) {
            if (error.code === '23505') {
                statusDiv.innerHTML = '<span style="color: #ffd700;">You\'re already subscribed!</span>';
            } else {
                throw error;
            }
        } else {
            statusDiv.innerHTML = '<span style="color: #4caf50;">✓ Subscribed! Check your inbox weekly.</span>';
            emailInput.value = '';
        }
    } catch (error) {
        console.error('Subscription error:', error);
        statusDiv.innerHTML = '<span style="color: #ff6b6b;">Error subscribing. Please try again.</span>';
    }
}

async function processStory() {
    const urlInput = document.getElementById('url-input');
    const notesInput = document.getElementById('notes-input');
    const statusDiv = document.getElementById('status-message');
    const processBtn = document.getElementById('process-btn');
    
    const url = urlInput.value.trim();
    const notes = notesInput.value.trim();
    
    if (!url) {
        statusDiv.innerHTML = '<div class="status-message error">Please enter a URL</div>';
        return;
    }
    
    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';
    
    try {
        const { data: job, error: jobError } = await supabase.from('processing_jobs').insert([{
            job_type: 'primary_story',
            status: 'pending',
            input_data: { url, notes }
        }]).select();
        
        if (jobError) throw jobError;
        
        const jobId = job[0].id;
        
        statusDiv.innerHTML = `
            <div class="status-message info">
                🤖 Processing started! This may take 30-60 seconds...<br>
                <small>Job ID: ${jobId}</small>
            </div>
        `;
        
        urlInput.value = '';
        notesInput.value = '';
        
        fetch('/.netlify/functions/process-job', { method: 'POST' })
            .catch(e => console.log('Background trigger sent'));
        
        pollJobStatus(jobId, statusDiv, processBtn);
        
    } catch (error) {
        console.error('Error:', error);
        statusDiv.innerHTML = `<div class="status-message error">Error: ${error.message}</div>`;
        processBtn.disabled = false;
        processBtn.textContent = '🤖 Process with AI';
    }
}

async function pollJobStatus(jobId, statusDiv, processBtn) {
    const maxAttempts = 60;
    let attempts = 0;
    
    const checkStatus = async () => {
        attempts++;
        
        const { data: job, error } = await supabase
            .from('processing_jobs')
            .select('*')
            .eq('id', jobId)
            .single();
        
        if (error) {
            statusDiv.innerHTML = `<div class="status-message error">Error checking status: ${error.message}</div>`;
            processBtn.disabled = false;
            processBtn.textContent = '🤖 Process with AI';
            return;
        }
        
        if (job.status === 'completed') {
            const storyId = job.result_data.storyId;
            const storyTitle = job.result_data.story.title;
            const inputUrl = job.input_data.url;
            
            statusDiv.innerHTML = `
                <div class="status-message success">
                    ✓ Success! Story added: "${storyTitle}"
                    <div style="margin-top: 15px;">
                        <button onclick="generateDarkStoriesBackground(${storyId}, '${storyTitle.replace(/'/g, "\\'")}', '${inputUrl}')" 
                                class="btn" style="font-size: 0.9rem; padding: 10px 20px;">
                            🌑 Generate Context Story (Optional)
                        </button>
                    </div>
                </div>
            `;
            processBtn.disabled = false;
            processBtn.textContent = '🤖 Process with AI';
            await loadStories();
            await loadAnalytics();
            return;
        }
        
        if (job.status === 'failed') {
            statusDiv.innerHTML = `<div class="status-message error">Processing failed: ${job.error_message}</div>`;
            processBtn.disabled = false;
            processBtn.textContent = '🤖 Process with AI';
            return;
        }
        
        if (attempts >= maxAttempts) {
            statusDiv.innerHTML = `
                <div class="status-message error">
                    Processing is taking longer than expected. Job ID: ${jobId}<br>
                    <button onclick="pollJobStatus(${jobId}, document.getElementById('status-message'), document.getElementById('process-btn'))" class="btn" style="margin-top: 10px;">
                        Check Status Again
                    </button>
                </div>
            `;
            processBtn.disabled = false;
            processBtn.textContent = '🤖 Process with AI';
            return;
        }
        
        setTimeout(checkStatus, 2000);
    };
    
    setTimeout(checkStatus, 5000);
}

async function generateDarkStoriesBackground(primaryStoryId, storyTitle, storyUrl) {
    // Find or create a status div
    let statusDiv = document.getElementById('status-message');
    
    // If no status div exists (e.g., we're in Manage Stories tab), create a temporary one
    if (!statusDiv) {
        const buttonParent = event.target.closest('.story-item-actions');
        if (buttonParent) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'temp-status';
            statusDiv.style.marginTop = '10px';
            buttonParent.insertAdjacentElement('afterend', statusDiv);
        } else {
            // Fallback: just use console logging
            console.log('Starting context story generation...');
            alert('Context story generation started. Check the Jobs tab to monitor progress.');
            
            try {
                const { data: job, error: jobError } = await supabase.from('processing_jobs').insert([{
                    job_type: 'dark_story',
                    status: 'pending',
                    input_data: { storyTitle, storyUrl, primaryStoryId }
                }]).select();
                
                if (jobError) throw jobError;
                
                fetch('/.netlify/functions/process-job', { method: 'POST' })
                    .catch(e => console.log('Background trigger sent'));
                
                return;
            } catch (error) {
                console.error('Error:', error);
                alert('Error starting context generation: ' + error.message);
                return;
            }
        }
    }
    
    statusDiv.innerHTML = '<div class="status-message info">🌑 Starting context story generation...</div>';
    
    try {
        const { data: job, error: jobError } = await supabase.from('processing_jobs').insert([{
            job_type: 'dark_story',
            status: 'pending',
            input_data: { storyTitle, storyUrl, primaryStoryId }
        }]).select();
        
        if (jobError) throw jobError;
        
        const jobId = job[0].id;
        
        statusDiv.innerHTML = `
            <div class="status-message info">
                🌑 Generating context story in background...<br>
                <small>This may take 30-60 seconds. Job ID: ${jobId}</small>
            </div>
        `;
        
        fetch('/.netlify/functions/process-job', { method: 'POST' })
            .catch(e => console.log('Background trigger sent'));
        
        pollDarkJobStatus(jobId, statusDiv);
        
    } catch (error) {
        console.error('Error:', error);
        statusDiv.innerHTML = `<div class="status-message error">Error: ${error.message}</div>`;
    }
}

async function pollDarkJobStatus(jobId, statusDiv) {
    const maxAttempts = 60;
    let attempts = 0;
    
    const checkStatus = async () => {
        attempts++;
        
        const { data: job, error } = await supabase
            .from('processing_jobs')
            .select('*')
            .eq('id', jobId)
            .single();
        
        if (error) {
            statusDiv.innerHTML = `<div class="status-message error">Error checking status: ${error.message}</div>`;
            return;
        }
        
        if (job.status === 'completed') {
            statusDiv.innerHTML = `
                <div class="status-message success">
                    ✓ Context story generated and linked successfully!
                </div>
            `;
            await loadStories();
            await loadAnalytics();
            return;
        }
        
        if (job.status === 'failed') {
            statusDiv.innerHTML = `<div class="status-message error">Context story generation failed: ${job.error_message}</div>`;
            return;
        }
        
        if (attempts >= maxAttempts) {
            statusDiv.innerHTML = `
                <div class="status-message error">
                    Generation is taking longer than expected. Job ID: ${jobId}<br>
                    <button onclick="pollDarkJobStatus(${jobId}, document.getElementById('status-message'))" class="btn" style="margin-top: 10px;">
                        Check Status Again
                    </button>
                </div>
            `;
            return;
        }
        
        setTimeout(checkStatus, 2000);
    };
    
    setTimeout(checkStatus, 5000);
}

function editStoryFromDashboard(storyId) {
    const story = allStories.find(s => s.id === storyId);
    if (story) {
        editingStory = story;
        renderApp();
        window.scrollTo(0, 0);
    }
}

function cancelEdit() {
    editingStory = null;
    renderApp();
}

async function saveEditedStory() {
    const statusDiv = document.getElementById('status-message');
    
    try {
        const sourceUrls = document.getElementById('sources-input').value
            .split('\n')
            .map(url => url.trim())
            .filter(url => url);
        
        const updatedStory = {
            title: document.getElementById('title-input').value,
            organization: document.getElementById('org-input').value,
            location: document.getElementById('location-input').value,
            summary: document.getElementById('summary-input').value,
            impact_metrics: document.getElementById('metrics-input').value.split('\n').filter(m => m.trim()),
            category: document.getElementById('category-input').value,
            source_url: sourceUrls[0] || '',
            source_urls: sourceUrls
        };
        
        const { error } = await supabase
            .from('stories')
            .update(updatedStory)
            .eq('id', editingStory.id);
        
        if (error) throw error;
        
        statusDiv.innerHTML = '<div class="status-message success">✓ Story updated!</div>';
        editingStory = null;
        await loadStories();
        await loadAnalytics();
        
        setTimeout(() => renderApp(), 1500);
        
    } catch (error) {
        statusDiv.innerHTML = `<div class="status-message error">Error: ${error.message}</div>`;
    }
}

async function deleteStory(storyId) {
    if (!confirm('Are you sure you want to delete this story? This cannot be undone.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('stories')
            .delete()
            .eq('id', storyId);
        
        if (error) throw error;
        
        await loadStories();
        await loadAnalytics();
        renderApp();
        
    } catch (error) {
        alert('Error deleting story: ' + error.message);
    }
}

// Search and Filter Functions
function filterStories(filterType) {
    currentFilter = filterType;
    
    document.querySelectorAll('[id^="filter-"]').forEach(btn => {
        btn.style.background = '#d4a017';
    });
    document.getElementById(`filter-${filterType}`).style.background = '#b8860b';
    
    applyFiltersAndSearch();
}

function searchStories() {
    currentSearchTerm = document.getElementById('story-search').value.toLowerCase();
    applyFiltersAndSearch();
}

function applyFiltersAndSearch() {
    let filtered = [...allStories];
    
    if (currentFilter === 'light') {
        filtered = filtered.filter(s => s.category === 'light' || s.category === 'flame');
    } else if (currentFilter === 'dark') {
        filtered = filtered.filter(s => s.category === 'dark');
    } else if (currentFilter === 'with-context') {
        filtered = filtered.filter(s => s.related_dark_story_ids && s.related_dark_story_ids.length > 0);
    } else if (currentFilter === 'no-context') {
        filtered = filtered.filter(s => (!s.related_dark_story_ids || s.related_dark_story_ids.length === 0) && s.category !== 'dark');
    }
    
    if (currentSearchTerm) {
        filtered = filtered.filter(s => 
            s.title.toLowerCase().includes(currentSearchTerm) ||
            s.organization.toLowerCase().includes(currentSearchTerm) ||
            s.location.toLowerCase().includes(currentSearchTerm) ||
            s.summary.toLowerCase().includes(currentSearchTerm)
        );
    }
    
    document.getElementById('story-list').innerHTML = renderStoryItems(filtered);
}

// Story Preview Functions
function previewStory(storyId) {
    const story = allStories.find(s => s.id === storyId);
    if (!story) return;
    
    const relatedDarkIds = story.related_dark_story_ids || [];
    const relatedDarkStories = relatedDarkIds
        .map(id => allStories.find(s => s.id === id))
        .filter(s => s);
    
    const sourceUrls = story.source_urls || [story.source_url];
    
    const previewHtml = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;" onclick="closePreview(event)">
            <div style="background: white; border-radius: 10px; max-width: 800px; max-height: 90vh; overflow-y: auto; padding: 40px;" onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                    <h2 style="color: #333; margin: 0;">${story.title}</h2>
                    <button onclick="closePreview()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
                </div>
                
                <div style="color: #666; margin-bottom: 20px;">
                    <strong>${story.organization}</strong> • ${story.location}
                </div>
                
                <p style="color: #444; line-height: 1.6; margin-bottom: 20px;">${story.summary}</p>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #333; margin-bottom: 10px;">Key Impact Metrics:</h4>
                    <ul style="margin-left: 20px;">
                        ${story.impact_metrics.map(metric => `<li style="color: #444; margin-bottom: 5px;">${metric}</li>`).join('')}
                    </ul>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #333; margin-bottom: 10px;">Sources:</h4>
                    ${sourceUrls.map((url, idx) => `
                        <div style="margin-bottom: 8px;">
                            <a href="${url}" target="_blank" style="color: #2563eb;">Source ${idx + 1} →</a>
                        </div>
                    `).join('')}
                </div>
                
                ${relatedDarkStories.length > 0 ? `
                    <div style="border-top: 2px solid #eee; padding-top: 20px;">
                        <h4 style="color: #333; margin-bottom: 15px;">Context Stories:</h4>
                        ${relatedDarkStories.map(darkStory => `
                            <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
                                <strong>${darkStory.title}</strong>
                                <p style="color: #666; font-size: 0.9rem; margin-top: 5px;">${darkStory.summary.substring(0, 200)}...</p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; color: #999; font-size: 0.85rem;">
                    <strong>Category:</strong> ${story.category} | 
                    <strong>Clicks:</strong> ${story.click_count || 0} | 
                    <strong>Published:</strong> ${new Date(story.created_at).toLocaleString()}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', previewHtml);
}

function closePreview(event) {
    if (!event || event.target === event.currentTarget) {
        const preview = document.querySelector('[style*="position: fixed"]');
        if (preview) preview.remove();
    }
}

// Job Management Functions
async function loadJobsList() {
    try {
        const { data: jobs, error } = await supabase
            .from('processing_jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        const jobsDiv = document.getElementById('jobs-list');
        if (jobs.length === 0) {
            jobsDiv.innerHTML = '<p style="color: #666;">No jobs yet.</p>';
            return;
        }
        
        const statusColors = {
            pending: '#ffa500',
            processing: '#2196F3',
            completed: '#4caf50',
            failed: '#dc3545'
        };
        
        jobsDiv.innerHTML = `
            <div class="story-list">
                ${jobs.map(job => `
                    <div class="story-item">
                        <div class="story-item-header">
                            <h3>${job.job_type === 'primary_story' ? '📝' : '🌑'} ${job.job_type.replace('_', ' ').toUpperCase()}</h3>
                            <span style="background: ${statusColors[job.status]}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem;">
                                ${job.status.toUpperCase()}
                            </span>
                        </div>
                        <div class="story-item-meta">
                            Created: ${new Date(job.created_at).toLocaleString()}
                            ${job.completed_at ? ` | Completed: ${new Date(job.completed_at).toLocaleString()}` : ''}
                            ${job.error_message ? ` | Error: ${job.error_message}` : ''}
                        </div>
                        ${job.status === 'failed' ? `
                            <div class="story-item-actions">
                                <button onclick="retryJob(${job.id})" class="btn-small">🔄 Retry</button>
                                <button onclick="deleteJob(${job.id})" class="btn-small btn-danger">Delete</button>
                            </div>
                        ` : ''}
                        ${job.status === 'completed' && job.story_id ? `
                            <div class="story-item-actions">
                                <button onclick="viewStoryFromJob(${job.story_id})" class="btn-small" style="background: #2196F3;">View Story</button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        document.getElementById('jobs-list').innerHTML = 
            `<p style="color: #ff6b6b;">Error loading jobs: ${error.message}</p>`;
    }
}

async function retryJob(jobId) {
    try {
        const { error } = await supabase
            .from('processing_jobs')
            .update({ 
                status: 'pending',
                error_message: null,
                started_at: null,
                completed_at: null
            })
            .eq('id', jobId);
        
        if (error) throw error;
        
        fetch('/.netlify/functions/process-job', { method: 'POST' })
            .catch(e => console.log('Background trigger sent'));
        
        alert('Job queued for retry!');
        loadJobsList();
        
    } catch (error) {
        alert('Error retrying job: ' + error.message);
    }
}

async function deleteJob(jobId) {
    if (!confirm('Delete this job?')) return;
    
    try {
        const { error } = await supabase
            .from('processing_jobs')
            .delete()
            .eq('id', jobId);
        
        if (error) throw error;
        
        loadJobsList();
    } catch (error) {
        alert('Error deleting job: ' + error.message);
    }
}

function viewStoryFromJob(storyId) {
    previewStory(storyId);
}

// Bulk Actions Functions
function updateBulkActions() {
    const checkboxes = document.querySelectorAll('.story-checkbox:checked');
    const count = checkboxes.length;
    
    const bulkActionsDiv = document.getElementById('bulk-actions');
    const countSpan = document.getElementById('selected-count');
    
    if (bulkActionsDiv && countSpan) {
        if (count > 0) {
            bulkActionsDiv.style.display = 'block';
            countSpan.textContent = `${count} selected`;
        } else {
            bulkActionsDiv.style.display = 'none';
        }
    }
}

function getSelectedStoryIds() {
    const checkboxes = document.querySelectorAll('.story-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.dataset.storyId));
}

async function bulkDelete() {
    const ids = getSelectedStoryIds();
    if (ids.length === 0) return;
    
    if (!confirm(`Delete ${ids.length} stories? This cannot be undone.`)) return;
    
    try {
        const { error } = await supabase
            .from('stories')
            .delete()
            .in('id', ids);
        
        if (error) throw error;
        
        await loadStories();
        await loadAnalytics();
        renderApp();
        
    } catch (error) {
        alert('Error deleting stories: ' + error.message);
    }
}

async function bulkChangeCategory(newCategory) {
    const ids = getSelectedStoryIds();
    if (ids.length === 0) return;
    
    if (!confirm(`Change ${ids.length} stories to ${newCategory}?`)) return;
    
    try {
        const { error } = await supabase
            .from('stories')
            .update({ category: newCategory })
            .in('id', ids);
        
        if (error) throw error;
        
        await loadStories();
        await loadAnalytics();
        renderApp();
        
    } catch (error) {
        alert('Error updating stories: ' + error.message);
    }
}

function clearSelection() {
    document.querySelectorAll('.story-checkbox').forEach(cb => cb.checked = false);
    updateBulkActions();
}

// Subscriber Management Functions
async function loadSubscribersList() {
    try {
        const { data, error } = await supabase
            .from('email_subscribers')
            .select('*')
            .eq('is_active', true)
            .order('subscribed_at', { ascending: false });
        
        if (error) throw error;
        
        const listDiv = document.getElementById('subscribers-list');
        if (data.length === 0) {
            listDiv.innerHTML = '<p style="color: #666;">No subscribers yet.</p>';
        } else {
            listDiv.innerHTML = `
                <div class="subscriber-list">
                    ${data.map(sub => `
                        <div class="subscriber-item">
                            <span>${sub.email}</span>
                            <span style="color: #999; font-size: 0.9rem;">
                                ${new Date(sub.subscribed_at).toLocaleDateString()}
                            </span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('subscribers-list').innerHTML = 
            `<p style="color: #ff6b6b;">Error loading subscribers: ${error.message}</p>`;
    }
}

async function exportSubscribers() {
    try {
        const { data, error } = await supabase
            .from('email_subscribers')
            .select('email, subscribed_at')
            .eq('is_active', true)
            .order('subscribed_at', { ascending: false });
        
        if (error) throw error;
        
        const csv = [
            'Email,Subscribed At',
            ...data.map(sub => `${sub.email},${sub.subscribed_at}`)
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `the-candle-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        alert('Error exporting: ' + error.message);
    }
}

// Event Listeners
function setupEventListeners() {
    document.addEventListener('click', (e) => {
        if (e.target.dataset.section) {
            currentPage = e.target.dataset.section;
            renderApp();
            window.scrollTo(0, 0);
        }
        
        if (e.target.dataset.action) {
            currentPage = e.target.dataset.action;
            renderApp();
        }
        
        if (e.target.classList.contains('tab-btn')) {
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach(tab => tab.classList.remove('active'));
            e.target.classList.add('active');
            
            const tabContent = document.getElementById('tab-content');
            const tabName = e.target.dataset.tab;
            
            if (tabName === 'add') {
                tabContent.innerHTML = renderAddStoryTab();
            } else if (tabName === 'manage') {
                tabContent.innerHTML = renderManageStoriesTab();
            } else if (tabName === 'jobs') {
                tabContent.innerHTML = renderJobsTab();
                loadJobsList();
            } else if (tabName === 'subscribers') {
                tabContent.innerHTML = renderSubscribersTab();
                loadSubscribersList();
            } else if (tabName === 'analytics') {
                tabContent.innerHTML = renderAnalyticsTab();
            }
        }
    });
    
    // Tooltip hover handlers with safety checks
    document.addEventListener('mouseenter', (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        
        const target = e.target.closest('[data-section]');
        if (target && currentPage === 'home') {
            const tooltips = {
                flame: { title: '💡 The Light', desc: 'Stories of positive impact' },
                light: { title: '💡 The Light', desc: 'Stories of positive impact' },
                dark: { title: '🌑 The Dark', desc: 'Problems being addressed' },
                wax: { title: '🕯️ The Wax', desc: 'Support organizations' },
                wick: { title: '🔥 The Wick', desc: 'About The Candle' }
            };
            const tooltip = document.getElementById('tooltip');
            const info = tooltips[target.dataset.section];
            if (tooltip && info) {
                document.getElementById('tooltip-title').textContent = info.title;
                document.getElementById('tooltip-desc').textContent = info.desc;
                tooltip.classList.add('active');
            }
        }
    }, true);
    
    document.addEventListener('mouseleave', (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        
        const target = e.target.closest('[data-section]');
        if (target && currentPage === 'home') {
            const tooltip = document.getElementById('tooltip');
            if (tooltip) tooltip.classList.remove('active');
        }
    }, true);
    
    // Button action delegation
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        
        if (target.classList.contains('btn-preview')) {
            e.preventDefault();
            e.stopPropagation();
            const storyId = parseInt(target.getAttribute('data-story-id'));
            if (storyId) previewStory(storyId);
            return;
        }
        
        if (target.classList.contains('btn-edit')) {
            e.preventDefault();
            e.stopPropagation();
            const storyId = parseInt(target.getAttribute('data-story-id'));
            if (storyId) editStoryFromDashboard(storyId);
            return;
        }
        
        if (target.classList.contains('btn-add-context')) {
            e.preventDefault();
            e.stopPropagation();
            const storyId = parseInt(target.getAttribute('data-story-id'));
            const storyTitle = target.getAttribute('data-story-title');
            const storyUrl = target.getAttribute('data-story-url');
            if (storyId && storyTitle && storyUrl) {
                generateDarkStoriesBackground(storyId, storyTitle, storyUrl);
            }
            return;
        }
        
        if (target.classList.contains('btn-delete')) {
            e.preventDefault();
            e.stopPropagation();
            const storyId = parseInt(target.getAttribute('data-story-id'));
            if (storyId) deleteStory(storyId);
            return;
        }
        
        if (target.classList.contains('source-link')) {
            e.preventDefault();
            e.stopPropagation();
            const storyId = parseInt(target.getAttribute('data-story-id'));
            const utmLink = target.getAttribute('data-utm-link');
            if (storyId && utmLink) {
                trackClick(storyId, utmLink);
            }
            return;
        }
    });
}

window.addEventListener('DOMContentLoaded', init);
