// ==================== JARVIS AI TELEGRAM MINI APP V4 - ULTIMATE FIXED ====================

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
    autoTrack: true,
    allPairs: [],
    filteredPairs: [],
    favorites: [],
    currentFilter: 'favorites',
    chart: null,
    currentExplanation: null,
    musicEnabled: false,
    musicVolume: 0.5,
    gameBalance: 1000,
    gameWins: 0,
    gameLosses: 0
};

// Audio Elements
const backgroundMusic = document.getElementById('background-music');
const coinFlipSound = document.getElementById('coin-flip-sound');
const winSound = document.getElementById('win-sound');
const loseSound = document.getElementById('lose-sound');

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('JARVIS AI Loading...');
    
    // Load saved game state
    loadGameState();
    
    // Initialize all components
    await fetchAllTradingPairs();
    setupEventListeners();
    setupChart();
    loadMarketSentiment();
    
    // Start with default asset
    await analyzeAsset('BTCUSDT', 'BTC');
    
    // Start auto-refresh
    startAutoRefresh();
    
    console.log('JARVIS AI Ready!');
});

// ==================== BINANCE API - FETCH ALL PAIRS ====================

async function fetchAllTradingPairs() {
    try {
        const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
        const data = await response.json();
        
        // Filter for USDT pairs only and active symbols
        const usdtPairs = data.symbols
            .filter(s => s.symbol.endsWith('USDT') && s.status === 'TRADING')
            .map(s => ({
                symbol: s.symbol,
                baseAsset: s.baseAsset,
                name: s.baseAsset,
                isFavorite: false
            }));
        
        appState.allPairs = usdtPairs;
        
        // Load favorites from storage
        loadFavorites();
        
        // Display initial pairs
        filterPairs('favorites');
        
        console.log(`Loaded ${usdtPairs.length} trading pairs`);
        return usdtPairs;
    } catch (error) {
        console.error('Error fetching trading pairs:', error);
        showError('Failed to load trading pairs. Please check your connection.');
        return [];
    }
}

// ==================== FAVORITES MANAGEMENT ====================

function loadFavorites() {
    try {
        const saved = localStorage.getItem('jarvis_favorites');
        const favoriteSymbols = saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'DOGEUSDT', 'DOTUSDT'];
        
        appState.favorites = favoriteSymbols;
        
        // Mark favorites in allPairs
        appState.allPairs.forEach(pair => {
            pair.isFavorite = favoriteSymbols.includes(pair.symbol);
        });
    } catch (error) {
        console.error('Error loading favorites:', error);
        appState.favorites = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'SOLUSDT', 'ADAUSDT'];
    }
}

