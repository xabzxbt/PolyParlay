import React from 'react';
import { AlertTriangle, Info, Shield, Globe, Zap, Scale } from 'lucide-react';

export default function DisclaimerPage() {
    return (
        <div className="max-w-container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <div className="space-y-4 text-center border-b border-border-default pb-8">
                    <div className="w-16 h-16 bg-surface-2 rounded-pill flex items-center justify-center mx-auto mb-4 border border-border-default text-warning">
                        <AlertTriangle size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-text-primary uppercase tracking-tight">Disclaimer</h1>
                    <p className="text-text-secondary max-w-lg mx-auto">
                        Please read this disclaimer carefully before using the PolyParlay interface, analytics tools, or any related services.
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-card border border-border-default p-8 shadow-sm space-y-6 text-sm text-text-secondary leading-relaxed">

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                            <Info size={16} className="text-primary" />
                            Not Financial Advice
                        </h3>
                        <p>
                            The content, tools, analytics, and data provided on PolyParlay — including but not limited to the Fear &amp; Greed Index, Edge Score, Whale Activity Feed, Smart Money tracking, Trading Profile, and Parlay Builder — are for <strong>informational and educational purposes only</strong>.
                            Nothing on this website constitutes financial, investment, legal, or tax advice. You should not rely on this information as a substitute for, nor does it replace, professional financial advice.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-error" />
                            High Risk Warning
                        </h3>
                        <p>
                            Trading on prediction markets involves a <strong>high level of risk</strong> and may not be suitable for all investors.
                            You could lose some or all of your initial investment. Do not trade with capital you cannot afford to lose.
                            Prediction market outcomes are inherently uncertain and prices can change rapidly based on real-world events.
                            <br /><br />
                            Parlay (combo) bets carry <strong>compounded risk</strong> — the probability of winning decreases with each added leg. A 5-leg parlay at 50% odds each has only a ~3.1% chance of all legs winning.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                            <Zap size={16} className="text-warning" />
                            Execution Risk (Parlays)
                        </h3>
                        <p>
                            PolyParlay executes parlays as <strong>batched individual limit orders</strong> on the Polymarket CLOB (Central Limit Order Book). There are inherent risks:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Partial execution:</strong> If market conditions change rapidly between legs, some orders may fail while others succeed, leaving you with positions in only some of your selected markets.</li>
                            <li><strong>Slippage:</strong> Large orders relative to available liquidity may execute at prices different from the displayed price.</li>
                            <li><strong>Order rejection:</strong> The CLOB may reject orders due to insufficient balance, expired sessions, or tick size violations.</li>
                        </ul>
                        <p className="mt-2">
                            You are responsible for monitoring your positions after execution. Failed legs are reported in the order status.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                            <Scale size={16} className="text-primary" />
                            Experimental Metrics &amp; Analytics
                        </h3>
                        <p>
                            Our analytics suite — including <strong>Fear &amp; Greed Index</strong>, <strong>Edge Score</strong>, <strong>Whale Activity Feed</strong>, <strong>Smart Money PnL</strong>, <strong>Wash Trading Index</strong>, and <strong>HHI Score</strong> — are derived from on-chain heuristics, probabilistic models, and public API data.
                        </p>
                        <p className="mt-2">
                            These metrics are <strong>estimates</strong> and may not capture all market nuances, including:
                        </p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>OTC (over-the-counter) trades not visible on-chain</li>
                            <li>Private minting and token splits</li>
                            <li>Multi-wallet strategies by single entities</li>
                            <li>Market maker activity that mimics whale behavior</li>
                        </ul>
                        <p className="mt-2">
                            The Edge Score and Fear &amp; Greed Index are <strong>automated signals</strong>, not guarantees of market direction.
                            Past performance of any trader, signal, or strategy is not indicative of future results.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                            <Shield size={16} className="text-success" />
                            Non-Custodial &amp; Third-Party Platform
                        </h3>
                        <p>
                            PolyParlay is an <strong>independent, non-custodial interface</strong> for the Polymarket protocol. Key points:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>We <strong>never</strong> have custody of your funds at any point.</li>
                            <li>All trades are signed by your wallet and executed directly on the Polygon blockchain via Polymarket&apos;s smart contracts.</li>
                            <li>API credentials (L2 keys) are stored <strong>only in your browser&apos;s localStorage</strong> and never transmitted to our servers.</li>
                            <li>We do not control the underlying smart contracts, market resolution mechanisms, or the UMA Oracle.</li>
                            <li>We are not affiliated with, endorsed by, or formally partnered with Polymarket Inc.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                            <Globe size={16} className="text-primary" />
                            Cross-Chain Deposits &amp; Bridge
                        </h3>
                        <p>
                            The cross-chain deposit feature uses Polymarket&apos;s official Bridge API to generate temporary deposit addresses for multiple chains (Ethereum, Base, Arbitrum, Solana, Bitcoin, etc.).
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Deposit addresses are generated by the Polymarket Bridge infrastructure, not by PolyParlay.</li>
                            <li>There are <strong>minimum deposit amounts</strong> per chain (typically $2-$9). Deposits below the minimum may be lost.</li>
                            <li>Bridge transactions involve third-party services and may take varying amounts of time to process.</li>
                            <li>PolyParlay is not responsible for failed, delayed, or lost bridge transactions.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                            <Shield size={16} className="text-primary" />
                            Proxy Wallet &amp; Redemption
                        </h3>
                        <p>
                            If you trade via a Polymarket Proxy Wallet (Gnosis Safe), your positions and funds reside in the proxy wallet — not in your connected EOA wallet.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Redemption of winning positions for proxy wallet users may require using <a href="https://polymarket.com/portfolio" target="_blank" rel="noreferrer" className="text-primary hover:underline">polymarket.com/portfolio</a> or awaiting automatic redemption.</li>
                            <li>Direct on-chain redemption from an EOA is only possible for positions held directly in the EOA.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2">Smart Contract Risk</h3>
                        <p>
                            PolyParlay interacts with several audited smart contracts on the Polygon network, including:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 font-mono text-xs">
                            <li>CTF Exchange: 0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E</li>
                            <li>Neg Risk CTF Exchange: 0xC5d563A36AE78145C45a50134d48A1215220f80a</li>
                            <li>Conditional Tokens (CTF): 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045</li>
                            <li>USDC.e: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174</li>
                        </ul>
                        <p className="mt-2">
                            While these contracts have been audited, <strong>no smart contract is guaranteed to be free of bugs or vulnerabilities</strong>.
                            Interacting with any smart contract carries inherent risk.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2">Regulatory Notice</h3>
                        <p>
                            Prediction markets may be restricted or prohibited in certain jurisdictions. It is your sole responsibility to understand and comply with the laws and regulations in your jurisdiction before using PolyParlay or Polymarket.
                            PolyParlay does not perform any geographic restrictions or KYC verification.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2">No Guarantees</h3>
                        <p>
                            While we strive to provide accurate real-time data, analytics, and reliable trade execution,
                            we make <strong>no representations or warranties</strong> regarding the accuracy, completeness, or reliability of any data, analytics, or services.
                            The platform is provided &quot;as is&quot; without warranty of any kind, express or implied.
                        </p>
                    </section>

                    <div className="pt-6 border-t border-border-default mt-8 text-xs text-text-disabled text-center">
                        Last updated: February 2026
                    </div>
                </div>

            </div>
        </div>
    );
}
