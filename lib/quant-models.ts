export interface QuantMetrics {
    monteCarlo: {
        p10: number; // Worst case (10th percentile)
        p50: number; // Median case
        p90: number; // Best case (90th percentile)
        winProb: number; // Simulated win probability
    };
    bayesian: {
        prior: number; // Market price
        likelihood: number; // Whale flow impact
        posterior: number; // Adjusted probability
        signalStrength: number; // How strong the whale signal is (0-1)
    };
    kelly: {
        fraction: number; // Optimal bet size %
        riskReward: number; // Ratio
    };
    edge: number; // Edge vs market (>0 is good)
    dailyVolatility: number; // Daily price standard deviation (NOT true options theta)
}

/**
 * Run 10k Monte Carlo simulations for price path
 * @param price Current market price (0-1)
 * @param volatility Daily volatility (standard deviation)
 * @param daysRemaining Days until expiration
 */
function runMonteCarlo(
    price: number,
    volatility: number = 0.05,
    daysRemaining: number = 7
): QuantMetrics['monteCarlo'] {
    const SIMULATIONS = 10000;
    const finals: number[] = [];
    let wins = 0;

    // Simple geometric brownian motion adapted for bounded [0,1]
    // In reality, binary markets act more like drift-diffusion with absorption at 0 and 1
    // We'll use a simplified random walk with mean reversion to current price (market efficiency hypothesis)
    // plus momentum from recent volatility.

    for (let i = 0; i < SIMULATIONS; i++) {
        let p = price;
        // Simulate each day
        for (let d = 0; d < daysRemaining; d++) {
            // Random shock: Normal distribution box-muller
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

            // Price update with volatility
            // Volatility scales with square root of time, but we iterate daily
            // We also dampen volatility near 0 and 1 (markets move slower at extremes)
            const dampener = 4 * p * (1 - p); // Parabolic dampener: 1 at 0.5, 0 at 0/1
            const delta = z * volatility * dampener;

            p += delta;

            // Bounds: Align with project-wide active market range (7% - 93%)
            if (p > 0.93) p = 0.93;
            if (p < 0.07) p = 0.07;
        }
        finals.push(p);
        if (Math.random() < p) wins++; // Final outcome realization
    }

    finals.sort((a, b) => a - b);

    return {
        p10: finals[Math.floor(SIMULATIONS * 0.1)],
        p50: finals[Math.floor(SIMULATIONS * 0.5)],
        p90: finals[Math.floor(SIMULATIONS * 0.9)],
        winProb: wins / SIMULATIONS
    };
}

/**
 * Bayesian update based on smart money flow
 * @param marketPrice Current market price (Prior)
 * @param whaleBuyVol Volume of whales buying YES
 * @param whaleSellVol Volume of whales buying NO (or selling YES)
 */
function calculateBayesian(
    marketPrice: number,
    whaleBuyVol: number,
    whaleSellVol: number
): QuantMetrics['bayesian'] {
    // If no whale data, posterior = prior
    const totalWhale = whaleBuyVol + whaleSellVol;
    if (totalWhale < 100) {
        return { prior: marketPrice, likelihood: 0.5, posterior: marketPrice, signalStrength: 0 };
    }

    // Likelihood P(WhaleBuy | Truth=Yes) vs P(WhaleBuy | Truth=No)
    // We assume whales are "smarter". If truth is YES, whales vote YES with higher prob.
    // Let's say Smart Money has a 65% accuracy rate (likelihood ratio).
    const smartAccuracy = 0.65;
    const dumbAccuracy = 1 - smartAccuracy;

    const whaleRatio = whaleBuyVol / totalWhale; // This is our observed evidence E

    // We treat the whale ratio as a proxy for the probability that the "Smart Signal" is YES.
    // Bayes Theorem for odds:
    // PosteriorOdds = LikelihoodRatio * PriorOdds

    // We derive a "Flow Force" from the deviation of whale flow from the market price.
    // If market is 50% but Whales are 80% YES, that's a strong signal.
    // If market is 80% and Whales are 80% YES, that's neutral (priced in).

    // Standard Bayes filter approach:
    // P(H|E) = P(E|H)P(H) / [P(E|H)P(H) + P(E|~H)P(~H)]

    // We define P(E|H) (Prob of observing this whale flow given YES is true):
    // We model this by saying if YES is true, we expect Whale Ratio to be skewed high.
    // A simple continuous update:

    // Adjusted approach: 
    // We calculated a "Smart Price" based purely on whale voting.
    // Then we mix it with the Market Price based on confidence (volume).

    const smartConfidence = Math.min(1, Math.log10(totalWhale) / 5); // 0 at $1, 1 at $100k+
    const impliedSmartPrice = whaleRatio; // Whales put money where mouth is

    // Posterior is weighted average of Market (Efficient Market) and Whale (Smart Money)
    // Market has more weight usually, but Whales provide the "Edge".
    const posterior = (marketPrice * (1 - 0.4 * smartConfidence)) + (impliedSmartPrice * (0.4 * smartConfidence));

    return {
        prior: marketPrice,
        likelihood: whaleRatio,
        posterior,
        signalStrength: smartConfidence
    };
}

