// ==================== JARVIS AI TELEGRAM MINI APP V3 - ULTIMATE ====================

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
    musicVolume: 0.5
};

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
        return [];
    }
}

// ==================== FAVORITES MANAGEMENT ====================

function loadFavorites() {
    try {
        const saved = localStorage.getItem('jarvis_favorites');
        const favoriteSymbols = saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'SOLUSDT', 'ADAUSDT'];
        
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
        // Remove from favorites
        appState.favorites.splice(index, 1);
    } else {
        // Add to favorites
        appState.favorites.push(symbol);
    }
    
    // Update pair object
    const pair = appState.allPairs.find(p => p.symbol === symbol);
    if (pair) {
        pair.isFavorite = !pair.isFavorite;
    }
    
    saveFavorites();
    
    // Update favorite button
    updateFavoriteButton();
    
    // Refresh display if on favorites filter
    if (appState.currentFilter === 'favorites') {
        filterPairs('favorites');
    }
}

function updateFavoriteButton() {
    const favoriteBtn = document.getElementById('favorite-btn');
    const isFavorite = appState.favorites.includes(appState.currentSymbol);
    
    if (isFavorite) {
        favoriteBtn.classList.add('active');
    } else {
        favoriteBtn.classList.remove('active');
    }
}

// ==================== PAIR FILTERING & SEARCH ====================

function filterPairs(filter) {
    appState.currentFilter = filter;
    
    let filtered = [];
    
    switch (filter) {
        case 'favorites':
            filtered = appState.allPairs.filter(p => p.isFavorite);
            break;
        case 'top':
            // Top 20 by market cap (approximate using common coins)
            const topSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC', 
                               'LINK', 'UNI', 'LTC', 'ATOM', 'ETC', 'XLM', 'NEAR', 'ALGO', 'FIL', 'APT'];
            filtered = appState.allPairs.filter(p => topSymbols.includes(p.baseAsset));
            break;
        case 'defi':
            const defiTokens = ['UNI', 'AAVE', 'LINK', 'SNX', 'MKR', 'COMP', 'CRV', 'SUSHI', 'YFI', 
                               'BAL', 'LDO', 'GMX', 'DYDX', 'RUNE', 'CAKE'];
            filtered = appState.allPairs.filter(p => defiTokens.includes(p.baseAsset));
            break;
        case 'meme':
            const memeTokens = ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME', 'LADYS'];
            filtered = appState.allPairs.filter(p => memeTokens.includes(p.baseAsset));
            break;
        case 'all':
        default:
            filtered = appState.allPairs;
            break;
    }
    
    appState.filteredPairs = filtered;
    displayPairs(filtered);
}

function searchPairs(query) {
    if (!query || query.trim() === '') {
        filterPairs(appState.currentFilter);
        return;
    }
    
    const searchTerm = query.toLowerCase().trim();
    const filtered = appState.allPairs.filter(pair => 
        pair.baseAsset.toLowerCase().includes(searchTerm) ||
        pair.symbol.toLowerCase().includes(searchTerm)
    );
    
    appState.filteredPairs = filtered;
    displayPairs(filtered);
}

