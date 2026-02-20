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
                PolyParlay is a powerful analytics and trading interface built on top of the <a href="https://polymarket.com" target="_blank" className="text-primary hover:underline">Polymarket</a> protocol.
                We provide advanced tools like <strong>Smart Money tracking</strong>, <strong>Real-time PnL analysis</strong>, and a <strong>Parlay Builder</strong> to help you make data-driven decisions.
                Think of us as a &quot;Pro Terminal&quot; for prediction markets.
            </p>
        )
    },
    {
        category: "General",
        q: "Why use PolyParlay instead of Polymarket directly?",
        a: (
            <>
                <p className="mb-2">We offer specialized features not found on the main site:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                    <li><strong>Deep Analytics:</strong> See exactly who is winning and losing in real-time.</li>
                    <li><strong>Holder Analysis:</strong> Reveal &quot;Hidden Whales&quot; who minted shares (not shown on standard trade feeds).</li>
                    <li><strong>Parlay Builder:</strong> Easily combine multiple market outcomes to visualize compound odds and potential payouts.</li>
                    <li><strong>Faster Discovery:</strong> Filter markets by unique metrics like &quot;Smart Money Inflow&quot; or &quot;Whale Accumulation&quot;.</li>
                </ul>
            </>
        )
    },

    // --- SECTION: ANALYTICS & PNL ---
    {
        category: "Analytics",
        q: "What are the new 'Trust & Integrity' metrics?",
        a: (
            <div className="space-y-4">
                <p>
                    We use on-chain forensics to detect potential market manipulation. Our dashboard now includes:
                </p>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                    <li>
                        <strong>Wash Trading Index:</strong> Detects repetitive buy/sell patterns from the same wallet designed to artificially inflate volume without changing position.
                        <span className="block text-xs text-text-muted mt-1">If this is &gt;10%, be careful—volume might be fake.</span>
                    </li>
                    <li>
                        <strong>HHI Score (Centralization):</strong> Measures how accumulated the shares are. A &quot;High&quot; score means a few whales control the majority of the market outcome.
                    </li>
                    <li>
                        <strong>Fresh Wallet Volume:</strong> Tracks money coming from wallets that have never traded before (less than 24h old). High values often indicate new retail interest or a bot attack.
                    </li>
                </ul>
            </div>
        )
    },
    {
        category: "Analytics",
        q: "How do I use the Watchlist?",
        a: (
            <p>
                You can track specific traders by clicking the <strong>Star (★) icon</strong> next to their name in the &quot;Positions&quot; or &quot;Whales&quot; table.
                <br /><br />
                A dedicated <strong>Watchlist Tab</strong> allows you to monitor their PnL and trades across different markets in one place, helping you copy-trade the smartest players.
            </p>
        )
    },
    {
        category: "Analytics",
        q: "What does the Activity Graph show?",
        a: (
            <p>
                The graph visualizes <strong>24-hour hourly trading volume</strong>.
                <br />
                <span className="text-success font-bold">Green areas</span> represent &quot;Yes&quot; volume dominance, while <span className="text-error font-bold">Red areas</span> show &quot;No&quot; volume.
                <br /><br />
                This helps you instantly see which side of the market is driving the momentum at any given hour.
            </p>
        )
    },
    {
        category: "Analytics",
        q: "How do you calculate 'Smart Money' & 'Whales'?",
        a: (
            <p>
                Our algorithm tags users automatically:
                <br /><br />
                🐳 <strong>Whale:</strong> Wallets with positions or trade value &gt;$1,000.
                <br />
                🧠 <strong>Smart Money:</strong> Traders who have &gt;$1,000 in realized PnL on this specific market.
                <br />
                📉 <strong>Dumb Money:</strong> Accounts with high volume but significant losses.
                <br /><br />
                <em>Note:</em> We filter out &quot;Noise&quot; accounts (positions &lt;$1.00) to keep the data clean.
            </p>
        )
    },
    {
        category: "Analytics",
        q: "What do the 'Momentum' metrics tell me?",
        a: (
            <div className="space-y-2">
                <p>The Momentum card tracks the speed of money:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Whale Net Flow (24h):</strong> Are big players buying (Green) or selling (Red) in total?</li>
                    <li><strong>Trade Velocity:</strong> Compares activity in the last hour vs. the 24h average. A velocity &gt;2.0x means the market is heating up fast.</li>
                    <li><strong>Holder Retention:</strong> How long the average active trader holds their position before selling.</li>
                </ul>
            </div>
        )
    },
    {
        category: "Analytics",
        q: "Why does a top holder show 'No profitable trades'?",
        a: (
            <p>
                This usually indicates the holder is a <strong>Market Maker</strong> or an advanced user who acquired their position via <strong>Minting</strong> (sending USDC directly to the contract to split into Yes/No shares) rather than buying on the order book.
                <br /><br />
                Since they didn&apos;t &quot;buy&quot; on the public market, our trade engine doesn&apos;t see an entry price. However, we strictly verify their <strong>Current Holdings</strong> directly from the blockchain to ensure the leaderboard is accurate.
            </p>
        )
    },

    // --- SECTION: BETTING ---
    {
        category: "Betting",
        q: "How does the Parlay Builder work?",
        a: (
            <p>
                A Parlay (or Accumulator) allows you to select multiple outcomes across different markets.
                We calculate the <strong>Combined Odds</strong> by multiplying the probabilities of your selected legs.
                <br /><br />
                <em>Note:</em> Currently, PolyParlay executes these as <strong>individual batched orders</strong> for your convenience. This means if one leg fails, you only lose that specific bet, unlike a traditional &quot;all-or-nothing&quot; parlay. We visualize the <em>potential compound accumulation</em> strategy.
            </p>
        )
    },
    {
        category: "Betting",
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
                        <li><strong>Maximum:</strong> There is no strict hard limit, but we recommend keeping parlays under <strong>10-12 legs</strong> to ensure successful execution within blockchain gas limits.</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-text-primary mb-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-pill bg-success"></span>
                        Stake Amount ($)
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-text-secondary marker:text-success/50">
                        <li><strong>Minimum:</strong> The minimum stake is <strong>$5.00 USDC</strong>.</li>
                        <li>
                            <em className="text-xs opacity-70 block mb-1">&quot;Why is this higher than Polymarket&apos;s $1?&quot;</em>
                            Polymarket&apos;s $1 limit is for a <strong>single event</strong>. Since a parlay combines <strong>at least 2 events</strong>, we require a $5 total entry to ensure reliable execution across multiple simultaneous trades. This helps prevent partial fills and failed legs.
                        </li>
                        <li><strong>Maximum:</strong> There is no fixed maximum bet. Your trade size is naturally limited by the <strong>available liquidity</strong> in each specific market. Extremely large bets may experience slippage (worse odds).</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        category: "Betting",
        q: "Can I use Limit Orders?",
        a: (
            <p>
                Currently, PolyParlay focuses on <strong>Market Orders</strong> (instant execution) to ensure the simplest user interface and reliable execution for multi-leg parlays.
                <br />
                We are developing <strong>Limit Order</strong> functionality (Maker orders) for a future update.
            </p>
        )
    },
    {
        category: "Betting",
        q: "What are 'Decimal Odds'?",
        a: (
            <p>
                We display odds in decimal format (e.g., 2.50x). This represents the total payout per $1 bet.
                <br />
                Formula: <code>1 / Probability</code>.
                <br />
                Example: A 40% chance (40¢) = <code>1 / 0.40 = 2.50x</code>.
                <br />
                So, a $100 bet pays out $250 total ($150 profit + $100 principal).
            </p>
        )
    },

    // --- SECTION: TECHNICAL ---
    {
        category: "Technical",
        q: "Is PolyParlay safe? Do you hold my funds?",
        a: (
            <p>
                <strong>Yes, it is safe.</strong> PolyParlay is a non-custodial interface.
                We <strong>never</strong> hold your funds. All transactions are signed directly by your own wallet (Metamask, Coinbase, etc.) and executed on the Polygon blockchain via the official Polymarket Exchange Contract.
                <br /><br />
                We simply build the transaction payload for you to sign. You maintain full control at all times.
            </p>
        )
    },
    {
        category: "Technical",
        q: "What is a Proxy Wallet?",
        a: (
            <p>
                Polymarket uses a &quot;Proxy Wallet&quot; (Gnosis Safe) architecture to enable gasless trading and faster execution.
                When you trade on PolyParlay, you are interacting with this same Proxy Wallet associated with your address.
                This ensures specific compatibility with the Polymarket CTF (Conditional Token Framework).
            </p>
        )
    },
    {
        category: "Troubleshooting",
        q: "Data isn't loading or looks stuck?",
        a: (
            <p>
                Markets can be fast-moving! Try these steps:
                <br />
                1. Click the <strong className="text-primary">Refresh (↻)</strong> button on the analytics card to fetch the absolute latest data.
                <br />
                2. Hard refresh the page (Ctrl+R / Cmd+R).
                <br />
                3. Ensure your wallet is connected to the Polygon network.
            </p>
        )
    },

    // --- SECTION: EXPANDED TOPICS ---
    {
        category: "Betting",
        q: "What are the fees?",
        a: (
            <p>
                We do not charge any additional platform fees on top of standard network costs.
                You only pay the standard <a href="https://polymarket.com" target="_blank" className="text-primary hover:underline">Polymarket</a> exchange fees (if any) and Polygon network gas fees (which are usually less than $0.01).
            </p>
        )
    },
    {
        category: "Betting",
        q: "What happens when an event ends (Resolution)?",
        a: (
            <p>
                When a market resolves:
                <br /><br />
                ✅ <strong>YES Wins:</strong> Each YES share becomes redeemable for $1.00 USDC. NO shares become worthless ($0).
                <br />
                ❌ <strong>NO Wins:</strong> Each NO share becomes redeemable for $1.00 USDC. YES shares become worthless.
                <br /><br />
                Resolution is handled by the decentralized <strong>UMA Optimistic Oracle</strong>. If the result is disputed, UMA token holders vote to determine the final truth.
            </p>
        )
    },
    {
        category: "Betting",
        q: "Walkthrough: How do I get paid?",
        a: (
            <div className="space-y-3">
                <p>The process is completely decentralized. Here is the lifecycle of your money:</p>
                <ol className="list-decimal pl-5 space-y-3 text-sm text-text-secondary marker:text-primary font-medium">
                    <li>
                        <strong className="text-text-primary">Place Bet:</strong> When you buy &quot;YES&quot;, your USDC is sent to the smart contract, and you receive &quot;YES Shares&quot; (ERC-1155 tokens) in your wallet.
                    </li>
                    <li>
                        <strong className="text-text-primary">Resolution:</strong> When the event ends, the Oracle confirms user outcome.
                        <br />
                        • Winning shares become redeemable for <strong>$1.00 USDC</strong> each.
                        <br />
                        • Losing shares become worth $0.
                    </li>
                    <li>
                        <strong className="text-text-primary">Redeem (Claim):</strong> You swap your winning shares back for USDC to get your payout. This is usually done instantly via the &quot;Redeem&quot; function.
                    </li>
                </ol>
            </div>
        )
    },
    {
        category: "Betting",
        q: "Can I sell before the event ends?",
        a: (
            <p>
                <strong className="text-text-primary">Yes!</strong> You are never locked in. You can sell your position at any time at the current market price.
                <br /><br />
                Many traders take profit early (e.g., selling at 80¢ after buying at 40¢) rather than waiting for the final result to avoid last-minute risks.
            </p>
        )
    },
    {
        category: "Money",
        q: "How do I withdraw to my bank account?",
        a: (
            <p>
                Since your funds are standard <strong>USDC on the Polygon Network</strong>, you can cash out easily:
                <br /><br />
                1. <strong>Send to Exchange:</strong> Send your USDC to a centralized exchange like Coinbase, Binance, or Kraken. <em className="text-primary">IMPORTANT: Ensure you select the &quot;Polygon&quot; network for the deposit address.</em> Then sell for cash.
                <br />
                2. <strong>Direct Off-Ramp:</strong> Use services like MoonPay or Transak built into many wallets (like MetaMask) to sell crypto directly to your card.
            </p>
        )
    },
    {
        category: "Betting",
        q: "What is Slippage?",
        a: (
            <p>
                Slippage is the difference between the price you see and the price you actually get.
                This happens when your order size is large relative to the available liquidity (depth) in the order book.
                <br /><br />
                <em>Example:</em> You want to buy $5000 of shares at 50¢. If there&apos;s only $1000 available at 50¢, the rest might be bought at 51¢, 52¢, etc., raising your average price.
                PolyParlay estimates this impact automatically.
            </p>
        )
    },
    {
        category: "Betting",
        q: "Why USDC on Polygon?",
        a: (
            <p>
                Polymarket operates exclusively on the <strong>Polygon PoS</strong> network using <strong>USDC.e</strong> (Bridged USDC).
                This ensures transaction fees are extremely low (fractions of a cent) and confirmation times are fast (~2 seconds), making high-frequency trading viable.
            </p>
        )
    },
    {
        category: "Technical",
        q: "Why do I need to 'Approve' USDC?",
        a: (
            <p>
                Before you can trade, you must authorize the Polymarket Exchange smart contract to spend your USDC.
                This is a standard <strong>one-time security permission</strong> (ERC-20 Approval) required by all decentralized exchanges securely on the blockchain.
            </p>
        )
    },
    {
        category: "Technical",
        q: "Can I use limit orders?",
        a: (
            <p>
                Currently, PolyParlay focuses on <strong>Market Orders</strong> (Instant Execution) for the simplest user experience.
                We are actively working on adding Limit Order functionality (Maker Orders) in a future update.
            </p>
        )
    },
    {
        category: "Technical",
        q: "Which wallets are supported?",
        a: (
            <p>
                We support all major EVM-compatible wallets via <strong>WalletConnect</strong> and standard injection:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-text-secondary text-sm font-medium">
                    <li>MetaMask (Recommended)</li>
                    <li>Rabby Wallet</li>
                    <li>Coinbase Wallet</li>
                    <li>Rainbow / Trust Wallet</li>
                </ul>
            </p>
        )
    },
    {
        category: "General",
        q: "Does this work on Mobile?",
        a: (
            <p>
                <strong>Yes!</strong> PolyParlay is fully responsive. You can access it via any mobile browser (Chrome/Safari) or directly within your wallet&apos;s built-in DApp browser (e.g., inside MetaMask Mobile).
            </p>
        )
    },
    {
        category: "Privacy",
        q: "Do you track my data?",
        a: (
            <p>
                We respect user privacy. We do not require email registration or KYC directly on our interface.
                We use standard simplified analytics (plausible/fathom style) to count visitors, but we do not track your specific trade strategies or link your wallet address to real-world identities.
            </p>
        )
    },
    {
        category: "Developers",
        q: "Is there an API?",
        a: (
            <p>
                We do not currently offer a public API for PolyParlay&apos;s specific analytics.
                However, our data is sourced from the public <a href="https://docs.polymarket.com/" target="_blank" className="text-primary hover:underline">Polymarket Gamma API</a> and on-chain data, which you can access directly if you are a developer.
            </p>
        )
    }
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
                    Everything you need to know about PolyParlay, prediction markets, and advanced analytics.
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
                            Check out the official documentation or join the community.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a
                                href="https://learn.polymarket.com/"
                                target="_blank"
                                rel="noreferrer"
                                className="bg-surface-3 text-text-primary px-4 py-2 rounded-button font-medium hover:bg-surface-3/80 shadow-sm transition-colors px-6 py-2.5 text-sm font-bold uppercase tracking-wide flex items-center gap-2"
                            >
                                Polymarket Learn
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </a>
                            <a
                                href="https://discord.com/invite/polymarket"
                                target="_blank"
                                rel="noreferrer"
                                className="bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors px-6 py-2.5 text-sm font-bold uppercase tracking-wide flex items-center gap-2"
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