/**
 * Kelly Criterion calculation
 * @param prob Estimated probability of winning (p)
 * @param payoutMultiplier Total payout multiplier (e.g. 2.5x for 0.4 odds). This is 1/price.
 */
function calculateKelly(prob: number, price: number): QuantMetrics['kelly'] {
    if (price <= 0 || price >= 1) return { fraction: 0, riskReward: 0 };

    // b = net odds (decimal odds - 1)
    // b = (1/price) - 1
    const b = (1 / price) - 1;
    const p = prob;
    const q = 1 - p;

    // f* = (bp - q) / b
    let f = (b * p - q) / b;

    // Half-Kelly is safer for volatile markets
    f = f * 0.5;

    return {
        fraction: Math.max(0, f),
        riskReward: b
    };
}

/**
 * Approximate Theta (Time Decay/Value) for binary option
 * @param price Current price
 * @param days Days to exp
 */
function calculateTheta(price: number, days: number): number {
    if (days <= 0) return 0;
    // Theta is high when price is near 50% and time is low (uncertainty collapsing)
    // Theta represents the "cost" of holding the option (price drift if volatility stays constant)
    // For binary:
    // If P > 0.5, Theta is usually negative (approaching 1, you want time to pass).
    // If P < 0.5, Theta is positive (approaching 0, you need variance).

    // Simplified metric for users: "Daily Volatility Cost"
    // Proportional to standard deviation over 1 day.
    const vol1Day = Math.sqrt(price * (1 - price)) / Math.sqrt(days);
    return vol1Day;
}

/**
 * Calculate daily volatility (standard deviation) independently from theta
 * This is used for Monte Carlo simulations
 * @param price Current price (0-1)
 * @param days Days until expiration
 */
function calculateDailyVolatility(price: number, days: number): number {
    if (days <= 0) return 0;
    // Volatility for binary options is highest near 50% and decreases near extremes
    // Using standard deviation formula: sqrt(p*(1-p)/days)
    // This gives us the expected daily price movement
    return Math.sqrt(price * (1 - price)) / Math.sqrt(days);
}

/**
 * Master function to get all quant metrics
 * @param price Current market price (0-1)
 * @param volumeYes Smart money volume on YES side
 * @param volumeNo Smart money volume on NO side
 * @param daysRemaining Days until market resolution
 * @param marketPrice Optional explicit market price for Kelly calculation (defaults to price param)
 */
export function getQuantMetrics(
    price: number,
    volumeYes: number,
    volumeNo: number,
    daysRemaining: number,
    marketPrice?: number
): QuantMetrics {
    // Handle expired markets
    if (daysRemaining <= 0) {
        return {
            monteCarlo: { p10: price, p50: price, p90: price, winProb: price },
            bayesian: { prior: price, likelihood: 0.5, posterior: price, signalStrength: 0 },
            kelly: { fraction: 0, riskReward: 0 },
            edge: 0,
            dailyVolatility: 0
        };
    }

    const bayes = calculateBayesian(price, volumeYes, volumeNo);

    // Calculate independent daily volatility for Monte Carlo
    // This is NOT true options theta - it's daily price standard deviation
    const dailyVolatility = calculateDailyVolatility(bayes.posterior, daysRemaining);

    // Use dynamic volatility for Monte Carlo. 
    // We floor it at 7% (0.07) to ensure we always show SOME range even for long-dated markets.
    // We cap it at 50% (0.50) to prevent the chart from looking like pure noise on short-dated ones.
    const simulatedVol = Math.max(0.07, Math.min(0.50, dailyVolatility));

    const monteCarlo = runMonteCarlo(bayes.posterior, simulatedVol, daysRemaining);
    
    // Kelly uses market price (not model posterior) for a fair comparison
    // This gives the "true" edge based on what the market offers vs estimated probability
    const kellyProb = marketPrice || price; // Use provided market price or fall back to price
    const kelly = calculateKelly(kellyProb, price);
    
    const edge = bayes.posterior - price;

    return {
        monteCarlo,
        bayesian: bayes,
        kelly,
        edge,
        dailyVolatility
    };
}
