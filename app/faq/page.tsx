"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
    // --- SECTION: GENERAL ---
    {
        category: "General",
        q: "What is PolyParlay?",
        a: (
            <p>
                PolyParlay is a professional-grade analytics and trading interface built on top of the <a href="https://polymarket.com" target="_blank" className="text-primary hover:underline">Polymarket</a> protocol.
                We provide advanced tools like <strong>Smart Money tracking</strong>, <strong>Whale activity feeds</strong>, <strong>Fear &amp; Greed Index</strong>, <strong>Edge Score analysis</strong>, and a <strong>Parlay Builder</strong> — giving you an institutional-level view of prediction markets.
                Think of us as a &quot;Bloomberg Terminal&quot; for prediction markets.
            </p>
        )
    },
    {
        category: "General",
        q: "Why use PolyParlay instead of Polymarket directly?",
        a: (
            <>
                <p className="mb-2">We offer specialized features not found on the main Polymarket site:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                    <li><strong>Parlay Builder:</strong> Combine multiple market outcomes into combo bets with compound odds and a single stake — not possible on Polymarket natively.</li>
                    <li><strong>Analytics Dashboard:</strong> Fear &amp; Greed Index, Whale Activity Feed, Edge Score opportunities, Trading Profile analysis, and market leaderboards — all in one place.</li>
                    <li><strong>Smart Money Tracking:</strong> See exactly where large wallets are placing money in real-time, with $1,000+ trade filtering.</li>
                    <li><strong>Cross-chain Deposits:</strong> Deposit from Ethereum, Base, Arbitrum, Solana, Bitcoin, and more — automatically converted to USDC.e for trading.</li>
                    <li><strong>Portfolio Management:</strong> View all your positions, close/sell positions, redeem winnings, and track order status in a unified dashboard.</li>
                    <li><strong>One-Click Setup:</strong> Automated Safe wallet detection, API key derivation, and USDC approvals — streamlined into a single setup flow.</li>
                </ul>
            </>
        )
    },
    {
        category: "General",
        q: "Does this work on Mobile?",
        a: (
            <p>
                <strong>Yes!</strong> PolyParlay is fully responsive. You can access it via any mobile browser (Chrome/Safari) or directly within your wallet&apos;s built-in DApp browser (e.g., inside MetaMask Mobile or Rabby).
            </p>
        )
    },

    // --- SECTION: ANALYTICS ---
    {
        category: "Analytics",
        q: "What analytics tools are available?",
        a: (
            <div className="space-y-4">
                <p>PolyParlay offers a comprehensive analytics suite:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                    <li>
                        <strong>Fear &amp; Greed Index:</strong> A composite market sentiment score (0-100) derived from volatility, volume, momentum, and whale behavior. Helps identify when the market is overly fearful (buying opportunity) or greedy (caution).
                    </li>
                    <li>
                        <strong>Whale Activity Feed:</strong> Real-time feed of trades over $1,000, showing which markets big players are entering or exiting.
                    </li>
                    <li>
                        <strong>Edge Score:</strong> Identifies markets where the current price deviates from our model&apos;s fair value estimate — highlighting potential mispricings and opportunities.
                    </li>
                    <li>
                        <strong>Trading Profile:</strong> Connect your wallet to see a personalized breakdown of your trading history, win rate, P&amp;L, and performance across markets.
                    </li>
                    <li>
                        <strong>Leaderboard:</strong> Top-performing traders ranked by profit, volume, and consistency.
                    </li>
                    <li>
                        <strong>Market-level Analytics:</strong> Per-market whale positions, order book depth, price history, and volume charts.
                    </li>
                </ul>
            </div>
        )
    },
    {
        category: "Analytics",
        q: "How do you calculate 'Smart Money' & 'Whales'?",
        a: (
            <p>
                Our algorithm tags users automatically:
                <br /><br />
                🐳 <strong>Whale:</strong> Wallets with individual trade value &gt;$1,000.
                <br />
                🧠 <strong>Smart Money:</strong> Traders who have &gt;$1,000 in realized PnL on any specific market.
                <br />
                📉 <strong>Dumb Money:</strong> Accounts with high volume but significant losses.
                <br /><br />
                <em>Note:</em> We filter out &quot;Noise&quot; accounts (positions &lt;$1.00) to keep the data clean and actionable.
            </p>
        )
    },
    {
        category: "Analytics",
        q: "What is the Fear & Greed Index?",
        a: (
            <div className="space-y-2">
                <p>Our Fear &amp; Greed Index is a composite score from 0 (Extreme Fear) to 100 (Extreme Greed) that captures overall market sentiment.</p>
                <p>It considers: trading volume trends, price volatility, whale net flows, new vs. returning traders, and momentum across the top markets.</p>
                <p>The index updates regularly and includes a historical chart so you can spot sentiment shifts over time.</p>
            </div>
        )
    },
    {
        category: "Analytics",
        q: "What is Edge Score?",
        a: (
            <div className="space-y-2">
                <p><strong>Edge Score</strong> identifies markets where the current trading price may be mispriced relative to our model.</p>
                <p>Markets are ranked into two categories:</p>
                <ul className="list-disc pl-5 space-y-1 marker:text-primary">
                    <li><strong>Top Opportunities:</strong> Markets with the highest estimated edge (potential profit margin).</li>
                    <li><strong>Hot Opportunities:</strong> Markets trending with unusual activity where the edge is developing.</li>
                </ul>
                <p className="text-xs text-text-muted">Note: Edge scores are model estimates, not guarantees. Always do your own research.</p>
            </div>
        )
    },

    // --- SECTION: BETTING ---
    {
        category: "Trading",
        q: "How does the Parlay Builder work?",
        a: (
            <div className="space-y-3">
                <p>A Parlay (or Accumulator) allows you to select multiple outcomes across different markets to create a combo bet with compound odds.</p>
                <ol className="list-decimal pl-5 space-y-2 marker:text-primary">
                    <li>Browse markets and click <strong>&quot;Add to Parlay&quot;</strong> on any outcome you like.</li>
                    <li>Your selections appear in the <strong>Parlay Slip</strong> on the right side.</li>
                    <li>Enter your stake and see the potential payout calculated from the combined odds.</li>
                    <li>Click <strong>&quot;Place Parlay&quot;</strong> — each leg is signed and submitted as an individual order on the Polymarket CLOB.</li>
                </ol>
                <p><em>Important:</em> PolyParlay executes these as <strong>individual batched orders</strong>. If one leg fails due to liquidity, you only lose that specific bet — the others still execute independently. This is safer than traditional &quot;all-or-nothing&quot; parlays.</p>
            </div>
        )
    },
    {
        category: "Trading",
        q: "What are the betting limits (Min/Max)?",
        a: (
            <div className="space-y-4 text-sm leading-relaxed">
                <div>
                    <h4 className="font-bold text-text-primary mb-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-pill bg-primary"></span>
                        Parlay Size (Legs)
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-text-secondary marker:text-primary/50">
                        <li><strong>Minimum:</strong> At least <strong>2 outcomes</strong> (legs) are required.</li>
                        <li><strong>Maximum:</strong> No hard limit, but we recommend <strong>10-12 legs</strong> for optimal execution.</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-text-primary mb-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-pill bg-success"></span>
                        Stake Amount
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-text-secondary marker:text-success/50">
                        <li><strong>Minimum:</strong> $5.00 USDC total stake.</li>
                        <li><strong>Maximum:</strong> No fixed cap — limited only by available market liquidity. Large bets may experience slippage.</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        category: "Trading",
        q: "Can I sell my position before the event ends?",
        a: (
            <p>
                <strong className="text-text-primary">Yes!</strong> You are never locked in. You can sell your position at any time from the <strong>Portfolio</strong> page.
                <br /><br />
                PolyParlay creates a SELL order on the Polymarket CLOB order book, allowing you to exit at the current market price. Many traders take profit early (e.g., selling at 80¢ after buying at 40¢) rather than waiting for the final resolution.
            </p>
        )
    },
    {
        category: "Trading",
        q: "What are the fees?",
        a: (
            <p>
                PolyParlay does not charge any additional platform fees. You only pay:
                <br /><br />
                • <strong>Polymarket exchange fees</strong> — dynamically set per market (typically 0-2%).
                <br />
                • <strong>Polygon gas fees</strong> — usually less than $0.01 per transaction.
                <br /><br />
                If you use a Proxy Wallet (Safe), gas for trading is <strong>subsidized by Polymarket&apos;s relayer</strong> — making most trades effectively gasless.
            </p>
        )
    },
    {
        category: "Trading",
        q: "What are 'Decimal Odds'?",
        a: (
            <p>
                We display odds in decimal format (e.g., 2.50x). This represents the total payout per $1 bet.
                <br />
                Formula: <code>1 / Probability</code>.
                <br />
                Example: A 40% chance (40¢) = <code>1 / 0.40 = 2.50x</code>.
                <br />
                So a $100 bet pays out $250 total ($150 profit + $100 principal).
            </p>
        )
    },
    {
        category: "Trading",
        q: "What is Slippage?",
        a: (
            <p>
                Slippage is the difference between the displayed price and the actual execution price.
                This happens when your order size exceeds the available liquidity at the current price in the order book.
                <br /><br />
                <em>Example:</em> You want to buy $5,000 of shares at 50¢. If only $1,000 is available at 50¢, the rest fills at 51¢, 52¢, etc., raising your average price.
                PolyParlay estimates slippage impact automatically before you confirm.
            </p>
        )
    },

    // --- SECTION: WALLET & FUNDS ---
    {
        category: "Wallet & Funds",
        q: "What is a Proxy Wallet (Safe)?",
        a: (
            <div className="space-y-3">
                <p>When you first use Polymarket, a <strong>Gnosis Safe</strong> smart contract wallet is automatically deployed on the Polygon network. This is your &quot;Proxy Wallet.&quot;</p>
                <p>How it works:</p>
                <ul className="list-disc pl-5 space-y-1 marker:text-primary">
                    <li>Your <strong>main wallet (EOA)</strong> only signs messages — it never directly holds trading funds.</li>
                    <li>Your <strong>Proxy Wallet</strong> holds your USDC.e and position tokens on Polygon.</li>
                    <li>All trades execute <strong>through the proxy</strong>, enabling gasless transactions via Polymarket&apos;s relayer.</li>
                    <li>You maintain full control — the proxy can only be operated by your connected wallet.</li>
                </ul>
                <p className="text-xs text-text-muted">You can find your proxy wallet address in the Funds modal header.</p>
            </div>
        )
    },
    {
        category: "Wallet & Funds",
        q: "How do I deposit funds?",
        a: (
            <div className="space-y-3">
                <p>PolyParlay supports multiple deposit methods via the <strong>Funds</strong> modal:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                    <li>
                        <strong>Cross-chain Deposit:</strong> Send crypto from <strong>any supported chain</strong> (Ethereum, Base, Arbitrum, Optimism, Solana, Bitcoin, BNB, and more). The Polymarket Bridge automatically converts your assets to USDC.e on Polygon. Minimums: $2 for most chains, $7 for Ethereum, $9 for Bitcoin.
                    </li>
                    <li>
                        <strong>Direct Send:</strong> If you already have USDC.e on Polygon in your connected wallet, send it directly to your proxy wallet — instant and gas-only.
                    </li>
                    <li>
                        <strong>Swap:</strong> If you have Native USDC on Polygon but need USDC.e (Bridged), the built-in swap converts it for you.
                    </li>
                </ul>
            </div>
        )
    },
    {
        category: "Wallet & Funds",
        q: "How does the cross-chain deposit work?",
        a: (
            <div className="space-y-3">
                <p>When you click <strong>&quot;Get Deposit Address&quot;</strong>, the Polymarket Bridge API generates a unique temporary address for your wallet.</p>
                <ol className="list-decimal pl-5 space-y-2 marker:text-primary">
                    <li>You send tokens (ETH, USDC, SOL, BTC, etc.) to the generated deposit address on the source chain.</li>
                    <li>The bridge service automatically receives, swaps, bridges, and converts your assets.</li>
                    <li>USDC.e appears in your Proxy Wallet on Polygon, ready for trading.</li>
                </ol>
                <p>This is the <strong>same bridge</strong> used by polymarket.com — fully official and secure. PolyParlay monitors the deposit and shows a confirmation when it arrives.</p>
            </div>
        )
    },
    {
        category: "Wallet & Funds",
        q: "How do I withdraw?",
        a: (
            <p>
                Use the <strong>Withdraw</strong> tab in the Funds modal to send USDC.e from your trading wallet to any address.
                <br /><br />
                To cash out to a bank account: send USDC to a centralized exchange (Coinbase, Binance, Kraken) on the <strong>Polygon network</strong>, then sell for fiat. Or use direct off-ramp services like MoonPay built into wallets like MetaMask.
            </p>
        )
    },

    // --- SECTION: RESOLUTION & REDEMPTION ---
    {
        category: "Resolution",
        q: "What happens when a market resolves?",
        a: (
            <div className="space-y-3">
                <p>When an event concludes:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                    <li>✅ <strong>Winning outcome:</strong> Each winning share becomes redeemable for <strong>$1.00 USDC.e</strong>.</li>
                    <li>❌ <strong>Losing outcome:</strong> Shares become worth $0.</li>
                </ul>
                <p>Resolution is handled by the decentralized <strong>UMA Optimistic Oracle</strong>. If a result is disputed, UMA token holders vote to determine the final truth.</p>
            </div>
        )
    },
    {
        category: "Resolution",
        q: "How do I redeem (claim) my winnings?",
        a: (
            <div className="space-y-3">
                <p>After a market resolves, go to your <strong>Portfolio</strong> page:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                    <li><strong>EOA users:</strong> Click the <strong>&quot;Redeem&quot;</strong> button next to your winning position. This calls the <code>redeemPositions</code> function on the Conditional Tokens contract, burning your winning tokens and returning USDC.e.</li>
                    <li><strong>Proxy wallet users:</strong> Since your positions live in the proxy wallet, redemption is handled automatically by Polymarket or you can redeem at <a href="https://polymarket.com/portfolio" target="_blank" className="text-primary hover:underline">polymarket.com/portfolio</a>.</li>
                </ul>
            </div>
        )
    },

    // --- SECTION: TECHNICAL ---
    {
        category: "Technical",
        q: "Is PolyParlay safe? Do you hold my funds?",
        a: (
            <p>
                <strong>Yes, it is safe.</strong> PolyParlay is a <strong>non-custodial</strong> interface.
                We <strong>never</strong> hold your funds. All transactions are signed directly by your own wallet and executed on the Polygon blockchain via the official Polymarket Exchange smart contracts.
                <br /><br />
                We build the order payload, you sign it, and it goes directly to Polymarket&apos;s CLOB (Central Limit Order Book). Your keys, your coins.
            </p>
        )
    },
    {
        category: "Technical",
        q: "What is the Quick Setup process?",
        a: (
            <div className="space-y-3">
                <p>When you first connect your wallet, PolyParlay runs an automated setup:</p>
                <ol className="list-decimal pl-5 space-y-2 marker:text-primary">
                    <li><strong>Account Check:</strong> Scans your address on Polymarket to find your proxy wallet.</li>
                    <li><strong>Safe Wallet Verification:</strong> Confirms your Gnosis Safe is deployed and linked.</li>
                    <li><strong>API Key Derivation:</strong> You sign an EIP-712 message to create L2 API credentials (key, secret, passphrase) for trading.</li>
                    <li><strong>USDC Approvals:</strong> Approves USDC.e spending on three Polymarket contracts (CTF Exchange, Neg Risk Exchange, Neg Risk Adapter).</li>
                    <li><strong>USDC Swap (if needed):</strong> Offers to swap Native USDC to Bridged USDC.e if detected.</li>
                </ol>
                <p>This is a one-time process. Credentials are stored locally in your browser.</p>
            </div>
        )
    },
    {
        category: "Technical",
        q: "Why do I need to 'Approve' USDC?",
        a: (
            <p>
                Before trading, you must authorize three Polymarket smart contracts to spend your USDC.e:
                <br /><br />
                • <strong>CTF Exchange</strong> — for standard markets
                <br />
                • <strong>Neg Risk CTF Exchange</strong> — for multi-outcome markets
                <br />
                • <strong>Neg Risk Adapter</strong> — for token conversion in multi-outcome markets
                <br /><br />
                This is a standard, <strong>one-time</strong> ERC-20 approval. Each requires a small gas fee on Polygon (usually &lt;$0.01). After approval, you can trade freely without re-approving.
            </p>
        )
    },
    {
        category: "Technical",
        q: "Which wallets are supported?",
        a: (
            <p>
                We support all major EVM-compatible wallets via <strong>WalletConnect</strong> and browser injection:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-text-secondary text-sm font-medium">
                    <li>MetaMask (Recommended)</li>
                    <li>Rabby Wallet</li>
                    <li>Coinbase Wallet</li>
                    <li>Rainbow / Trust Wallet</li>
                    <li>Any WalletConnect-compatible wallet</li>
                </ul>
            </p>
        )
    },
    {
        category: "Technical",
        q: "Why USDC.e on Polygon?",
        a: (
            <p>
                Polymarket operates exclusively on the <strong>Polygon PoS</strong> network using <strong>USDC.e</strong> (Bridged USDC).
                This ensures transaction fees are extremely low (fractions of a cent) and confirmation times are fast (~2 seconds), making high-frequency trading viable.
                <br /><br />
                <em>Note:</em> Native USDC on Polygon is different from USDC.e. PolyParlay includes a built-in swap tool if you have the wrong type.
            </p>
        )
    },

    // --- SECTION: TROUBLESHOOTING ---
    {
        category: "Troubleshooting",
        q: "Data isn't loading or looks stuck?",
        a: (
            <p>
                Try these steps:
                <br />
                1. Click the <strong className="text-primary">Refresh (↻)</strong> button on any analytics card.
                <br />
                2. Hard refresh the page (Ctrl+R / Cmd+R).
                <br />
                3. Ensure your wallet is connected to the <strong>Polygon network</strong> (chain ID: 137).
                <br />
                4. Check that you have a stable internet connection — analytics data comes from multiple API sources.
            </p>
        )
    },
    {
        category: "Troubleshooting",
        q: "'Enable Trading' or order submission fails?",
        a: (
            <div className="space-y-2">
                <p>Common causes and fixes:</p>
                <ul className="list-disc pl-5 space-y-1 marker:text-primary">
                    <li><strong>Signature rejected:</strong> You must sign the EIP-712 message in your wallet. Don&apos;t cancel/reject it.</li>
                    <li><strong>Insufficient USDC.e:</strong> Deposit funds via the Funds modal before trading.</li>
                    <li><strong>USDC not approved:</strong> Run Quick Setup again or manually approve in the Funds &gt; Swap tab.</li>
                    <li><strong>Session expired:</strong> API credentials expire. Click &quot;Enable Trading&quot; again to refresh them.</li>
                </ul>
            </div>
        )
    },
    {
        category: "Privacy",
        q: "Do you track my data?",
        a: (
            <p>
                We respect user privacy. PolyParlay does not require email registration or KYC.
                We use minimal analytics to count page views but we do <strong>not</strong> track your trading strategies, link wallet addresses to identities, or share any data with third parties.
                All credential data (API keys) is stored <strong>only in your browser&apos;s localStorage</strong>.
            </p>
        )
    },
];

