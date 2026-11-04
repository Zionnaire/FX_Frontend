# Aura Forex — Dashboard 📊

**The trading dashboard for [Aura Forex](https://github.com/Zionnaire/FX_backend), an AI-assisted forex signal and execution platform.**

<!-- 🔗 Live demo: add link · ![Dashboard](docs/dashboard.png) -->

> ⚠️ Personal engineering project, not financial advice.

## ✨ Pages & Features

- **Signals:** AI-explained trade setups with confidence, entry, SL, and TP, plus a trade-confirmation modal for MT5 execution (60-second approval window).
- **Live quotes & charts:** real-time prices over WebSocket, TradingView Lightweight Charts with indicators.
- **Scanner:** multi-pair, multi-timeframe setup detection.
- **Trades & portfolio:** trade journal, open positions, and portfolio risk.
- **Analytics:** performance, Monte Carlo robustness, and behaviour insights.
- **Prop firm:** challenge progress and rule-breach tracking.
- **RAG assistant:** ask questions against your uploaded trading knowledge (drag-and-drop PDFs).
- **News, alerts, settings,** plus light and dark themes and pull-to-refresh.

## 🛠 Tech Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Lightweight Charts · Chart.js · Axios · WebSockets · custom hooks per domain (`useSignal`, `useScanner`, `useMonteCarlo`, `useAutoTrade`, …)

## 🚀 Getting Started

```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
npm run dev     # http://localhost:3000
```

Requires the [backend](https://github.com/Zionnaire/FX_backend) running.

## 👤 Author

**Fowosere Ademola Abraham** ([@Zionnaire](https://github.com/Zionnaire))
