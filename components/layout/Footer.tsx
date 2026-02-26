import Link from 'next/link';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer
            className="w-full mt-auto py-10"
            style={{
                backgroundColor: 'var(--bg-dark)',
                borderTop: '1px solid rgba(245,242,238,0.08)',
            }}
        >
            <div className="max-w-container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Brand */}
                <div className="flex flex-col gap-1">
                    <span
                        className="text-xl"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-inverse)', opacity: 0.9 }}
                    >
                        PolyParlay
                    </span>
                    <span
                        className="font-mono text-[10px] tracking-widest uppercase"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        © {currentYear} All Rights Reserved
                    </span>
                </div>

                {/* Links — text-only with → arrows */}
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                    <a
                        href="https://x.com/xabzxbt"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium tracking-wide transition-colors group"
                        style={{ color: 'rgba(245,242,238,0.5)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-mocha)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,242,238,0.5)')}
                    >
                        Follow on X →
                    </a>
                    <a
                        href="https://x.com/xabzxbt"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium tracking-wide transition-colors"
                        style={{ color: 'rgba(245,242,238,0.5)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-mocha)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,242,238,0.5)')}
                    >
                        @xabzxbt →
                    </a>
                    <Link
                        href="/disclaimer"
                        className="text-sm font-medium tracking-wide transition-colors"
                        style={{ color: 'rgba(245,242,238,0.5)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-mocha)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,242,238,0.5)')}
                    >
                        Disclaimer →
                    </Link>
                </div>

            </div>
        </footer>
    );
}
