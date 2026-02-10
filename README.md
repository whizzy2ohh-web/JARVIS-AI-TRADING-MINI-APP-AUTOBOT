# 🤖 JARVIS AI Trading Signals - Telegram Mini App

A professional cryptocurrency trading signals app for Telegram, featuring real-time market analysis for BTC, ETH, and XRP.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 📊 **Real-time Market Sentiment** - Advanced trend analysis with RSI indicators
- 🎯 **Smart Trading Signals** - Long/Short signals based on market structure
- 📈 **Multiple Timeframes** - 1-Day and 15-Minute chart analysis
- ⚡ **Auto-Refresh** - Updates every 30 seconds
- 🌙 **Dark Cyber Theme** - Sleek, professional interface
- 📱 **Mobile Optimized** - Works perfectly in Telegram

## 🚀 Quick Start

1. **Host the App**
   - Upload all files to GitHub Pages
   - Get your hosting URL

2. **Create Telegram Bot**
   - Talk to @BotFather
   - Create new bot
   - Set up Web App with your URL

3. **Launch**
   - Open your bot in Telegram
   - Click menu button
   - Start receiving signals!

📖 **[Read the Full Deployment Guide](DEPLOYMENT_GUIDE.md)**

## 🛠️ Technology

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Data Source**: Binance Public API
- **Strategy**: ICT Smart Money Concepts
- **Platform**: Telegram Mini Apps

## 📊 Strategy Overview

Based on institutional trading concepts:

- **Market Structure**: Break of Structure (BOS), Change of Character (CHoCH)
- **Entry Zones**: Fair Value Gaps (FVG), Order Blocks (OB)
- **Risk Management**: ATR-based stops, 3:1 reward/risk ratio
- **Confirmation**: Higher timeframe trend alignment

## 🎨 Screenshots

*Add screenshots of your app here after deployment*

## ⚙️ Configuration

### Supported Cryptocurrencies
- Bitcoin (BTC)
- Ethereum (ETH)
- Ripple (XRP)

### Timeframes
- 1 Day (D1)
- 15 Minutes (M15)

### Auto-Refresh
- Default: 30 seconds
- Customizable in `app.js`

## 🔧 Customization

### Add More Coins

Edit `app.js`:
```javascript
symbols: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'SOLUSDT']
```

### Adjust Refresh Rate

Edit `app.js`:
```javascript
refreshInterval: 60, // seconds
```

### Modify Strategy Parameters

Edit `strategy.js`:
```javascript
this.config = {
    swingLength: 5,
    bos_threshold: 0.1,
    fvgMinSize: 0.15,
    // ... more parameters
}
```

## 📝 Files Overview

- `index.html` - App structure and layout
- `styles.css` - Dark cyber theme styling
- `strategy.js` - Trading strategy logic
- `app.js` - Data fetching and UI updates
- `DEPLOYMENT_GUIDE.md` - Step-by-step setup instructions

## ⚠️ Disclaimer

This app is for educational and informational purposes only. It does not constitute financial advice. Always do your own research and never trade with money you cannot afford to lose.

## 📄 License

MIT License - Feel free to modify and use for personal projects

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

## 📞 Support

Having issues? Check the [Deployment Guide](DEPLOYMENT_GUIDE.md) troubleshooting section.

---

Made with ⚡ by a trader, for traders

**Remember**: Good signals wait for perfect setups. Be patient! 🎯