function saveFavorites() {
    try {
        localStorage.setItem('jarvis_favorites', JSON.stringify(appState.favorites));
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

function toggleFavorite(symbol) {
    const index = appState.favorites.indexOf(symbol);
    
    if (index > -1) {
        appState.favorites.splice(index, 1);
    } else {
        appState.favorites.push(symbol);
    }
    
    // Update in allPairs
    const pair = appState.allPairs.find(p => p.symbol === symbol);
    if (pair) {
        pair.isFavorite = !pair.isFavorite;
    }
    
    saveFavorites();
    updateFavoriteButton();
    
    // Refresh display if on favorites filter
    if (appState.currentFilter === 'favorites') {
        filterPairs('favorites');
    }
}

function updateFavoriteButton() {
    const btn = document.getElementById('favorite-btn');
    if (btn) {
        const isFavorite = appState.favorites.includes(appState.currentSymbol);
        btn.innerHTML = isFavorite ? '⭐' : '☆';
        btn.style.color = isFavorite ? '#ffd700' : '#666';
    }
}

// ==================== ASSET FILTERING ====================

function filterPairs(filterType) {
    appState.currentFilter = filterType;
    
    let filtered = [];
    
    switch (filterType) {
        case 'favorites':
            filtered = appState.allPairs.filter(p => p.isFavorite);
            break;
        case 'top':
            // Top 20 by market cap (simplified - using popular coins)
            const topCoins = ['BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'SOL', 'DOT', 'MATIC', 'SHIB', 
                             'AVAX', 'UNI', 'LINK', 'ATOM', 'LTC', 'ETC', 'XLM', 'ALGO', 'VET', 'ICP'];
            filtered = appState.allPairs.filter(p => topCoins.includes(p.baseAsset));
            break;
        case 'defi':
            const defiCoins = ['UNI', 'AAVE', 'LINK', 'SNX', 'COMP', 'MKR', 'YFI', 'SUSHI', 'CRV', 'CAKE'];
            filtered = appState.allPairs.filter(p => defiCoins.includes(p.baseAsset));
            break;
        case 'meme':
            const memeCoins = ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONE', 'ELON'];
            filtered = appState.allPairs.filter(p => memeCoins.includes(p.baseAsset));
            break;
        case 'all':
            filtered = appState.allPairs;
            break;
        default:
            filtered = appState.allPairs;
    }
    
    appState.filteredPairs = filtered;
    displayAssets(filtered);
    updateAssetCount(filtered.length);
}

function searchAssets(searchTerm) {
    if (!searchTerm) {
        filterPairs(appState.currentFilter);
        return;
    }
    
    const term = searchTerm.toUpperCase();
    const filtered = appState.allPairs.filter(p => 
        p.symbol.includes(term) || p.baseAsset.includes(term)
    );
    
    appState.filteredPairs = filtered;
    displayAssets(filtered);
    updateAssetCount(filtered.length);
}

function displayAssets(assets) {
    const container = document.getElementById('crypto-assets');
    
    if (assets.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <p>No assets found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = assets.slice(0, 100).map(asset => `
        <div class="asset-card" data-symbol="${asset.symbol}" data-name="${asset.baseAsset}">
            <div class="asset-name">${asset.baseAsset}</div>
            <div class="asset-symbol">${asset.symbol}</div>
            ${asset.isFavorite ? '<div class="asset-favorite">⭐</div>' : ''}
        </div>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('.asset-card').forEach(card => {
        card.addEventListener('click', () => {
            const symbol = card.dataset.symbol;
            const name = card.dataset.name;
            selectAsset(symbol, name);
        });
    });
}

function updateAssetCount(count) {
    const countEl = document.getElementById('asset-count');
    if (countEl) {
        countEl.textContent = `${count} pairs available`;
    }
}

async function selectAsset(symbol, name) {
    appState.currentSymbol = symbol;
    appState.currentAssetName = name;
    
    // Update UI
    document.getElementById('current-symbol').textContent = name;
    updateFavoriteButton();
    
    // Analyze
    await analyzeAsset(symbol, name);
}

// ==================== MARKET ANALYSIS ====================

async function analyzeAsset(symbol, assetName) {
    try {
        // Show loading
        showAnalysisLoading();
        
        // Fetch candle data
        const candles = await fetchCandleData(symbol, appState.currentInterval);
        
        if (!candles || candles.length === 0) {
            showError('Unable to fetch market data');
            return;
        }
        
        // Get current price
        const currentPrice = candles[candles.length - 1].close;
        
        // Update price display
        document.getElementById('current-price').textContent = `$${currentPrice.toFixed(2)}`;
        
        // Run strategy analysis
        const analysis = appState.strategy.analyzeMarket(candles, symbol, appState.currentTimeframe);
        
        if (analysis.error) {
            showError(analysis.error);
            return;
        }
        
        // Update metrics
        document.getElementById('metric-trend').textContent = analysis.marketTrend;
        document.getElementById('metric-trend').className = `metric-value ${analysis.trendClass}`;
        document.getElementById('metric-rsi').textContent = analysis.rsi;
        
        // Display signal or active signal
        if (analysis.signal) {
            displaySignal(analysis.signal);
            if (appState.autoTrack) {
                showNotification(`${analysis.signal.type} Signal Generated for ${assetName}!`);
            }
        } else if (analysis.activeSignal) {
            displayActiveSignal(analysis.activeSignal, currentPrice);
        } else {
            showNoSignal();
        }
        
        // Update chart if visible
        if (document.getElementById('chart-tab').classList.contains('active')) {
            updateChart(candles, analysis);
        }
        
        // Update last update time
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Analysis failed. Retrying...');
    }
}

async function fetchCandleData(symbol, interval) {
    try {
        const limit = 200; // Fetch enough data for indicators
        const response = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
        );
        const data = await response.json();
        
        return data.map(candle => ({
            time: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
    } catch (error) {
        console.error('Error fetching candle data:', error);
        return null;
    }
}

function showAnalysisLoading() {
    const signalDisplay = document.getElementById('signal-display');
    if (signalDisplay) {
        signalDisplay.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Analyzing market structure...</p>
            </div>
        `;
    }
}

function showNoSignal() {
    const signalDisplay = document.getElementById('signal-display');
    document.getElementById('metric-signal').textContent = 'WAITING';
    
    if (signalDisplay) {
        signalDisplay.innerHTML = `
            <div class="no-signal">
                <div class="no-signal-icon">🔍</div>
                <p>No entry signal yet. Monitoring for setups...</p>
            </div>
        `;
    }
}

function displaySignal(signal) {
    document.getElementById('metric-signal').textContent = signal.type;
    document.getElementById('metric-signal').className = `metric-value ${signal.type === 'LONG' ? 'bullish-trend' : 'bearish-trend'}`;
    
    const signalDisplay = document.getElementById('signal-display');
    if (signalDisplay) {
        const riskReward = signal.rr.toFixed(1);
        const riskPercent = (((signal.entry - signal.stopLoss) / signal.entry) * 100).toFixed(2);
        
        signalDisplay.innerHTML = `
            <div class="signal-active ${signal.type.toLowerCase()}">
                <div class="signal-header">
                    <span class="signal-type">${signal.type} SIGNAL</span>
                    <span class="signal-zone">${signal.zone}</span>
                </div>
                
                <div class="signal-prices">
                    <div class="price-row entry">
                        <span class="price-label">Entry</span>
                        <span class="price-value">$${signal.entry.toFixed(2)}</span>
                    </div>
                    <div class="price-row tp">
                        <span class="price-label">Take Profit</span>
                        <span class="price-value">$${signal.takeProfit.toFixed(2)}</span>
                    </div>
                    <div class="price-row sl">
                        <span class="price-label">Stop Loss</span>
                        <span class="price-value">$${signal.stopLoss.toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="signal-stats">
                    <div class="stat">
                        <span class="stat-label">R:R</span>
                        <span class="stat-value">1:${riskReward}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Risk</span>
                        <span class="stat-value">${riskPercent}%</span>
                    </div>
                </div>
                
                <div class="signal-time">
                    Generated: ${new Date(signal.entryTime).toLocaleTimeString()}
                </div>
            </div>
        `;
    }
    
    // Update explanation
    updateExplanation(signal);
}

function displayActiveSignal(signal, currentPrice) {
    document.getElementById('metric-signal').textContent = `${signal.type} ACTIVE`;
    document.getElementById('metric-signal').className = `metric-value ${signal.type === 'LONG' ? 'bullish-trend' : 'bearish-trend'}`;
    
    const signalDisplay = document.getElementById('signal-display');
    if (signalDisplay) {
        const pnl = signal.type === 'LONG' 
            ? ((currentPrice - signal.entry) / signal.entry * 100).toFixed(2)
            : ((signal.entry - currentPrice) / signal.entry * 100).toFixed(2);
        
        const pnlClass = parseFloat(pnl) >= 0 ? 'positive' : 'negative';
        
        signalDisplay.innerHTML = `
            <div class="signal-active ${signal.type.toLowerCase()} active-trade">
                <div class="signal-header">
                    <span class="signal-type">${signal.type} ACTIVE</span>
                    <span class="signal-pnl ${pnlClass}">${pnl}%</span>
                </div>
                
                <div class="signal-prices">
                    <div class="price-row entry">
                        <span class="price-label">Entry</span>
                        <span class="price-value">$${signal.entry.toFixed(2)}</span>
                    </div>
                    <div class="price-row current">
                        <span class="price-label">Current</span>
                        <span class="price-value">$${currentPrice.toFixed(2)}</span>
                    </div>
                    <div class="price-row tp">
                        <span class="price-label">Target</span>
                        <span class="price-value">$${signal.takeProfit.toFixed(2)}</span>
                    </div>
                    <div class="price-row sl">
                        <span class="price-label">Stop</span>
                        <span class="price-value">$${signal.stopLoss.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

function updateExplanation(signal) {
    appState.currentExplanation = signal;
    
    // If explanation tab is active, update it
    if (document.getElementById('explanation-tab').classList.contains('active')) {
        displayExplanation(signal);
    }
}

function displayExplanation(signal) {
    const container = document.getElementById('explanation-content');
    if (!signal) {
        container.innerHTML = `
            <div class="no-explanation">
                <div class="no-explanation-icon">📝</div>
                <p>Select an asset and wait for a signal to see detailed trade reasoning.</p>
            </div>
        `;
        return;
    }
    
    const direction = signal.type === 'LONG' ? 'bullish' : 'bearish';
    const structure = signal.type === 'LONG' ? 'Break of Structure (BOS) to the upside' : 'Break of Structure (BOS) to the downside';
    const zone = signal.zone === 'FVG' ? 'Fair Value Gap' : 'Order Block';
    
    container.innerHTML = `
        <div class="explanation-card">
            <div class="explanation-header ${direction}">
                <h3>${signal.type} SETUP EXPLANATION</h3>
                <span class="explanation-symbol">${signal.symbol}</span>
            </div>
            
            <div class="explanation-section">
                <h4>🎯 Market Structure</h4>
                <p>The market has shown a clear ${structure}, indicating that smart money is positioning for a ${direction} move.</p>
            </div>
            
            <div class="explanation-section">
                <h4>📍 Entry Zone</h4>
                <p>Price has pulled back into a ${zone} zone. This is where institutional traders are likely to re-enter their positions, providing a high-probability entry point.</p>
            </div>
            
            <div class="explanation-section">
                <h4>💰 Risk Management</h4>
                <p>Stop Loss: Placed ${signal.type === 'LONG' ? 'below' : 'above'} the ${zone} to protect capital if the structure fails.</p>
                <p>Take Profit: Set at ${signal.rr}:1 risk-reward ratio, targeting key levels based on market structure.</p>
            </div>
            
            <div class="explanation-section">
                <h4>📊 Confluence Factors</h4>
                <ul>
                    <li>✅ Break of Structure confirmed</li>
                    <li>✅ Pullback into demand/supply zone</li>
                    <li>✅ ${zone} identified</li>
                    <li>✅ Favorable risk-reward ratio (1:${signal.rr})</li>
                </ul>
            </div>
            
            <div class="explanation-footer">
                <p class="disclaimer">⚠️ This is an AI-generated signal based on Smart Money Concepts. Always manage your risk and never invest more than you can afford to lose.</p>
            </div>
        </div>
    `;
}

// ==================== CHART ====================

function setupChart() {
    const container = document.getElementById('chart-container');
    if (!container) return;
    
    try {
        appState.chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: 400,
            layout: {
                background: { color: '#0a0e1a' },
                textColor: '#00ff00',
            },
            grid: {
                vertLines: { color: 'rgba(0, 255, 0, 0.1)' },
                horzLines: { color: 'rgba(0, 255, 0, 0.1)' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: 'rgba(0, 255, 0, 0.3)',
            },
            timeScale: {
                borderColor: 'rgba(0, 255, 0, 0.3)',
                timeVisible: true,
                secondsVisible: false,
            },
        });
        
        console.log('Chart initialized successfully');
    } catch (error) {
        console.error('Chart initialization error:', error);
    }
}

async function updateChart(candles, analysis) {
    if (!appState.chart || !candles) return;
    
    try {
        // Clear existing series
        appState.chart.remove = appState.chart.series;
        
        // Add candlestick series
        const candleSeries = appState.chart.addCandlestickSeries({
            upColor: '#00ff00',
            downColor: '#ff0000',
            borderDownColor: '#ff0000',
            borderUpColor: '#00ff00',
            wickDownColor: '#ff0000',
            wickUpColor: '#00ff00',
        });
        
        // Format data for chart
        const chartData = candles.map(candle => ({
            time: candle.time / 1000,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
        }));
        
        candleSeries.setData(chartData);
        
        // Fit content
        appState.chart.timeScale().fitContent();
        
        console.log('Chart updated with', chartData.length, 'candles');
    } catch (error) {
        console.error('Chart update error:', error);
    }
}

// ==================== TRADE HISTORY ====================

function updateTradeHistory() {
    const container = document.getElementById('history-list');
    const trades = appState.strategy.tradeHistory;
    
    if (!trades || trades.length === 0) {
        container.innerHTML = `
            <div class="no-history">
                <div class="no-history-icon">📋</div>
                <p>No trade history yet. Signals will be tracked automatically.</p>
            </div>
        `;
        updateTradeStats();
        return;
    }
    
    container.innerHTML = trades.map(trade => `
        <div class="history-item ${trade.result}">
            <div class="history-header">
                <span class="history-symbol">${trade.symbol}</span>
                <span class="history-type ${trade.type.toLowerCase()}">${trade.type}</span>
                <span class="history-result ${trade.result}">${trade.result.toUpperCase()}</span>
            </div>
            <div class="history-details">
                <div class="history-row">
                    <span>Entry:</span>
                    <span>$${trade.entry.toFixed(2)}</span>
                </div>
                <div class="history-row">
                    <span>Exit:</span>
                    <span>$${trade.exitPrice.toFixed(2)}</span>
                </div>
                <div class="history-row">
                    <span>P&L:</span>
                    <span class="${trade.result}">${trade.pnl}</span>
                </div>
                <div class="history-row">
                    <span>Time:</span>
                    <span>${new Date(trade.entryTime).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    updateTradeStats();
}

function updateTradeStats() {
    const stats = appState.strategy.getTradeStats();
    
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-winrate').textContent = `${stats.winRate}%`;
    
    // Calculate total P&L (simplified)
    const totalPnL = stats.wins * 100 - stats.losses * 50; // Approximate
    document.getElementById('stat-pnl').textContent = `$${totalPnL}`;
    document.getElementById('stat-pnl').className = `stat-value ${totalPnL >= 0 ? 'positive' : 'negative'}`;
}

// ==================== FEEDBACK SYSTEM ====================

function setupFeedbackSystem() {
    const submitBtn = document.getElementById('submit-feedback');
    const stars = document.querySelectorAll('#rating-stars .star');
    let selectedRating = 0;
    
    // Star rating
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            updateStarDisplay(selectedRating);
        });
    });
    
    // Submit feedback
    submitBtn.addEventListener('click', async () => {
        const type = document.getElementById('feedback-type').value;
        const message = document.getElementById('feedback-message').value;
        
        if (!message.trim()) {
            showFeedbackStatus('Please enter your feedback message', 'error');
            return;
        }
        
        await submitFeedback(type, selectedRating, message);
    });
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('#rating-stars .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.filter = 'none';
            star.style.opacity = '1';
        } else {
            star.style.filter = 'grayscale(100%)';
            star.style.opacity = '0.3';
        }
    });
}

