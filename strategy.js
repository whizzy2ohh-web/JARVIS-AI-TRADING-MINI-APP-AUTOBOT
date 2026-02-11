// ==================== JARVIS AI TRADING STRATEGY - FIXED V5 ====================
// With CHoCH support for better signal generation (matches Pine Script exactly)

class TradingStrategy {
    constructor() {
        this.tradingStyle = 'day';
        
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
                bos_threshold: 0.1,
                fvgMinSize: 0.15,
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

        this.config = this.styleConfigs.day;
        this.activeSignals = new Map();
        this.tradeHistory = this.loadTradeHistory();
    }

    setTradingStyle(style) {
        if (this.styleConfigs[style]) {
            this.tradingStyle = style;
            this.config = this.styleConfigs[style];
            return true;
        }
        return false;
    }

    loadTradeHistory() {
        try {
            const saved = localStorage.getItem('jarvis_trade_history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading trade history:', error);
            return [];
        }
    }

    saveTradeHistory() {
        try {
            localStorage.setItem('jarvis_trade_history', JSON.stringify(this.tradeHistory));
        } catch (error) {
            console.error('Error saving trade history:', error);
        }
    }

    addTradeToHistory(trade) {
        this.tradeHistory.unshift(trade);
        if (this.tradeHistory.length > 100) {
            this.tradeHistory = this.tradeHistory.slice(0, 100);
        }
        this.saveTradeHistory();
    }

    getTradeStats() {
        const total = this.tradeHistory.length;
        const wins = this.tradeHistory.filter(t => t.result === 'win').length;
        const losses = total - wins;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        const tpHits = this.tradeHistory.filter(t => t.exitType === 'tp').length;
        const slHits = this.tradeHistory.filter(t => t.exitType === 'sl').length;

        return { total, wins, losses, winRate, tpHits, slHits };
    }

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

    checkActiveSignal(symbol, timeframe, currentPrice) {
        const key = `${symbol}_${timeframe}`;
        const signal = this.activeSignals.get(key);
        
        if (!signal) return null;

        let closed = false;
        let trade = null;

        if (signal.type === 'LONG') {
            if (currentPrice >= signal.takeProfit) {
                closed = true;
                trade = {
                    symbol: signal.symbol,
                    timeframe: signal.timeframe,
                    type: signal.type,
                    entry: signal.entry,
                    exitPrice: signal.takeProfit,
                    exitType: 'tp',
                    result: 'win',
                    pnl: `+${signal.rr}R`,
                    entryTime: signal.entryTime,
                    exitTime: new Date().toISOString(),
                    tradingStyle: signal.tradingStyle
                };
            }
            else if (currentPrice <= signal.stopLoss) {
                closed = true;
                trade = {
                    symbol: signal.symbol,
                    timeframe: signal.timeframe,
                    type: signal.type,
                    entry: signal.entry,
                    exitPrice: signal.stopLoss,
                    exitType: 'sl',
                    result: 'loss',
                    pnl: '-1R',
                    entryTime: signal.entryTime,
                    exitTime: new Date().toISOString(),
                    tradingStyle: signal.tradingStyle
                };
            }
        } else if (signal.type === 'SHORT') {
            if (currentPrice <= signal.takeProfit) {
                closed = true;
                trade = {
                    symbol: signal.symbol,
                    timeframe: signal.timeframe,
                    type: signal.type,
                    entry: signal.entry,
                    exitPrice: signal.takeProfit,
                    exitType: 'tp',
                    result: 'win',
                    pnl: `+${signal.rr}R`,
                    entryTime: signal.entryTime,
                    exitTime: new Date().toISOString(),
                    tradingStyle: signal.tradingStyle
                };
            }
            else if (currentPrice >= signal.stopLoss) {
                closed = true;
                trade = {
                    symbol: signal.symbol,
                    timeframe: signal.timeframe,
                    type: signal.type,
                    entry: signal.entry,
                    exitPrice: signal.stopLoss,
                    exitType: 'sl',
                    result: 'loss',
                    pnl: '-1R',
                    entryTime: signal.entryTime,
                    exitTime: new Date().toISOString(),
                    tradingStyle: signal.tradingStyle
                };
            }
        }

        if (closed && trade) {
            this.activeSignals.delete(key);
            this.addTradeToHistory(trade);
            return { closed: true, trade };
        }

        return { closed: false, trade: null };
    }

    calculateSMA(candles, period) {
        if (candles.length < period) return null;
        const sum = candles.slice(-period).reduce((acc, c) => acc + c.close, 0);
        return sum / period;
    }