function displayPairs(pairs) {
    const container = document.getElementById('crypto-assets');
    const countElement = document.getElementById('asset-count');
    
    if (pairs.length === 0) {
        container.innerHTML = `
            <div class="loading-state">
                <p>No pairs found</p>
            </div>
        `;
        countElement.textContent = '0 pairs';
        return;
    }
    
    countElement.textContent = `${pairs.length} pair${pairs.length !== 1 ? 's' : ''}`;
    
    container.innerHTML = pairs.map(pair => `
        <button class="asset-card ${pair.symbol === appState.currentSymbol ? 'active' : ''} ${pair.isFavorite ? 'favorited' : ''}" 
                data-symbol="${pair.symbol}" 
                data-name="${pair.baseAsset}">
            <div class="asset-symbol">${pair.baseAsset}</div>
            <div class="asset-name">${pair.symbol}</div>
        </button>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.asset-card').forEach(card => {
        card.addEventListener('click', async () => {
            document.querySelectorAll('.asset-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            appState.currentSymbol = card.dataset.symbol;
            appState.currentAssetName = card.dataset.name;
            
            updateFavoriteButton();
            await analyzeCurrentAsset();
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    });
}

// ==================== BINANCE API - PRICE DATA ====================

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
            volume: parseFloat(candle[5]),
            time: candle[0] / 1000 // Convert to seconds for TradingView
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

// ==================== MARKET SENTIMENT ====================

async function updateMarketSentiment() {
    try {
        // Fetch 24h stats for BTC
        const btcStats = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
        const btcData = await btcStats.json();
        
        // Calculate simple Fear & Greed based on price change
        const priceChange = parseFloat(btcData.priceChangePercent);
        let sentiment = 'NEUTRAL';
        if (priceChange > 5) sentiment = 'EXTREME GREED';
        else if (priceChange > 2) sentiment = 'GREED';
        else if (priceChange < -5) sentiment = 'EXTREME FEAR';
        else if (priceChange < -2) sentiment = 'FEAR';
        
        document.getElementById('fear-greed').textContent = sentiment;
        document.getElementById('fear-greed').style.color = priceChange > 0 ? 'var(--cyber-green)' : 'var(--cyber-red)';
        
        // Total 24h volume
        const volume = (parseFloat(btcData.quoteVolume) / 1000000000).toFixed(2);
        document.getElementById('total-volume').textContent = `$${volume}B`;
        
        // BTC Dominance (simplified - would need total market cap)
        document.getElementById('btc-dominance').textContent = '~52%';
        
    } catch (error) {
        console.error('Error fetching market sentiment:', error);
        document.getElementById('fear-greed').textContent = 'N/A';
        document.getElementById('total-volume').textContent = 'N/A';
        document.getElementById('btc-dominance').textContent = 'N/A';
    }
}

// ==================== CHART FUNCTIONALITY ====================

function initializeChart() {
    const container = document.getElementById('chart-container');
    if (!container) return;
    
    // Clear loading state
    container.innerHTML = '';
    
    // Create chart
    function initializeChart() {
    const container = document.getElementById('chart-container');
    if (!container) return;
    
    container.innerHTML = ''; // Clear first
    
    appState.chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 400,
        layout: {
            background: { color: '#1a1f35' },
            textColor: '#a8b3cf',
        }
    });
}
    
    // Make responsive
    window.addEventListener('resize', () => {
        if (appState.chart) {
            appState.chart.applyOptions({ width: container.clientWidth });
        }
    });
}

async function updateChart(candles, signal) {
    if (!appState.chart) {
        initializeChart();
    }
    
    if (!candles || candles.length === 0) return;
    
    // Update chart info
    document.getElementById('chart-asset').textContent = `${appState.currentAssetName}/USDT`;
    document.getElementById('chart-tf').textContent = appState.currentTimeframe.toUpperCase();
    
    // Clear existing series
    const chartContainer = document.getElementById('chart-container');
    chartContainer.innerHTML = '';
    initializeChart();
    
    // Add candlestick series
    const candleSeries = appState.chart.addCandlestickSeries({
        upColor: '#00ff88',
        downColor: '#ff0055',
        borderUpColor: '#00ff88',
        borderDownColor: '#ff0055',
        wickUpColor: '#00ff88',
        wickDownColor: '#ff0055',
    });
    
    candleSeries.setData(candles.map(c => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
    })));
    
    // Add signal markers if signal exists
    if (signal) {
        const lastCandle = candles[candles.length - 1];
        
        // Entry line
        const entryLine = appState.chart.addLineSeries({
            color: '#ffed00',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            title: 'Entry',
        });
        entryLine.setData([
            { time: candles[candles.length - 20].time, value: signal.entry },
            { time: lastCandle.time, value: signal.entry }
        ]);
        
        // Stop Loss line
        const slLine = appState.chart.addLineSeries({
            color: '#ff0055',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            title: 'Stop Loss',
        });
        slLine.setData([
            { time: candles[candles.length - 20].time, value: signal.stopLoss },
            { time: lastCandle.time, value: signal.stopLoss }
        ]);
        
        // Take Profit line
        const tpLine = appState.chart.addLineSeries({
            color: '#00f7ff',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            title: 'Take Profit',
        });
        tpLine.setData([
            { time: candles[candles.length - 20].time, value: signal.takeProfit },
            { time: lastCandle.time, value: signal.takeProfit }
        ]);
    }
    
    appState.chart.timeScale().fitContent();
}

// ==================== EXPLANATION GENERATION ====================

function generateExplanation(analysis, signal) {
    if (!signal) {
        appState.currentExplanation = null;
        return;
    }
    
    const explanation = {
        signal: signal,
        reasoning: {
            marketStructure: generateMarketStructureReason(analysis, signal),
            entryZone: generateEntryZoneReason(signal),
            riskManagement: generateRiskManagementReason(signal),
            confluence: generateConfluenceReason(analysis, signal)
        }
    };
    
    appState.currentExplanation = explanation;
    displayExplanation(explanation);
}

function generateMarketStructureReason(analysis, signal) {
    const trend = analysis.marketTrend;
    const type = signal.type;
    
    if (type === 'LONG') {
        return `Market structure is ${trend.toLowerCase()}, indicating bullish momentum. Price has broken above a significant swing high, confirming the uptrend and creating a Break of Structure (BOS). This validates our long entry opportunity.`;
    } else {
        return `Market structure is ${trend.toLowerCase()}, showing bearish momentum. Price has broken below a key swing low, creating a Break of Structure (BOS) to the downside. This confirms the bearish trend and validates our short entry.`;
    }
}

function generateEntryZoneReason(signal) {
    const zone = signal.zone;
    
    if (zone === 'FVG') {
        return `Entry is based on a Fair Value Gap (FVG), which is an imbalance in price where the market moved too quickly, leaving a gap. Price has pulled back into this gap at $${signal.entry.toFixed(4)}, creating an optimal entry opportunity as the gap gets filled.`;
    } else {
        return `Entry is based on an Order Block (OB), which represents institutional buying/selling interest. This zone at $${signal.entry.toFixed(4)} is where smart money previously entered, making it a high-probability area for the trend to continue.`;
    }
}

function generateRiskManagementReason(signal) {
    return `Stop loss is placed at $${signal.stopLoss.toFixed(4)}, which is beyond the entry zone plus ATR-based buffer. This protects us if the analysis is wrong. Take profit is set at $${signal.takeProfit.toFixed(4)}, giving us a ${signal.rr}:1 risk-to-reward ratio. This means we risk $1 to potentially make $${signal.rr}.`;
}

function generateConfluenceReason(analysis, signal) {
    const factors = [];
    
    if (parseFloat(analysis.rsi) > 50 && signal.type === 'LONG') {
        factors.push('RSI above 50 confirms bullish momentum');
    } else if (parseFloat(analysis.rsi) < 50 && signal.type === 'SHORT') {
        factors.push('RSI below 50 confirms bearish momentum');
    }
    
    factors.push(`${appState.currentTimeframe.toUpperCase()} timeframe alignment`);
    factors.push(`${signal.zone} entry zone confirmation`);
    factors.push('Market structure break validated');
    
    return `Multiple factors align for this trade: ${factors.join(', ')}. This confluence increases the probability of success.`;
}

function displayExplanation(explanation) {
    const container = document.getElementById('explanation-card');
    
    if (!explanation) {
        container.innerHTML = `
            <div class="explanation-empty">
                <div class="empty-icon">🎯</div>
                <p>No active signal</p>
                <p class="empty-subtext">When a signal appears, the reasoning will be shown here</p>
            </div>
        `;
        return;
    }
    
    const signal = explanation.signal;
    const reasoning = explanation.reasoning;
    
    container.innerHTML = `
        <div class="explanation-content">
            <div class="explanation-header">
                <span>${signal.type === 'LONG' ? '📈' : '📉'}</span>
                <h3 class="explanation-title">${signal.type} SIGNAL - ${appState.currentAssetName}</h3>
            </div>
            
            <div class="explanation-section-item">
                <h4 class="explanation-subtitle">Market Structure</h4>
                <p class="explanation-text">${reasoning.marketStructure}</p>
            </div>
            
            <div class="explanation-section-item">
                <h4 class="explanation-subtitle">Entry Zone</h4>
                <p class="explanation-text">${reasoning.entryZone}</p>
            </div>
            
            <div class="explanation-section-item">
                <h4 class="explanation-subtitle">Risk Management</h4>
                <p class="explanation-text">${reasoning.riskManagement}</p>
            </div>
            
            <div class="explanation-section-item">
                <h4 class="explanation-subtitle">Confluence Factors</h4>
                <p class="explanation-text">${reasoning.confluence}</p>
            </div>
            
            <div class="explanation-section-item">
                <h4 class="explanation-subtitle">Key Levels</h4>
                <ul class="explanation-points">
                    <li>Entry: $${signal.entry.toFixed(4)}</li>
                    <li>Stop Loss: $${signal.stopLoss.toFixed(4)}</li>
                    <li>Take Profit: $${signal.takeProfit.toFixed(4)}</li>
                    <li>Risk/Reward: 1:${signal.rr}</li>
                </ul>
            </div>
        </div>
    `;
}

// ==================== BACKGROUND MUSIC ====================

function initializeMusic() {
    const audio = document.getElementById('background-music');
    const toggle = document.getElementById('music-toggle');
    const volumeControl = document.getElementById('volume-control');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    
    // Load saved preferences
    const savedMusicState = localStorage.getItem('jarvis_music_enabled');
    const savedVolume = localStorage.getItem('jarvis_music_volume');
    
    if (savedMusicState === 'true') {
        appState.musicEnabled = true;
        toggle.checked = true;
        volumeControl.classList.add('visible');
    }
    
    if (savedVolume) {
        appState.musicVolume = parseFloat(savedVolume);
        volumeSlider.value = appState.musicVolume * 100;
        volumeValue.textContent = `${Math.round(appState.musicVolume * 100)}%`;
    }
    
    audio.volume = appState.musicVolume;
    
    // Toggle handler
    toggle.addEventListener('change', (e) => {
        appState.musicEnabled = e.target.checked;
        localStorage.setItem('jarvis_music_enabled', appState.musicEnabled);
        
        if (appState.musicEnabled) {
            audio.play().catch(err => console.log('Audio play failed:', err));
            volumeControl.classList.add('visible');
        } else {
            audio.pause();
            volumeControl.classList.remove('visible');
        }
    });
    
    // Volume handler
    volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        appState.musicVolume = volume;
        audio.volume = volume;
        volumeValue.textContent = `${e.target.value}%`;
        localStorage.setItem('jarvis_music_volume', volume);
    });
    
    // Auto-play if enabled
    if (appState.musicEnabled) {
        audio.play().catch(err => console.log('Audio autoplay blocked:', err));
    }
}

// ==================== UI UPDATE FUNCTIONS ====================

function updateCurrentAnalysis(analysis, price) {
    document.getElementById('current-symbol').textContent = appState.currentAssetName;
    document.getElementById('current-timeframe').textContent = appState.currentTimeframe.toUpperCase();
    
    if (price) {
        const decimals = price < 1 ? 4 : 2;
        document.getElementById('current-price').textContent = `$${price.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })}`;
    }

    if (!analysis) return;

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

    const signalDisplay = document.getElementById('signal-display');
    const signalMetric = document.getElementById('metric-signal');
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

        // Generate explanation
        generateExplanation(analysis, activeSignal);

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
        
        // Clear explanation
        generateExplanation(null, null);
    }
}

function showTradeClosedNotification(trade) {
    const message = trade.result === 'win' 
        ? `✅ ${trade.symbol} ${trade.type} closed in profit! Exit: $${trade.exitPrice.toFixed(4)} (${trade.pnl})`
        : `❌ ${trade.symbol} ${trade.type} stopped out. Exit: $${trade.exitPrice.toFixed(4)} (${trade.pnl})`;

    if (tg.showAlert) {
        tg.showAlert(message);
    }

    updateHistoryTab();
}

// ==================== HISTORY TAB ====================

function updateHistoryTab() {
    const stats = appState.strategy.getTradeStats();

    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-wins').textContent = stats.wins;
    document.getElementById('stat-losses').textContent = stats.losses;
    document.getElementById('stat-winrate').textContent = `${stats.winRate}%`;

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

// ==================== ANALYSIS FUNCTION ====================

async function analyzeCurrentAsset() {
    const symbol = appState.currentSymbol;
    const interval = appState.currentInterval;
    const timeframe = appState.currentTimeframe;

    try {
        const signalDisplay = document.getElementById('signal-display');
        signalDisplay.innerHTML = `
            <div class="no-signal">
                <div class="loading-spinner"></div>
                <p>Analyzing ${appState.currentAssetName}...</p>
            </div>
        `;

        const candles = await fetchKlines(symbol, interval);
        const price = await fetchCurrentPrice(symbol);

        if (!candles || candles.length < 100) {
            console.error(`Insufficient data for ${symbol}`);
            updateCurrentAnalysis(null, price);
            return;
        }

        const analysis = appState.strategy.analyzeMarket(candles, symbol, timeframe);
        
        updateCurrentAnalysis(analysis, price);
        updateChart(candles, analysis.signal || analysis.activeSignal);
        updateLastUpdateTime();

    } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
    }
}

// ==================== EVENT HANDLERS ====================

// Search functionality
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');

searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    
    if (query.length > 0) {
        searchClear.classList.add('visible');
    } else {
        searchClear.classList.remove('visible');
    }
    
    searchPairs(query);
});

searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    filterPairs(appState.currentFilter);
});

// Quick filters
document.querySelectorAll('.quick-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.quick-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.dataset.filter;
        searchInput.value = '';
        searchClear.classList.remove('visible');
        filterPairs(filter);
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
});

// Favorite button
document.getElementById('favorite-btn').addEventListener('click', () => {
    toggleFavorite(appState.currentSymbol);
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
});

// Tab Navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        if (tabName === 'history') {
            updateHistoryTab();
        } else if (tabName === 'chart' && !appState.chart) {
            initializeChart();
            analyzeCurrentAsset();
        }

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
});

// Timeframe Selection
document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        appState.currentTimeframe = btn.dataset.timeframe;
        appState.currentInterval = btn.dataset.interval;
        
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
    updateMarketSentiment();
    
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
        document.querySelectorAll('.style-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        
        const style = option.dataset.style;
        appState.strategy.setTradingStyle(style);
        
        const styleNames = {
            'day': 'Day Trading',
            'swing': 'Swing Trading',
            'scalp': 'Scalping'
        };
        document.getElementById('current-style').textContent = styleNames[style];
        
        analyzeCurrentAsset();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    });
});

// Refresh Interval
document.querySelectorAll('.refresh-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.refresh-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        
        appState.refreshInterval = parseInt(option.dataset.refresh);
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
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
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
    if (appState.refreshTimer) {
        clearInterval(appState.refreshTimer);
    }
    
    appState.refreshTimer = setInterval(() => {
        analyzeCurrentAsset();
    }, appState.refreshInterval * 1000);
}

// ==================== INITIALIZATION ====================

async function initializeApp() {
    try {
        console.log('Initializing JARVIS AI V3...');
        
        // Load all trading pairs
        await fetchAllTradingPairs();
        
        // Initialize music
        initializeMusic();
        
        // Initialize chart
        initializeChart();
        
        // Initial analysis
        await analyzeCurrentAsset();
        
        // Start auto-refresh
        startRefreshTimer();
        
        // Initialize history tab
        updateHistoryTab();
        
        // Update market sentiment
        updateMarketSentiment();
        
        // Update sentiment every 5 minutes
        setInterval(updateMarketSentiment, 5 * 60 * 1000);
        
        tg.MainButton.hide();
        
        console.log('JARVIS AI V3 initialized successfully');
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

document.getElementById('feedback-submit').addEventListener('click', () => {
    const rating = selectedStars;
    const message = document.getElementById('feedback-message').value;
    
    // Open Telegram group
    window.open('https://t.me/HUNTERSECOSYSTEMX', '_blank');
    
    // Show confirmation
    alert(`Thank you for your ${rating}-star feedback!`);
});

// Simple falling coins game
const game = {
    player: { x: 150, y: 350, width: 40, height: 40 },
    coins: [],
    score: 0,
    
    update() {
        // Move coins down
        this.coins.forEach(coin => {
            coin.y += coin.speed;
            
            // Check collision
            if (this.checkCollision(coin)) {
                this.score++;
                collectSound.play();
            }
        });
    },
    
    checkCollision(coin) {
        return (
            this.player.x < coin.x + coin.width &&
            this.player.x + this.player.width > coin.x &&
            this.player.y < coin.y + coin.height &&
            this.player.y + this.player.height > coin.y
        );
    }
};
