// ==================== JARVIS AI TELEGRAM MINI APP ====================

// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Set theme colors
tg.setHeaderColor('#0a0e1a');
tg.setBackgroundColor('#0a0e1a');

// App State
const appState = {
    currentTimeframe: '1d',
    strategy: new TradingStrategy(),
    refreshInterval: 30, // seconds
    refreshTimer: null,
    symbols: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT']
};

// ==================== BINANCE API INTEGRATION ====================

// Fetch OHLCV data from Binance
async function fetchKlines(symbol, interval, limit = 200) {
    const baseUrl = 'https://api.binance.com/api/v3/klines';
    const url = `${baseUrl}?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Convert to candle format
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

// Fetch current price
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

// Update sentiment card
function updateSentimentCard(symbol, analysis, price) {
    const symbolLower = symbol.replace('USDT', '').toLowerCase();
    
    // Update price
    const priceElement = document.getElementById(`${symbolLower}-price`);
    if (priceElement && price) {
        priceElement.textContent = `$${price.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;
    }
    
    if (!analysis) return;
    
    // Update trend
    const trendElement = document.getElementById(`${symbolLower}-trend`);
    if (trendElement) {
        trendElement.textContent = analysis.marketTrend;
        trendElement.className = `detail-value ${analysis.trendClass}`;
    }
    
    // Update RSI
    const rsiElement = document.getElementById(`${symbolLower}-rsi`);
    if (rsiElement) {
        rsiElement.textContent = analysis.rsi;
        const rsiValue = parseFloat(analysis.rsi);
        if (!isNaN(rsiValue)) {
            if (rsiValue > 70) {
                rsiElement.className = 'detail-value bearish-trend';
            } else if (rsiValue < 30) {
                rsiElement.className = 'detail-value bullish-trend';
            } else {
                rsiElement.className = 'detail-value neutral-trend';
            }
        }
    }
    
    // Update sentiment bar
    const fillElement = document.getElementById(`${symbolLower}-sentiment-fill`);
    const labelElement = document.getElementById(`${symbolLower}-sentiment-label`);
    
    if (fillElement && labelElement) {
        let sentimentPercent = 50;
        let sentimentColor = '#6b7389';
        let sentimentLabel = 'NEUTRAL';
        
        if (analysis.marketTrend.includes('BULLISH')) {
            sentimentPercent = analysis.marketTrend.includes('STRONG') ? 85 : 70;
            sentimentColor = '#00ff88';
            sentimentLabel = analysis.marketTrend;
        } else if (analysis.marketTrend.includes('BEARISH')) {
            sentimentPercent = analysis.marketTrend.includes('STRONG') ? 15 : 30;
            sentimentColor = '#ff0055';
            sentimentLabel = analysis.marketTrend;
        }
        
        fillElement.style.width = `${sentimentPercent}%`;
        fillElement.style.backgroundColor = sentimentColor;
        labelElement.textContent = sentimentLabel;
        labelElement.style.color = sentimentColor;
    }
}

// Create signal card HTML
function createSignalCard(signal) {
    const typeClass = signal.type.toLowerCase();
    const icon = signal.type === 'LONG' ? '📈' : '📉';
    const displaySymbol = signal.symbol.replace('USDT', '');
    
    return `
        <div class="signal-card ${typeClass} fade-in">
            <div class="signal-header">
                <div class="signal-asset">
                    <div class="asset-name">${displaySymbol}</div>
                    <div class="asset-timeframe">${signal.timeframe.toUpperCase()}</div>
                </div>
                <div class="signal-type ${typeClass}">
                    <span class="signal-icon">${icon}</span>
                    ${signal.type}
                </div>
            </div>
            <div class="signal-details">
                <div class="signal-detail">
                    <span class="detail-label">Entry Price</span>
                    <span class="detail-value entry">$${signal.entry.toFixed(4)}</span>
                </div>
                <div class="signal-detail">
                    <span class="detail-label">Stop Loss</span>
                    <span class="detail-value stop-loss">$${signal.stopLoss.toFixed(4)}</span>
                </div>
                <div class="signal-detail">
                    <span class="detail-label">Take Profit</span>
                    <span class="detail-value take-profit">$${signal.takeProfit.toFixed(4)}</span>
                </div>
                <div class="signal-detail">
                    <span class="detail-label">Risk/Reward</span>
                    <span class="detail-value rr">1:${signal.rr}</span>
                </div>
            </div>
        </div>
    `;
}

