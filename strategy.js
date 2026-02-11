// ==================== JARVIS AI TRADING STRATEGY V2 ====================
// Converted from Pine Script to JavaScript with Trade Tracking

class TradingStrategy {
    constructor() {
        // Current trading style
        this.tradingStyle = 'day'; // 'day', 'swing', or 'scalp'
        
        // Base configuration for each trading style
        this.styleConfigs = {
            swing: {
                swingLength: 7,
                bos_threshold: 0.15,
                fvgMinSize: 0.20,
                obLookback: 7,
                stopLossATR: 2.0,
                takeProfitRR: 5.0,
                partialTP_RR: 2.5,
                trendMAPeriod: 100,
                rsiPeriod: 14,
                atrPeriod: 14
            },
            day: {
                swingLength: 5,
                bos_threshold: 0.01,
                fvgMinSize: 0.0015,
                obLookback: 5,
                stopLossATR: 1.5,
                takeProfitRR: 3.0,
                partialTP_RR: 1.5,
                trendMAPeriod: 50,
                rsiPeriod: 14,
                atrPeriod: 14
            },
            scalp: {
                swingLength: 3,
                bos_threshold: 0.05,
                fvgMinSize: 0.10,
                obLookback: 3,
                stopLossATR: 1.0,
                takeProfitRR: 2.0,
                partialTP_RR: 1.0,
                trendMAPeriod: 20,
                rsiPeriod: 14,
                atrPeriod: 14
            }
        };

        // Active configuration
        this.config = this.styleConfigs.day;

        // Trade tracking
        this.activeSignals = new Map(); // Track active signals by symbol+timeframe
        this.tradeHistory = this.loadTradeHistory();
    }

    // Switch trading style
    setTradingStyle(style) {
        if (this.styleConfigs[style]) {
            this.tradingStyle = style;
            this.config = this.styleConfigs[style];
            return true;
        }
        return false;
    }

    // Load trade history from localStorage
    loadTradeHistory() {
        try {
            const saved = localStorage.getItem('jarvis_trade_history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading trade history:', error);
            return [];
        }
    }

    // Save trade history to localStorage
    saveTradeHistory() {
        try {
            localStorage.setItem('jarvis_trade_history', JSON.stringify(this.tradeHistory));
        } catch (error) {
            console.error('Error saving trade history:', error);
        }
    }

    // Add trade to history
    addTradeToHistory(trade) {
        this.tradeHistory.unshift(trade); // Add to beginning
        // Keep only last 100 trades
        if (this.tradeHistory.length > 100) {
            this.tradeHistory = this.tradeHistory.slice(0, 100);
        }
        this.saveTradeHistory();
    }

    // Get trade statistics
    getTradeStats() {
        const total = this.tradeHistory.length;
        const wins = this.tradeHistory.filter(t => t.result === 'win').length;
        const losses = this.tradeHistory.filter(t => t.result === 'loss').length;
        const tpHits = this.tradeHistory.filter(t => t.exitType === 'tp').length;
        const slHits = this.tradeHistory.filter(t => t.exitType === 'sl').length;
        const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

        return {
            total,
            wins,
            losses,
            tpHits,
            slHits,
            winRate
        };
    }

    // Filter trade history
    filterTradeHistory(filter) {
        switch (filter) {
            case 'wins':
                return this.tradeHistory.filter(t => t.result === 'win');
            case 'losses':
                return this.tradeHistory.filter(t => t.result === 'loss');
            case 'tp':
                return this.tradeHistory.filter(t => t.exitType === 'tp');
            case 'sl':
                return this.tradeHistory.filter(t => t.exitType === 'sl');
            default:
                return this.tradeHistory;
        }
    }

    // Check if active signal was hit (TP or SL)
    checkActiveSignal(symbol, timeframe, currentPrice) {
        const key = `${symbol}_${timeframe}`;
        const signal = this.activeSignals.get(key);

        if (!signal) return null;

        let exitType = null;
        let result = null;

        if (signal.type === 'LONG') {
            if (currentPrice >= signal.takeProfit) {
                exitType = 'tp';
                result = 'win';
            } else if (currentPrice <= signal.stopLoss) {
                exitType = 'sl';
                result = 'loss';
            }
        } else if (signal.type === 'SHORT') {
            if (currentPrice <= signal.takeProfit) {
                exitType = 'tp';
                result = 'win';
            } else if (currentPrice >= signal.stopLoss) {
                exitType = 'sl';
                result = 'loss';
            }
        }

        if (exitType) {
            // Signal was closed
            const closedTrade = {
                ...signal,
                exitPrice: currentPrice,
                exitType,
                result,
                exitTime: new Date().toISOString(),
                pnl: this.calculatePnL(signal, currentPrice)
            };

            this.addTradeToHistory(closedTrade);
            this.activeSignals.delete(key);

            return { closed: true, trade: closedTrade };
        }

        return { closed: false, signal };
    }

