// ==================== JARVIS AI TELEGRAM MINI APP V2 - FIXED ====================

// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Set theme colors
tg.setHeaderColor('#0a0e1a');
tg.setBackgroundColor('#0a0e1a');

// App State
const appState = {
    currentSymbol: 'BTCUSDT',
    currentAssetName: 'BTC',
    currentTimeframe: '1d',
    currentInterval: '1d',
    strategy: new TradingStrategy(),
    refreshInterval: 30,
    refreshTimer: null,
    autoTrack: true
};

// ==================== BINANCE API INTEGRATION ====================

async function fetchKlines(symbol, interval, limit = 200) {
    const baseUrl = 'https://api.binance.com/api/v3/klines';
    const url = `${baseUrl}?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        return data.map(candle => ({
            timestamp: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        return null;
    }
}

async function fetchCurrentPrice(symbol) {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return parseFloat(data.price);
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        return null;
    }
}

// ==================== UI UPDATE FUNCTIONS ====================

function updateCurrentAnalysis(analysis, price) {
    // Update symbol and timeframe
    document.getElementById('current-symbol').textContent = appState.currentAssetName;
    document.getElementById('current-timeframe').textContent = appState.currentTimeframe.toUpperCase();
    
    // Update price
    if (price) {
        const decimals = price < 1 ? 4 : 2;
        document.getElementById('current-price').textContent = `$${price.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })}`;
    }

    if (!analysis) return;

    // Update metrics
    const trendElement = document.getElementById('metric-trend');
    trendElement.textContent = analysis.marketTrend;
    trendElement.className = `metric-value ${analysis.trendClass}`;

    const rsiElement = document.getElementById('metric-rsi');
    rsiElement.textContent = analysis.rsi;
    const rsiValue = parseFloat(analysis.rsi);
    if (!isNaN(rsiValue)) {
        if (rsiValue > 70) {
            rsiElement.className = 'metric-value bearish-trend';
        } else if (rsiValue < 30) {
            rsiElement.className = 'metric-value bullish-trend';
        } else {
            rsiElement.className = 'metric-value neutral-trend';
        }
    }

    // Update signal display
    const signalDisplay = document.getElementById('signal-display');
    const signalMetric = document.getElementById('metric-signal');

    // Check for active signal first
    const activeSignal = analysis.activeSignal || analysis.signal;

    if (activeSignal) {
        signalMetric.textContent = activeSignal.type;
        signalMetric.className = activeSignal.type === 'LONG' ? 'metric-value bullish-trend' : 'metric-value bearish-trend';

        const decimals = activeSignal.entry < 1 ? 4 : 2;
        signalDisplay.innerHTML = `
            <div class="active-signal">
                <div class="signal-type-badge ${activeSignal.type.toLowerCase()}">
                    <span>${activeSignal.type === 'LONG' ? '📈' : '📉'}</span>
                    <span>${activeSignal.type} SIGNAL</span>
                </div>
                <div class="signal-prices">
                    <div class="price-item">
                        <span class="price-label">Entry</span>
                        <span class="price-value entry">$${activeSignal.entry.toFixed(decimals)}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">Stop Loss</span>
                        <span class="price-value stop-loss">$${activeSignal.stopLoss.toFixed(decimals)}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">Take Profit</span>
                        <span class="price-value take-profit">$${activeSignal.takeProfit.toFixed(decimals)}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">Risk/Reward</span>
                        <span class="price-value rr">1:${activeSignal.rr}</span>
                    </div>
                </div>
            </div>
        `;

        // Check if signal was closed
        if (analysis.signalCheck && analysis.signalCheck.closed) {
            showTradeClosedNotification(analysis.signalCheck.trade);
        }
    } else {
        signalMetric.textContent = 'WAITING';
        signalMetric.className = 'metric-value neutral-trend';
        
        signalDisplay.innerHTML = `
            <div class="no-signal">
                <div class="no-signal-icon">🎯</div>
                <p>Waiting for optimal entry...</p>
            </div>
        `;
    }
}

function showTradeClosedNotification(trade) {
    const message = trade.result === 'win' 
        ? `✅ ${trade.symbol} ${trade.type} closed in profit! Exit: $${trade.exitPrice.toFixed(4)} (${trade.pnl})`
        : `❌ ${trade.symbol} ${trade.type} stopped out. Exit: $${trade.exitPrice.toFixed(4)} (${trade.pnl})`;

    if (tg.showAlert) {
        tg.showAlert(message);
    }

    // Refresh history tab
    updateHistoryTab();
}

// ==================== HISTORY TAB FUNCTIONS ====================

function updateHistoryTab() {
    const stats = appState.strategy.getTradeStats();

    // Update stats
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-wins').textContent = stats.wins;
    document.getElementById('stat-losses').textContent = stats.losses;
    document.getElementById('stat-winrate').textContent = `${stats.winRate}%`;

    // Update history list with current filter
    const activeFilter = document.querySelector('.filter-btn.active');
    const filter = activeFilter ? activeFilter.dataset.filter : 'all';
    displayTradeHistory(filter);
}

function displayTradeHistory(filter = 'all') {
    const historyList = document.getElementById('history-list');
    const trades = appState.strategy.filterTradeHistory(filter);

    if (trades.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">📝</div>
                <p>No trades found</p>
                <p class="empty-subtext">
                    ${filter === 'all' ? 'Signals will be tracked automatically' : `No ${filter} trades yet`}
                </p>
            </div>
        `;
        return;
    }

    historyList.innerHTML = trades.map(trade => createHistoryCard(trade)).join('');
}

