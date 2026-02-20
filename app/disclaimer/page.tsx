import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

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
                        Please read this disclaimer carefully before using the PolyParlay interface or any related tools.
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
                            The content, tools, analytics, and data provided on PolyParlay are for <strong>informational and educational purposes only</strong>.
                            Nothing on this website constitutes financial, investment, legal, or tax advice. You should not rely on this information as a substitute for professional advice.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2">High Risk Warning</h3>
                        <p>
                            Trading on prediction markets involves a <strong>high level of risk</strong> and may not be suitable for all investors.
                            You could lose some or all of your initial investment. Do not trade with capital you cannot afford to lose.
                            Prediction markets are volatile and outcomes are uncertain.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2">Execution Risk (Parlays)</h3>
                        <p>
                            PolyParlay executes &quot;Parlays&quot; as <strong>batched individual transactions</strong>. There is a risk of partial execution if market conditions change rapidly (e.g., liquidity dries up) between the first and last leg of your trade.
                            <br /><br />
                            This means you could be left with positions in only some of your selected markets. You are responsible for monitoring your positions after execution.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2">Experimental Metrics</h3>
                        <p>
                            Our advanced analytics (including <strong>Wash Trading Index</strong>, <strong>HHI Score</strong>, and <strong>Smart Money PnL</strong>) are derived from on-chain heuristics and probabilistic models.
                            <br /><br />
                            These metrics are <strong>estimates</strong> based on available data and may not capture all market nuances (e.g., OTC trades, private minting). The &quot;Trust Score&quot; is an automated signal and not a guarantee of a market&apos;s integrity.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2">No Guarantees</h3>
                        <p>
                            While we strive to provide accurate real-time data and analytics (such as &quot;Smart Money&quot; tracking and Bayesian probabilities),
                            we make <strong>no representations or warranties</strong> regarding the accuracy, completeness, or reliability of any data.
                            Past performance of any trader, signal, or strategy is not indicative of future results.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-text-primary mb-2">Third-Party Platform</h3>
                        <p>
                            PolyParlay is an independent interface for the Polymarket protocol. We do not have custody of your funds, nor do we control the underlying smart contracts or market resolution mechanisms.
                            All trades are executed directly on the Polygon blockchain via Polymarket&apos;s infrastructure.
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
