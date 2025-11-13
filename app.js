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
let editingStory = null;

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
                
                <div class="flame-zone" data-section="flame" style="pointer-events: auto; width: 120px; height: 100px;">
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
            
            <!-- Email Capture Footer -->
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
        flame: { icon: '🔥', title: 'The Flame', description: 'The most exciting and inspirational stories of positive impact' },
        light: { icon: '💡', title: 'The Light', description: 'Reports on wider impact and solid positive change' },
        dark: { icon: '🌑', title: 'The Dark', description: 'Understanding the problems that make positive work necessary' },
        wax: { icon: '🕯️', title: 'The Wax', description: 'Support organizations making a difference' },
        wick: { icon: '🔥', title: 'The Wick', description: 'About The Candle' }
    };
    
    const config = sectionConfig[section];
    
    if (section === 'wax') {
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
    
    if (section === 'wick') {
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
                        <h3>Admin Access</h3>
                        <p class="story-summary">
                            <a class="back-button" data-action="admin" style="color: #d4a017; cursor: pointer;">→ Go to Admin Panel</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
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

function renderStoryCard(story) {
    const utmLink = generateUTMLink(story.source_url, story.title);
    const editButton = isAuthenticated ? 
        `<button onclick="editStory(${story.id})" style="margin-left: 15px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Edit Story</button>` 
        : '';
    
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
            ${story.context_sources && story.context_sources.length > 0 ? `
                <div class="impact-metrics" style="margin-top: 20px;">
                    <h4>Context & Background:</h4>
                    <p style="color: #666; font-size: 0.9rem; margin-bottom: 10px;">Understanding the challenges this initiative addresses</p>
                    <ul>
                        ${story.context_sources.map(ctx => `<li>${ctx}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            <div style="margin-top: 20px;">
                <a href="${utmLink}" target="_blank" class="source-link">Read Source →</a>
                ${editButton}
            </div>
        </div>
    `;
}

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

function renderAdminPage() {
    const isEditing = editingStory !== null;
    const story = isEditing ? editingStory : {};
    
    return `
        <div class="admin-page">
            <div class="section-content">
                <a class="back-button" data-action="home">← Back to Home</a>
                <div class="admin-form">
                    <h2>${isEditing ? 'Edit Story' : 'Add New Story'}</h2>
                    
                    ${isEditing ? `
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
                            <label>Source URL</label>
                            <input type="url" id="source-input" value="${story.source_url || ''}" />
                        </div>
                        <button class="btn" onclick="saveEditedStory()">Save Changes</button>
                        <button class="btn" onclick="cancelEdit()" style="background: #6c757d; margin-left: 10px;">Cancel</button>
                    ` : `
                        <div class="form-group">
                            <label>URL</label>
                            <input type="url" id="url-input" placeholder="https://example.com/positive-impact-story">
                        </div>
                        <div class="form-group">
                            <label>Notes (Optional)</label>
                            <textarea id="notes-input" placeholder="Any additional context..."></textarea>
                        </div>
                        <button class="btn" id="process-btn" onclick="processStory()">Process & Add Story</button>
                    `}
                    
                    <div id="status-message"></div>
                </div>
            </div>
        </div>
    `;
}

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
            if (error.code === '23505') { // Unique constraint violation
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

function editStory(storyId) {
    // Find the story in our stories object
    let foundStory = null;
    for (const category in stories) {
        const story = stories[category].find(s => s.id === storyId);
        if (story) {
            foundStory = story;
            break;
        }
    }
    
    if (foundStory) {
        editingStory = foundStory;
        currentPage = 'admin';
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
        const updatedStory = {
            title: document.getElementById('title-input').value,
            organization: document.getElementById('org-input').value,
            location: document.getElementById('location-input').value,
            summary: document.getElementById('summary-input').value,
            impact_metrics: document.getElementById('metrics-input').value.split('\n').filter(m => m.trim()),
            category: document.getElementById('category-input').value,
            source_url: document.getElementById('source-input').value
        };
        
        const { error } = await supabase
            .from('stories')
            .update(updatedStory)
            .eq('id', editingStory.id);
        
        if (error) throw error;
        
        statusDiv.innerHTML = '<div class="status-message success">✓ Story updated!</div>';
        editingStory = null;
        await loadStories();
        
        setTimeout(() => {
            currentPage = 'home';
            renderApp();
        }, 1500);
        
    } catch (error) {
        statusDiv.innerHTML = `<div class="status-message error">Error: ${error.message}</div>`;
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
    statusDiv.innerHTML = '<div class="status-message info">Analyzing content with AI and searching for context...</div>';
    
    try {
        const response = await fetch('/.netlify/functions/process-story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, notes })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Processing failed');
        }

        const storyData = await response.json();
        
        // Store context search queries as context sources for now
        const contextSources = storyData.contextSummary ? 
            [storyData.contextSummary] : [];
        
        const { error } = await supabase.from('stories').insert([{
            title: storyData.title,
            organization: storyData.organization,
            location: storyData.location,
            summary: storyData.summary,
            impact_metrics: storyData.impactMetrics,
            category: storyData.category,
            source_url: storyData.sourceUrl,
            context_sources: contextSources,
            utm_campaign: 'positive-impact'
        }]);
        
        if (error) throw error;
        
        statusDiv.innerHTML = `
            <div class="status-message success">
                ✓ Story added!<br>
                <small style="margin-top: 10px; display: block;">
                    <strong>Context to explore:</strong><br>
                    ${storyData.contextSearchQueries ? storyData.contextSearchQueries.map(q => `• ${q}`).join('<br>') : 'None suggested'}
                </small>
            </div>
        `;
        urlInput.value = '';
        notesInput.value = '';
        await loadStories();
        
    } catch (error) {
        statusDiv.innerHTML = `<div class="status-message error">Error: ${error.message}</div>`;
    } finally {
        processBtn.disabled = false;
        processBtn.textContent = 'Process & Add Story';
    }
}

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
    });
    
    document.addEventListener('mouseenter', (e) => {
        const target = e.target.closest('[data-section]');
        if (target && currentPage === 'home') {
            const tooltips = {
                flame: { title: '🔥 The Flame', desc: 'Most exciting stories' },
                light: { title: '💡 The Light', desc: 'Wider impact reports' },
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
        if (e.target.closest('[data-section]') && currentPage === 'home') {
            const tooltip = document.getElementById('tooltip');
            if (tooltip) tooltip.classList.remove('active');
        }
    }, true);
}

window.addEventListener('DOMContentLoaded', init);