async function submitFeedback(type, rating, message) {
    const statusEl = document.getElementById('feedback-status');
    statusEl.innerHTML = '<div class="loading-spinner"></div> Sending feedback...';
    statusEl.className = 'feedback-status sending';
    
    try {
        // Create formatted message for Telegram
        const telegramMessage = `
🎯 JARVIS AI Feedback

📋 Type: ${type.toUpperCase()}
⭐ Rating: ${rating}/5
💬 Message:
${message}

👤 User: ${tg.initDataUnsafe?.user?.id || 'Unknown'}
⏰ Time: ${new Date().toLocaleString()}
        `;
        
        // Send to Telegram group
        const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN'; // You'll need to replace this
        const TELEGRAM_CHAT_ID = '@HUNTERSECOSYSTEMX';
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMessage,
                parse_mode: 'HTML'
            })
        });
        
        if (response.ok) {
            showFeedbackStatus('✅ Thank you! Your feedback has been sent successfully.', 'success');
            // Clear form
            document.getElementById('feedback-message').value = '';
            updateStarDisplay(0);
        } else {
            // Fallback - open Telegram directly
            window.open(`https://t.me/HUNTERSECOSYSTEMX?text=${encodeURIComponent(telegramMessage)}`, '_blank');
            showFeedbackStatus('Opening Telegram to send feedback...', 'success');
        }
    } catch (error) {
        console.error('Feedback error:', error);
        // Fallback - open Telegram directly
        const telegramMessage = `Feedback: ${type} - Rating: ${rating}/5 - ${message}`;
        window.open(`https://t.me/HUNTERSECOSYSTEMX?text=${encodeURIComponent(telegramMessage)}`, '_blank');
        showFeedbackStatus('Opening Telegram to send feedback...', 'success');
    }
}

