// ==================== JARVIS AI TRADING STRATEGY ====================
// Converted from Pine Script to JavaScript

class TradingStrategy {
    constructor() {
        // Strategy Parameters (matching Pine Script defaults)
        this.config = {
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
        };
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

        // Initial average gain/loss
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

        // Check if it's higher than left and right bars
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

        // Check if it's lower than left and right bars
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

        // Bullish FVG: Gap between high[2] and low (current)
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

        // Bearish FVG: Gap between low[2] and high (current)
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
        
        // Look for last bearish candle before bullish move
        for (let i = 1; i <= lookback; i++) {
            const candle = candles[candles.length - 1 - i];
            
            if (candle.close < candle.open && // Bearish candle
                current.close > candle.close && // Current higher
                current.close > current.open) { // Current bullish
                
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
        
        // Look for last bullish candle before bearish move
        for (let i = 1; i <= lookback; i++) {
            const candle = candles[candles.length - 1 - i];
            
            if (candle.close > candle.open && // Bullish candle
                current.close < candle.close && // Current lower
                current.close < current.open) { // Current bearish
                
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
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);

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
                zone: longInFVG ? 'FVG' : 'OB'
            };
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
                zone: shortInFVG ? 'FVG' : 'OB'
            };
        }

        return {
            marketTrend,
            trendClass,
            rsi: rsi ? rsi.toFixed(2) : '--',
            signal,
            currentPrice: currentCandle.close
        };
    }
}

// Export for use in app.js
window.TradingStrategy = TradingStrategy;
