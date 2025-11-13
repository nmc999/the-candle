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

// Initialize app
async function init() {
    await loadStories();
    renderApp();
    setupEventListeners();
}

// Load stories from Supabase
async function loadStories() {
    try {
        const { data, error } = await supabase
            .from('stories')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Organize stories by category
        stories = { flame: [], light: [], dark: [] };
        data.forEach(story => {
            if (stories[story.category]) {
                stories[story.category].push(story);
            }
        });
    } catch (error) {
        console.error('Error loading stories:', error);
    }
}

// Render the app
function renderApp() {
    const app = document.getElementById('app');
    
    if (currentPage === 'home') {
        app.innerHTML = renderHomePage();
    } else if (currentPage === 'admin') {
        if (!isAuthenticated) {
            app.innerHTML = renderPasswordModal();
        } else {
            app.innerHTML = renderAdminPage();
        }
    } else if (['flame', 'light', 'dark', 'wax', 'wick'].includes(currentPage)) {
        app.innerHTML = renderSectionPage(currentPage);
    }
}

// Render home page
function renderHomePage() {
    return `
        <div class="home-page">
            <h1>The Candle</h1>
            <p class="tagline">Illuminating positive impact across the globe</p>
            
            <div class="candle-visualization">
                <div class="dark-zone" data-section="dark">
                    <span class="dark-label">The Dark</span>
                </div>
                
                <div class="light-zone" data-section="light">
                    <span class="light-label">The Light</span>
                </div>
                
                <div class="wax-zone" data-section="wax">
                    <svg width="120" height="280" viewBox="0 0 120 280">
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
                
                <div class="wick-zone" data-section="wick">
                    <svg width="120" height="50" viewBox="0 0 120 50">
                        <rect x="55" y="0" width="10" height="45" fill="#2a2a2a" rx="2"/>
                    </svg>
                </div>
                
                <div class="flame-zone" data-section="flame">
                    <svg width="120" height="100" viewBox="0 0 120 100" class="flame">
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
        </div>
    `;
}

// Render section page
function renderSectionPage(section) {
    const sectionConfig = {
        flame: {
            icon: '🔥',
            title: 'The Flame',
            description: 'The most exciting and inspirational stories of positive impact'
        },
        light: {
            icon: '💡',
            title: 'The Light',
            description: 'Reports on wider impact and solid positive change'
        },
        dark: {
            icon: '🌑',
            title: 'The Dark',
            description: 'Understanding the problems that make positive work necessary'
        },
        wax: {
            icon: '🕯️',
            title: 'The Wax',
            description: 'Support organizations making a difference'
        },
        wick: {
            icon: '🔥',
            title: 'The Wick',
            description: 'About The Candle'
        }
    };
    
    const config = sectionConfig[section];
    
    if (section === 'wax') {
        return renderWaxPage(config);
    }
    
    if (section === 'wick') {
        return renderWickPage(config);
    }
    
    const sectionStories = stories[section] || [];
    
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
                    sectionStories.map(story => renderStoryCard(story)).join('')
                }
            </div>
        </div>
    `;
}

// Render story card
function renderStoryCard(story) {
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
            <a href="${story.source_url}" target="_blank" class="source-link">Read Source →</a>
        </div>
    `;
}

// Render wax page
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