// Update signals display
function updateSignalsDisplay(signals) {
    const container = document.getElementById('signals-container');
    
    if (signals.length === 0) {
        container.innerHTML = `
            <div class="no-signals fade-in">
                <div class="no-signals-icon">🎯</div>
                <p>No active signals at the moment</p>
                <p style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.7;">
                    Waiting for optimal entry conditions...
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = signals.map(signal => createSignalCard(signal)).join('');
}

// ==================== DATA FETCHING & ANALYSIS ====================

// Analyze all symbols for current timeframe
async function analyzeAllSymbols() {
    const interval = appState.currentTimeframe === '1d' ? '1d' : '15m';
    const signals = [];
    
    // Show loading state
    const container = document.getElementById('signals-container');
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Analyzing market structure...</p>
        </div>
    `;
    
    // Fetch and analyze each symbol
    for (const symbol of appState.symbols) {
        try {
            // Fetch candle data
            const candles = await fetchKlines(symbol, interval);
            const price = await fetchCurrentPrice(symbol);
            
            if (!candles || candles.length < 100) {
                console.error(`Insufficient data for ${symbol}`);
                updateSentimentCard(symbol, null, price);
                continue;
            }
            
            // Analyze with strategy
            const analysis = appState.strategy.analyzeMarket(
                candles, 
                symbol, 
                appState.currentTimeframe
            );
            
            // Update sentiment
            updateSentimentCard(symbol, analysis, price);
            
            // Add signal if present
            if (analysis.signal) {
                signals.push(analysis.signal);
            }
            
        } catch (error) {
            console.error(`Error analyzing ${symbol}:`, error);
        }
    }
    
    // Update signals display
    updateSignalsDisplay(signals);
    
    // Update last update time
    updateLastUpdateTime();
}

// ==================== UI INTERACTIONS ====================

// Timeframe selector
document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        // Update active state
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update timeframe
        appState.currentTimeframe = btn.dataset.timeframe;
        
        // Re-analyze
        await analyzeAllSymbols();
        
        // Provide haptic feedback
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
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('last-update').textContent = timeString;
}

function startRefreshTimer() {
    let secondsLeft = appState.refreshInterval;
    
    // Update timer display
    const updateTimerDisplay = () => {
        document.getElementById('refresh-timer').textContent = `${secondsLeft}s`;
        secondsLeft--;
        
        if (secondsLeft < 0) {
            secondsLeft = appState.refreshInterval;
            analyzeAllSymbols();
        }
    };
    
    // Clear existing timer
    if (appState.refreshTimer) {
        clearInterval(appState.refreshTimer);
    }
    
    // Start new timer
    updateTimerDisplay();
    appState.refreshTimer = setInterval(updateTimerDisplay, 1000);
}

// ==================== INITIALIZATION ====================

async function initializeApp() {
    try {
        // Initial analysis
        await analyzeAllSymbols();
        
        // Start auto-refresh
        startRefreshTimer();
        
        // Notify Telegram that app is ready
        tg.MainButton.hide();
        
        console.log('JARVIS AI initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        
        // Show error to user
        const container = document.getElementById('signals-container');
        container.innerHTML = `
            <div class="no-signals fade-in">
                <div class="no-signals-icon">⚠️</div>
                <p>Unable to load market data</p>
                <p style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.7;">
                    Please check your connection and try again
                </p>
            </div>
        `;
    }
}

// Handle visibility changes (pause when app is hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (appState.refreshTimer) {
            clearInterval(appState.refreshTimer);
        }
    } else {
        analyzeAllSymbols();
        startRefreshTimer();
    }
});

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
