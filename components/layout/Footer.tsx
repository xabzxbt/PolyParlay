import Link from 'next/link';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full bg-surface-1 border-t border-border-default py-8 mt-auto">
            <div className="max-w-container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold tracking-widest text-text-secondary uppercase">

                {/* Left Side */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                    <a href="https://x.com/xabzxbt" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors flex items-center gap-1">
                        Follow on X <span className="text-primary">↗</span>
                    </a>
                    <span className="opacity-50">© {currentYear} All Rights Reserved</span>
                </div>

                {/* Right Side */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-right">
                    <a href="https://x.com/xabzxbt" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors flex items-center gap-1">
                        @xabzxbt <span className="text-primary">↗</span>
                    </a>
                    <Link href="/disclaimer" className="hover:text-text-primary transition-colors flex items-center gap-1">
                        Disclaimer <span className="text-primary">↗</span>
                    </Link>
                </div>

            </div>
        </footer>
    );
}