    // Calculate P&L for a trade
    calculatePnL(signal, exitPrice) {
        const risk = Math.abs(signal.entry - signal.stopLoss);
        if (signal.type === 'LONG') {
            const pnl = exitPrice - signal.entry;
            return (pnl / risk).toFixed(2) + 'R';
        } else {
            const pnl = signal.entry - exitPrice;
            return (pnl / risk).toFixed(2) + 'R';
        }
    }

    // Calculate Simple Moving Average
    calculateSMA(data, period) {
        if (data.length < period) return null;
        const slice = data.slice(-period);
        const sum = slice.reduce((acc, val) => acc + val, 0);
        return sum / period;
    }

    // Calculate RSI (Relative Strength Index)
    calculateRSI(closes, period = 14) {
        if (closes.length < period + 1) return null;

        let gains = 0;
        let losses = 0;

        for (let i = closes.length - period; i < closes.length; i++) {
            const change = closes[i] - closes[i - 1];
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return rsi;
    }

    // Calculate ATR (Average True Range)
    calculateATR(candles, period = 14) {
        if (candles.length < period + 1) return null;

        const trueRanges = [];
        for (let i = candles.length - period; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i - 1].close;

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }

        return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
    }

    // Find Pivot Highs
    findPivotHigh(candles, length) {
        if (candles.length < length * 2 + 1) return null;

        const index = candles.length - length - 1;
        const pivotCandle = candles[index];

        for (let i = 1; i <= length; i++) {
            if (candles[index - i].high >= pivotCandle.high ||
                candles[index + i].high >= pivotCandle.high) {
                return null;
            }
        }

        return pivotCandle.high;
    }

    // Find Pivot Lows
    findPivotLow(candles, length) {
        if (candles.length < length * 2 + 1) return null;

        const index = candles.length - length - 1;
        const pivotCandle = candles[index];

        for (let i = 1; i <= length; i++) {
            if (candles[index - i].low <= pivotCandle.low ||
                candles[index + i].low <= pivotCandle.low) {
                return null;
            }
        }

        return pivotCandle.low;
    }

    // Detect Fair Value Gap (Bullish)
    detectBullishFVG(candles) {
        if (candles.length < 3) return null;

        const current = candles[candles.length - 1];
        const prev2 = candles[candles.length - 3];

        if (current.low > prev2.high) {
            const gapSize = ((current.low - prev2.high) / prev2.high) * 100;
            if (gapSize >= this.config.fvgMinSize) {
                return {
                    top: current.low,
                    bottom: prev2.high,
                    size: gapSize
                };
            }
        }
        return null;
    }

    // Detect Fair Value Gap (Bearish)
    detectBearishFVG(candles) {
        if (candles.length < 3) return null;

        const current = candles[candles.length - 1];
        const prev2 = candles[candles.length - 3];

        if (current.high < prev2.low) {
            const gapSize = ((prev2.low - current.high) / prev2.low) * 100;
            if (gapSize >= this.config.fvgMinSize) {
                return {
                    top: prev2.low,
                    bottom: current.high,
                    size: gapSize
                };
            }
        }
        return null;
    }

    // Detect Bullish Order Block
    detectBullishOB(candles, lookback) {
        if (candles.length < lookback + 1) return null;

        const current = candles[candles.length - 1];
        
        for (let i = 1; i <= lookback; i++) {
            const candle = candles[candles.length - 1 - i];
            
            if (candle.close < candle.open &&
                current.close > candle.close &&
                current.close > current.open) {
                
                return {
                    top: candle.high,
                    bottom: candle.low
                };
            }
        }
        return null;
    }

    // Detect Bearish Order Block
    detectBearishOB(candles, lookback) {
        if (candles.length < lookback + 1) return null;

        const current = candles[candles.length - 1];
        
        for (let i = 1; i <= lookback; i++) {
            const candle = candles[candles.length - 1 - i];
            
            if (candle.close > candle.open &&
                current.close < candle.close &&
                current.close < current.open) {
                
                return {
                    top: candle.high,
                    bottom: candle.low
                };
            }
        }
        return null;
    }