function showFeedbackStatus(message, type) {
    const statusEl = document.getElementById('feedback-status');
    statusEl.textContent = message;
    statusEl.className = `feedback-status ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'feedback-status';
        }, 5000);
    }
}

// ==================== GAME SYSTEM ====================

function loadGameState() {
    try {
        const saved = localStorage.getItem('jarvis_game_state');
        if (saved) {
            const state = JSON.parse(saved);
            appState.gameBalance = state.balance || 1000;
            appState.gameWins = state.wins || 0;
            appState.gameLosses = state.losses || 0;
        }
    } catch (error) {
        console.error('Error loading game state:', error);
    }
    updateGameDisplay();
}

function saveGameState() {
    try {
        localStorage.setItem('jarvis_game_state', JSON.stringify({
            balance: appState.gameBalance,
            wins: appState.gameWins,
            losses: appState.gameLosses
        }));
    } catch (error) {
        console.error('Error saving game state:', error);
    }
}

function updateGameDisplay() {
    document.getElementById('game-balance').textContent = appState.gameBalance;
    document.getElementById('game-wins').textContent = appState.gameWins;
    document.getElementById('game-losses').textContent = appState.gameLosses;
}

function setupGame() {
    const headsBtn = document.getElementById('choose-heads');
    const tailsBtn = document.getElementById('choose-tails');
    const resetBtn = document.getElementById('reset-game');
    
    headsBtn.addEventListener('click', () => playCoinFlip('heads'));
    tailsBtn.addEventListener('click', () => playCoinFlip('tails'));
    resetBtn.addEventListener('click', resetGame);
}

async function playCoinFlip(choice) {
    const betAmount = parseInt(document.getElementById('bet-amount').value);
    
    if (betAmount > appState.gameBalance) {
        showGameResult('❌ Insufficient balance!', 'loss');
        return;
    }
    
    if (betAmount < 1) {
        showGameResult('❌ Minimum bet is 1 coin!', 'loss');
        return;
    }
    
    // Disable buttons during flip
    document.getElementById('choose-heads').disabled = true;
    document.getElementById('choose-tails').disabled = true;
    
    // Play flip sound
    if (coinFlipSound) {
        coinFlipSound.currentTime = 0;
        coinFlipSound.play().catch(e => console.log('Sound play failed:', e));
    }
    
    // Animate coin
    const coinDisplay = document.getElementById('coin-display');
    coinDisplay.classList.add('flipping');
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Determine result
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;
    
    coinDisplay.classList.remove('flipping');
    
    // Update balance
    if (won) {
        appState.gameBalance += betAmount;
        appState.gameWins++;
        showGameResult(`🎉 You won ${betAmount * 2} coins!`, 'win');
        if (winSound) {
            winSound.currentTime = 0;
            winSound.play().catch(e => console.log('Sound play failed:', e));
        }
    } else {
        appState.gameBalance -= betAmount;
        appState.gameLosses++;
        showGameResult(`😢 You lost ${betAmount} coins. It was ${result}.`, 'loss');
        if (loseSound) {
            loseSound.currentTime = 0;
            loseSound.play().catch(e => console.log('Sound play failed:', e));
        }
    }
    
    // Update display and save
    updateGameDisplay();
    saveGameState();
    
    // Re-enable buttons
    document.getElementById('choose-heads').disabled = false;
    document.getElementById('choose-tails').disabled = false;
}

function showGameResult(message, type) {
    const resultEl = document.getElementById('game-result');
    resultEl.textContent = message;
    resultEl.className = `game-result ${type}`;
    
    setTimeout(() => {
        resultEl.textContent = '';
        resultEl.className = 'game-result';
    }, 3000);
}

function resetGame() {
    if (confirm('Reset game? This will restore your balance to 1000 coins and clear stats.')) {
        appState.gameBalance = 1000;
        appState.gameWins = 0;
        appState.gameLosses = 0;
        updateGameDisplay();
        saveGameState();
        showGameResult('🔄 Game reset!', 'win');
    }
}

// ==================== MUSIC CONTROLS ====================

function toggleMusic(enabled) {
    appState.musicEnabled = enabled;
    
    if (enabled) {
        backgroundMusic.volume = appState.musicVolume;
        backgroundMusic.play().catch(error => {
            console.error('Music play failed:', error);
            // Show user they need to interact first
            showNotification('Click anywhere to enable music');
        });
    } else {
        backgroundMusic.pause();
    }
}

function setMusicVolume(volume) {
    appState.musicVolume = volume / 100;
    backgroundMusic.volume = appState.musicVolume;
    document.getElementById('volume-value').textContent = `${volume}%`;
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });
    
    // Asset search
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    
    searchInput.addEventListener('input', (e) => {
        searchAssets(e.target.value);
        searchClear.style.display = e.target.value ? 'block' : 'none';
    });
    
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.style.display = 'none';
        filterPairs(appState.currentFilter);
    });
    
    // Quick filters
    document.querySelectorAll('.quick-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.quick-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterPairs(btn.dataset.filter);
        });
    });
    
    // Timeframe selection
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            appState.currentTimeframe = btn.dataset.timeframe;
            appState.currentInterval = btn.dataset.interval;
            
            document.getElementById('current-timeframe').textContent = btn.dataset.timeframe.toUpperCase();
            
            // Re-analyze with new timeframe
            analyzeAsset(appState.currentSymbol, appState.currentAssetName);
        });
    });
    
    // Favorite button
    document.getElementById('favorite-btn').addEventListener('click', () => {
        toggleFavorite(appState.currentSymbol);
    });
    
    // Settings modal
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettings = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');
    
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });
    
    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });
    
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('active');
        }
    });
    
    // Trading style selection
    document.querySelectorAll('.style-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.style-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const style = btn.dataset.style;
            appState.strategy.setTradingStyle(style);
            
            const styleNames = { day: 'Day Trading', swing: 'Swing Trading', scalp: 'Scalping' };
            document.getElementById('current-style').textContent = styleNames[style];
            
            // Re-analyze with new style
            analyzeAsset(appState.currentSymbol, appState.currentAssetName);
        });
    });
    
    // Auto-refresh options
    document.querySelectorAll('.refresh-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.refresh-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            appState.refreshInterval = parseInt(btn.dataset.refresh);
            startAutoRefresh();
        });
    });
    
    // Music toggle
    const musicToggle = document.getElementById('music-toggle');
    const volumeSlider = document.getElementById('volume-slider');
    
    musicToggle.addEventListener('change', (e) => {
        toggleMusic(e.target.checked);
    });
    
    volumeSlider.addEventListener('input', (e) => {
        setMusicVolume(parseInt(e.target.value));
    });
    
    // Auto-track toggle
    document.getElementById('auto-track').addEventListener('change', (e) => {
        appState.autoTrack = e.target.checked;
    });
    
    // Setup feedback system
    setupFeedbackSystem();
    
    // Setup game
    setupGame();
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Special handling for different tabs
    if (tabName === 'chart') {
        // Reload chart data
        analyzeAsset(appState.currentSymbol, appState.currentAssetName);
    } else if (tabName === 'explanation' && appState.currentExplanation) {
        displayExplanation(appState.currentExplanation);
    } else if (tabName === 'history') {
        updateTradeHistory();
    }
}

// ==================== AUTO-REFRESH ====================

function startAutoRefresh() {
    if (appState.refreshTimer) {
        clearInterval(appState.refreshTimer);
    }
    
    appState.refreshTimer = setInterval(() => {
        analyzeAsset(appState.currentSymbol, appState.currentAssetName);
    }, appState.refreshInterval * 1000);
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    document.getElementById('last-update').textContent = timeStr;
}

// ==================== MARKET SENTIMENT ====================

async function loadMarketSentiment() {
    try {
        // Fear & Greed Index (simplified - using mock data)
        const fearGreed = Math.floor(Math.random() * 100);
        let sentiment = 'Neutral';
        if (fearGreed < 25) sentiment = 'Extreme Fear';
        else if (fearGreed < 45) sentiment = 'Fear';
        else if (fearGreed < 55) sentiment = 'Neutral';
        else if (fearGreed < 75) sentiment = 'Greed';
        else sentiment = 'Extreme Greed';
        
        document.getElementById('fear-greed').textContent = `${fearGreed} (${sentiment})`;
        
        // 24h Volume (fetch from Binance)
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const data = await response.json();
        const totalVolume = data.reduce((sum, ticker) => {
            if (ticker.symbol.endsWith('USDT')) {
                return sum + parseFloat(ticker.quoteVolume);
            }
            return sum;
        }, 0);
        
        document.getElementById('total-volume').textContent = `$${(totalVolume / 1e9).toFixed(2)}B`;
        
        // BTC Dominance (simplified)
        const btcTicker = data.find(t => t.symbol === 'BTCUSDT');
        if (btcTicker) {
            const btcVolume = parseFloat(btcTicker.quoteVolume);
            const dominance = ((btcVolume / totalVolume) * 100 * 10).toFixed(2); // Approximate
            document.getElementById('btc-dominance').textContent = `${dominance}%`;
        }
    } catch (error) {
        console.error('Error loading market sentiment:', error);
    }
}

// ==================== UTILITIES ====================

function showNotification(message) {
    if (tg.showAlert) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

function showError(message) {
    console.error(message);
    const signalDisplay = document.getElementById('signal-display');
    if (signalDisplay) {
        signalDisplay.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>${message}</p>
            </div>
        `;
    }
}

// ==================== WINDOW RESIZE HANDLER ====================

window.addEventListener('resize', () => {
    if (appState.chart) {
        const container = document.getElementById('chart-container');
        if (container) {
            appState.chart.applyOptions({
                width: container.clientWidth
            });
        }
    }
});

console.log('JARVIS AI V4 Script Loaded');