// Render wick page
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
                
                <div class="story-card">
                    <h3>Join Our Team</h3>
                    <p class="story-summary">
                        Currently, The Candle is in prototype phase. We're exploring partnerships with impact organizations and building our technology platform. If you're interested in contributing to this mission, we'd love to hear from you.
                    </p>
                </div>
                
                <div class="story-card">
                    <h3>Admin Access</h3>
                    <p class="story-summary">
                        <a class="back-button" data-action="admin" style="color: #d4a017; cursor: pointer;">→ Go to Admin Panel</a>
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Render password modal
function renderPasswordModal() {
    return `
        <div class="password-modal">
            <div class="password-modal-content">
                <h2>Admin Access</h2>
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

// Render admin page
function renderAdminPage() {
    return `
        <div class="admin-page">
            <div class="section-content">
                <a class="back-button" data-action="home">← Back to Home</a>
                
                <div class="admin-form">
                    <h2>Add New Story</h2>
                    
                    <div class="form-group">
                        <label>URL</label>
                        <input type="url" id="url-input" placeholder="https://example.com/positive-impact-story">
                    </div>
                    
                    <div class="form-group">
                        <label>Notes (Optional)</label>
                        <textarea id="notes-input" placeholder="Any additional context or notes about this story..."></textarea>
                    </div>
                    
                    <button class="btn" id="process-btn" onclick="processStory()">Process & Add Story</button>
                    
                    <div id="status-message"></div>
                    
                    <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 6px;">
                        <h3 style="color: #333; margin-bottom: 10px;">How it works:</h3>
                        <ol style="margin-left: 20px; color: #666;">
                            <li>Paste a URL from a charity, NGO, business, or government site</li>
                            <li>Claude will fetch and analyze the content</li>
                            <li>AI creates a 300-word summary and extracts impact metrics</li>
                            <li>Story is automatically categorized (Flame/Light/Dark)</li>
                            <li>Story is saved to the database and appears on the site!</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Check password
function checkPassword() {
    const input = document.getElementById('password-input');
    const error = document.getElementById('password-error');
    
    if (input.value === ADMIN_PASSWORD) {
        isAuthenticated = true;
        renderApp();
    } else {
        error.classList.remove('hidden');
    }
}

// Process story with Claude
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
    statusDiv.innerHTML = '<div class="status-message info">Fetching and analyzing content...</div>';
    
    try {
        // Call Claude API to process the URL
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: `Please fetch and analyze this URL: ${url}

I need you to:
1. Summarize the content in 300 words, focusing on positive impact
2. Extract key information: organization name, location, project details
3. Identify 3-5 key impact metrics as bullet points
4. Categorize this story as either:
   - "flame" (most exciting, inspirational stories)
   - "light" (wider impact reports, solid positive news)
   - "dark" (contextual problems that make the positive work necessary)

Additional context from user: ${notes || 'None provided'}

Respond ONLY with valid JSON in this exact format:
{
  "summary": "300 word summary here",
  "organization": "Organization name",
  "location": "Location",
  "impactMetrics": ["Metric 1", "Metric 2", "Metric 3"],
  "category": "flame or light or dark",
  "sourceUrl": "${url}",
  "title": "Compelling title for this story"
}

DO NOT include anything except the JSON object. No markdown, no backticks, no explanations.`
                }]
            })
        });
        
        const data = await response.json();
        let responseText = data.content[0].text;
        
        // Strip markdown if present
        responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        
        const storyData = JSON.parse(responseText);
        
        // Save to Supabase
        const { error } = await supabase
            .from('stories')
            .insert([{
                title: storyData.title,
                organization: storyData.organization,
                location: storyData.location,
                summary: storyData.summary,
                impact_metrics: storyData.impactMetrics,
                category: storyData.category,
                source_url: storyData.sourceUrl
            }]);
        
        if (error) throw error;
        
        statusDiv.innerHTML = '<div class="status-message success">✓ Story added successfully!</div>';
        urlInput.value = '';
        notesInput.value = '';
        
        // Reload stories
        await loadStories();
        
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
        
    } catch (error) {
        console.error('Error:', error);
        statusDiv.innerHTML = `<div class="status-message error">Error: ${error.message}</div>`;
    } finally {
        processBtn.disabled = false;
        processBtn.textContent = 'Process & Add Story';
    }
}

// Setup event listeners
function setupEventListeners() {
    document.addEventListener('click', (e) => {
        const target = e.target;
        
        // Handle section navigation
        if (target.dataset.section) {
            currentPage = target.dataset.section;
            renderApp();
            window.scrollTo(0, 0);
        }
        
        // Handle action buttons
        if (target.dataset.action) {
            if (target.dataset.action === 'home') {
                currentPa