function createHistoryCard(trade) {
    const entryDate = new Date(trade.entryTime).toLocaleDateString();
    const decimals = trade.entry < 1 ? 4 : 2;

    return `
        <div class="history-card ${trade.result}">
            <div class="history-header">
                <div class="history-asset">
                    ${trade.symbol.replace('USDT', '')} 
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${trade.timeframe.toUpperCase()}</span>
                </div>
                <div class="history-result ${trade.result}">
                    ${trade.result === 'win' ? '✅ WIN' : '❌ LOSS'}
                </div>
            </div>
            <div class="history-details">
                <div class="history-detail">
                    <span class="history-label">Type:</span>
                    <span class="history-value">${trade.type}</span>
                </div>
                <div class="history-detail">
                    <span class="history-label">Entry:</span>
                    <span class="history-value">$${trade.entry.toFixed(decimals)}</span>
                </div>
                <div class="history-detail">
                    <span class="history-label">Exit:</span>
                    <span class="history-value">$${trade.exitPrice ? trade.exitPrice.toFixed(decimals) : '--'}</span>
                </div>
                <div class="history-detail">
                    <span class="history-label">Exit Type:</span>
                    <span class="history-value">${trade.exitType ? trade.exitType.toUpperCase() : '--'}</span>
                </div>
                <div class="history-detail">
                    <span class="history-label">P&L:</span>
                    <span class="history-value" style="color: ${trade.result === 'win' ? 'var(--cyber-green)' : 'var(--cyber-red)'}">
                        ${trade.pnl || '--'}
                    </span>
                </div>
                <div class="history-detail">
                    <span class="history-label">Date:</span>
                    <span class="history-value">${entryDate}</span>
                </div>
            </div>
        </div>
    `;
}

// ==================== DATA FETCHING & ANALYSIS ====================

async function analyzeCurrentAsset() {
    const symbol = appState.currentSymbol;
    const interval = appState.currentInterval;
    const timeframe = appState.currentTimeframe;

    try {
        // Show loading
        const signalDisplay = document.getElementById('signal-display');
        signalDisplay.innerHTML = `
            <div class="no-signal">
                <div class="loading-spinner"></div>
                <p>Analyzing ${appState.currentAssetName}...</p>
            </div>
        `;

        // Fetch data
        const candles = await fetchKlines(symbol, interval);
        const price = await fetchCurrentPrice(symbol);

        if (!candles || candles.length < 100) {
            console.error(`Insufficient data for ${symbol}`);
            updateCurrentAnalysis(null, price);
            return;
        }

        // Analyze
        const analysis = appState.strategy.analyzeMarket(candles, symbol, timeframe);
        
        // Update UI
        updateCurrentAnalysis(analysis, price);
        
        // Update last update time
        updateLastUpdateTime();

    } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
    }
}

// ==================== EVENT HANDLERS ====================

// Tab Navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // If switching to history, update it
        if (tabName === 'history') {
            updateHistoryTab();
        }

        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
});

// Asset Selection
document.querySelectorAll('.asset-card').forEach(card => {
    card.addEventListener('click', async () => {
        // Update active state
        document.querySelectorAll('.asset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        // Update app state
        appState.currentSymbol = card.dataset.symbol;
        appState.currentAssetName = card.dataset.name;
        
        // Re-analyze
        await analyzeCurrentAsset();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
});

// Timeframe Selection
document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        // Update active state
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update timeframe
        appState.currentTimeframe = btn.dataset.timeframe;
        appState.currentInterval = btn.dataset.interval;
        
        // Re-analyze
        await analyzeCurrentAsset();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
});

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeSettings = document.getElementById('close-settings');

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});

// Trading Style Selection
document.querySelectorAll('.style-option').forEach(option => {
    option.addEventListener('click', () => {
        // Update buttons
        document.querySelectorAll('.style-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        
        // Update strategy
        const style = option.dataset.style;
        appState.strategy.setTradingStyle(style);
        
        // Update display
        const styleNames = {
            'day': 'Day Trading',
            'swing': 'Swing Trading',
            'scalp': 'Scalping'
        };
        document.getElementById('current-style').textContent = styleNames[style];
        
        // Re-analyze with new style
        analyzeCurrentAsset();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    });
});

// Refresh Interval Selection
document.querySelectorAll('.refresh-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.refresh-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        
        appState.refreshInterval = parseInt(option.dataset.refresh);
        
        // Restart timer
        startRefreshTimer();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
});

// Auto-track Toggle
document.getElementById('auto-track').addEventListener('change', (e) => {
    appState.autoTrack = e.target.checked;
});

// History Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Filter history
        const filter = btn.dataset.filter;
        displayTradeHistory(filter);
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
});

// ==================== AUTO-REFRESH ====================

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
    document.getElementById('last-update').textContent = timeString;
}

function startRefreshTimer() {
    let secondsLeft = appState.refreshInterval;
    
    // Clear existing timer
    if (appState.refreshTimer) {
        clearInterval(appState.refreshTimer);
    }
    
    // Start new timer
    appState.refreshTimer = setInterval(() => {
        secondsLeft--;
        
        if (secondsLeft <= 0) {
            secondsLeft = appState.refreshInterval;
            analyzeCurrentAsset();
        }
    }, 1000);
}

// ==================== INITIALIZATION ====================

async function initializeApp() {
    try {
        // Initial analysis
        await analyzeCurrentAsset();
        
        // Start auto-refresh
        startRefreshTimer();
        
        // Initialize history tab
        updateHistoryTab();
        
        // Notify Telegram that app is ready
        tg.MainButton.hide();
        
        console.log('JARVIS AI V2 initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (appState.refreshTimer) {
            clearInterval(appState.refreshTimer);
        }
    } else {
        analyzeCurrentAsset();
        startRefreshTimer();
    }
});

// Start the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