export default function FAQPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 max-w-4xl mx-auto animate-fade-in">
            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-wider mb-4">
                    <span className="text-text-primary">Knowledge</span> <span className="text-primary glow-text">Base</span>
                </h1>
                <p className="text-text-secondary text-sm md:text-lg max-w-2xl mx-auto font-medium">
                    Everything you need to know about PolyParlay — prediction markets, analytics, trading, deposits, and more.
                </p>
            </div>

            <div className="grid gap-6">
                {FAQ_ITEMS.map((item, i) => {
                    const isOpen = openIndex === i;
                    return (
                        <div
                            key={item.q}
                            className={cn(
                                "group border rounded-card overflow-hidden transition-all duration-300 relative",
                                isOpen
                                    ? "bg-surface-2 border-primary/50 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]"
                                    : "bg-surface-1/50 border-border-default hover:border-border-default/80 hover:bg-surface-2/50"
                            )}
                        >
                            {/* Category Label */}
                            <div className="absolute top-4 right-12 text-[10px] uppercase font-bold tracking-wider text-text-muted hidden sm:block">
                                {item.category}
                            </div>

                            <button
                                onClick={() => setOpenIndex(isOpen ? null : i)}
                                className="w-full flex items-center justify-between p-5 text-left relative z-10"
                            >
                                <div className="flex items-center gap-4">
                                    <span className={cn(
                                        "text-lg md:text-xl font-bold transition-colors pr-8",
                                        isOpen ? "text-primary" : "text-text-primary group-hover:text-text-primary"
                                    )}>
                                        {item.q}
                                    </span>
                                </div>

                                <span className={cn(
                                    "shrink-0 w-8 h-8 flex items-center justify-center rounded-pill transition-all duration-300 border border-transparent",
                                    isOpen
                                        ? "bg-primary text-white rotate-180 shadow-glow"
                                        : "bg-surface-3 text-text-secondary group-hover:bg-surface-3 group-hover:text-text-primary"
                                )}>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M2 5L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            </button>

                            <div
                                className={cn(
                                    "overflow-hidden transition-all duration-300 ease-in-out origin-top",
                                    isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                                )}
                            >
                                <div className="p-6 pt-0 text-sm md:text-base text-text-secondary leading-relaxed border-t border-border-default/20">
                                    <div className="max-w-3xl py-4">
                                        {item.a}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer CTA */}
            <div className="mt-20 text-center">
                <div className="inline-block p-px rounded-modal bg-gradient-to-r from-transparent via-primary/50 to-transparent">
                    <div className="bg-surface-1 rounded-modal p-8 border border-border-default/50 backdrop-blur-sm">
                        <h3 className="text-xl font-bold text-text-primary mb-2">Still need help?</h3>
                        <p className="text-sm text-text-secondary mb-6 font-medium">
                            Check out the official Polymarket documentation or join the community.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a
                                href="https://docs.polymarket.com/"
                                target="_blank"
                                rel="noreferrer"
                                className="bg-surface-3 text-text-primary px-6 py-2.5 rounded-button text-sm font-bold uppercase tracking-wide flex items-center gap-2 hover:bg-surface-3/80 shadow-sm transition-colors"
                            >
                                Polymarket Docs
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </a>
                            <a
                                href="https://discord.com/invite/polymarket"
                                target="_blank"
                                rel="noreferrer"
                                className="bg-primary text-text-primary px-6 py-2.5 rounded-button text-sm font-bold uppercase tracking-wide flex items-center gap-2 hover:bg-primary-hover shadow-sm transition-colors"
                            >
                                Join Discord
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