    calculateRSI(candles, period = 14) {
        if (candles.length < period + 1) return null;

        let gains = 0;
        let losses = 0;

        for (let i = candles.length - period; i < candles.length; i++) {
            const change = candles[i].close - candles[i - 1].close;
            if (change > 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return rsi;
    }

    calculateATR(candles, period = 14) {
        if (candles.length < period + 1) return null;

        let tr = 0;
        for (let i = candles.length - period; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i - 1].close;

            const tr1 = high - low;
            const tr2 = Math.abs(high - prevClose);
            const tr3 = Math.abs(low - prevClose);

            tr += Math.max(tr1, tr2, tr3);
        }

        return tr / period;
    }

    findPivotHigh(candles, length) {
        if (candles.length < length * 2 + 1) return null;
        
        const centerIndex = candles.length - length - 1;
        const centerHigh = candles[centerIndex].high;
        
        for (let i = centerIndex - length; i <= centerIndex + length; i++) {
            if (i === centerIndex) continue;
            if (candles[i].high >= centerHigh) return null;
        }
        
        return centerHigh;
    }

    findPivotLow(candles, length) {
        if (candles.length < length * 2 + 1) return null;
        
        const centerIndex = candles.length - length - 1;
        const centerLow = candles[centerIndex].low;
        
        for (let i = centerIndex - length; i <= centerIndex + length; i++) {
            if (i === centerIndex) continue;
            if (candles[i].low <= centerLow) return null;
        }
        
        return centerLow;
    }

    detectBullishFVG(candles) {
        if (candles.length < 3) return null;
        
        const current = candles[candles.length - 1];
        const candle2 = candles[candles.length - 3];
        
        if (current.low > candle2.high) {
            const gapSize = ((current.low - candle2.high) / candle2.high) * 100;
            if (gapSize >= this.config.fvgMinSize) {
                return {
                    top: current.low,
                    bottom: candle2.high,
                    size: gapSize
                };
            }
        }
        
        return null;
    }

    detectBearishFVG(candles) {
        if (candles.length < 3) return null;
        
        const current = candles[candles.length - 1];
        const candle2 = candles[candles.length - 3];
        
        if (current.high < candle2.low) {
            const gapSize = ((candle2.low - current.high) / candle2.low) * 100;
            if (gapSize >= this.config.fvgMinSize) {
                return {
                    top: candle2.low,
                    bottom: current.high,
                    size: gapSize
                };
            }
        }
        
        return null;
    }

    detectBullishOB(candles, lookback) {
        if (candles.length < lookback + 1) return null;
        
        const current = candles[candles.length - 1];
        
        for (let i = 1; i <= lookback; i++) {
            const candle = candles[candles.length - 1 - i];
            const isBearish = candle.close < candle.open;
            const bullishMove = current.close > candle.close && current.close > current.open;
            
            if (isBearish && bullishMove) {
                return {
                    top: candle.high,
                    bottom: candle.low
                };
            }
        }
        
        return null;
    }

    detectBearishOB(candles, lookback) {
        if (candles.length < lookback + 1) return null;
        
        const current = candles[candles.length - 1];
        
        for (let i = 1; i <= lookback; i++) {
            const candle = candles[candles.length - 1 - i];
            const isBullish = candle.close > candle.open;
            const bearishMove = current.close < candle.close && current.close < current.open;
            
            if (isBullish && bearishMove) {
                return {
                    top: candle.high,
                    bottom: candle.low
                };
            }
        }
        
        return null;
    }

    analyzeMarket(candles, symbol, timeframe) {
        if (!candles || candles.length < 50) {
            return {
                marketTrend: 'INSUFFICIENT DATA',
                trendClass: 'neutral-trend',
                rsi: '--',
                signal: null,
                currentPrice: 0,
                signalCheck: null,
                activeSignal: null
            };
        }

        const trendMA = this.calculateSMA(candles, this.config.trendMAPeriod);
        const rsi = this.calculateRSI(candles, this.config.rsiPeriod);
        const atr = this.calculateATR(candles, this.config.atrPeriod);
        const currentCandle = candles[candles.length - 1];

        let marketTrend = 'NEUTRAL';
        let trendClass = 'neutral-trend';
        
        if (currentCandle.close > trendMA && rsi > 50) {
            marketTrend = rsi > 60 ? 'STRONG BULLISH' : 'BULLISH';
            trendClass = 'bullish-trend';
        } else if (currentCandle.close < trendMA && rsi < 50) {
            marketTrend = rsi < 40 ? 'STRONG BEARISH' : 'BEARISH';
            trendClass = 'bearish-trend';
        }

        const lastSwingHigh = this.findPivotHigh(candles, this.config.swingLength);
        const lastSwingLow = this.findPivotLow(candles, this.config.swingLength);

        // CRITICAL FIX: Add CHoCH (Change of Character) - more lenient than BOS
        let bullishBOS = false;
        let bearishBOS = false;
        let bullishCHoCH = false;
        let bearishCHoCH = false;

        if (lastSwingHigh) {
            // BOS: Break with threshold
            bullishBOS = currentCandle.close > lastSwingHigh * (1 + this.config.bos_threshold / 100);
            // CHoCH: Simple break (Pine Script logic)
            bullishCHoCH = currentCandle.close > lastSwingHigh;
        }

        if (lastSwingLow) {
            // BOS: Break with threshold
            bearishBOS = currentCandle.close < lastSwingLow * (1 - this.config.bos_threshold / 100);
            // CHoCH: Simple break (Pine Script logic)
            bearishCHoCH = currentCandle.close < lastSwingLow;
        }

        const bullishFVG = this.detectBullishFVG(candles);
        const bearishFVG = this.detectBearishFVG(candles);
        const bullishOB = this.detectBullishOB(candles, this.config.obLookback);
        const bearishOB = this.detectBearishOB(candles, this.config.obLookback);

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

        // CRITICAL FIX: Use BOS OR CHoCH (matches Pine Script exactly)
        const longStructure = bullishBOS || bullishCHoCH;
        const shortStructure = bearishBOS || bearishCHoCH;
        
        const longPullback = longInFVG || longInOB;
        const shortPullback = shortInFVG || shortInOB;

        const longSignal = longStructure && longPullback;
        const shortSignal = shortStructure && shortPullback;

        let signal = null;
        const key = `${symbol}_${timeframe}`;

        if (longSignal && atr) {
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

            this.activeSignals.set(key, signal);
        } else if (shortSignal && atr) {
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

            this.activeSignals.set(key, signal);
        }

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

    clearHistory() {
        this.tradeHistory = [];
        this.saveTradeHistory();
    }
}

window.TradingStrategy = TradingStrategy;