    // Analyze Market Structure and Generate Signals
    analyzeMarket(candles, symbol, timeframe) {
        if (!candles || candles.length < 100) {
            return { error: 'Insufficient data' };
        }

        const currentCandle = candles[candles.length - 1];
        const closes = candles.map(c => c.close);

        // Calculate indicators
        const trendMA = this.calculateSMA(closes, this.config.trendMAPeriod);
        const rsi = this.calculateRSI(closes, this.config.rsiPeriod);
        const atr = this.calculateATR(candles, this.config.atrPeriod);

        // Market trend analysis
        let marketTrend = 'NEUTRAL';
        let trendClass = 'neutral-trend';
        
        if (currentCandle.close > trendMA && rsi > 50) {
            marketTrend = rsi > 60 ? 'STRONG BULLISH' : 'BULLISH';
            trendClass = 'bullish-trend';
        } else if (currentCandle.close < trendMA && rsi < 50) {
            marketTrend = rsi < 40 ? 'STRONG BEARISH' : 'BEARISH';
            trendClass = 'bearish-trend';
        }

        // Find swing points
        const lastSwingHigh = this.findPivotHigh(candles, this.config.swingLength);
        const lastSwingLow = this.findPivotLow(candles, this.config.swingLength);

        // Detect structure breaks
        let bullishBOS = false;
        let bearishBOS = false;

        if (lastSwingHigh) {
            bullishBOS = currentCandle.close > lastSwingHigh * (1 + this.config.bos_threshold / 100);
        }

        if (lastSwingLow) {
            bearishBOS = currentCandle.close < lastSwingLow * (1 - this.config.bos_threshold / 100);
        }

        // Detect zones
        const bullishFVG = this.detectBullishFVG(candles);
        const bearishFVG = this.detectBearishFVG(candles);
        const bullishOB = this.detectBullishOB(candles, this.config.obLookback);
        const bearishOB = this.detectBearishOB(candles, this.config.obLookback);

        // Check for pullback into zones
        const longInFVG = bullishFVG && 
                          currentCandle.low <= bullishFVG.top && 
                          currentCandle.high >= bullishFVG.bottom;
        
        const longInOB = bullishOB && 
                         currentCandle.low <= bullishOB.top && 
                         currentCandle.high >= bullishOB.bottom;

        const shortInFVG = bearishFVG && 
                           currentCandle.high >= bearishFVG.bottom && 
                           currentCandle.low <= bearishFVG.top;
        
        const shortInOB = bearishOB && 
                          currentCandle.high >= bearishOB.bottom && 
                          currentCandle.low <= bearishOB.top;

        // Generate signals
        const longSignal = bullishBOS && (longInFVG || longInOB);
        const shortSignal = bearishBOS && (shortInFVG || shortInOB);

        let signal = null;
        const key = `${symbol}_${timeframe}`;

        if (longSignal) {
            const entryPrice = currentCandle.close;
            const stopLoss = entryPrice - (atr * this.config.stopLossATR);
            const riskAmount = entryPrice - stopLoss;
            const takeProfit = entryPrice + (riskAmount * this.config.takeProfitRR);
            const partialTP = entryPrice + (riskAmount * this.config.partialTP_RR);

            signal = {
                type: 'LONG',
                symbol: symbol,
                timeframe: timeframe,
                entry: entryPrice,
                stopLoss: stopLoss,
                takeProfit: takeProfit,
                partialTP: partialTP,
                rr: this.config.takeProfitRR,
                zone: longInFVG ? 'FVG' : 'OB',
                entryTime: new Date().toISOString(),
                tradingStyle: this.tradingStyle
            };

            // Store active signal
            this.activeSignals.set(key, signal);
        } else if (shortSignal) {
            const entryPrice = currentCandle.close;
            const stopLoss = entryPrice + (atr * this.config.stopLossATR);
            const riskAmount = stopLoss - entryPrice;
            const takeProfit = entryPrice - (riskAmount * this.config.takeProfitRR);
            const partialTP = entryPrice - (riskAmount * this.config.partialTP_RR);

            signal = {
                type: 'SHORT',
                symbol: symbol,
                timeframe: timeframe,
                entry: entryPrice,
                stopLoss: stopLoss,
                takeProfit: takeProfit,
                partialTP: partialTP,
                rr: this.config.takeProfitRR,
                zone: shortInFVG ? 'FVG' : 'OB',
                entryTime: new Date().toISOString(),
                tradingStyle: this.tradingStyle
            };

            // Store active signal
            this.activeSignals.set(key, signal);
        }

        // Check if existing signal was hit
        const signalCheck = this.checkActiveSignal(symbol, timeframe, currentCandle.close);

        return {
            marketTrend,
            trendClass,
            rsi: rsi ? rsi.toFixed(2) : '--',
            signal,
            currentPrice: currentCandle.close,
            signalCheck,
            activeSignal: this.activeSignals.get(key)
        };
    }

    // Clear all trade history
    clearHistory() {
        this.tradeHistory = [];
        this.saveTradeHistory();
    }
}

// Export for use in app.js
window.TradingStrategy = TradingStrategy;
