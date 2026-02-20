import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PARLAYS_FILE = path.join(DATA_DIR, "parlays.json");

interface DbParlay {
    id: string;
    userAddress: string;
    createdAt: string;
    stake: number;
    combinedOdds: number;
    potentialPayout: number;
    status: "active" | "won" | "lost" | "partial";
    legs: {
        marketId: string;
        question: string;
        side: "YES" | "NO";
        price: number;
        tokenId: string;
        status: "pending" | "won" | "lost";
        outcome: string;
    }[];
    txHash?: string;
    resolvedAt?: string;
}

function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function readParlays(): DbParlay[] {
    if (!fs.existsSync(PARLAYS_FILE)) return [];
    try {
        const data = fs.readFileSync(PARLAYS_FILE, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function writeParlays(parlays: DbParlay[]) {
    try {
        fs.writeFileSync(PARLAYS_FILE, JSON.stringify(parlays, null, 2));
    } catch (e) {
    }
}

export function saveParlay(parlay: DbParlay) {
    ensureDir();
    const parlays = readParlays();
    parlays.push(parlay);
    writeParlays(parlays);
}

export function getUserParlays(address: string): DbParlay[] {
    const parlays = readParlays();
    return parlays
        .filter((p) => p.userAddress.toLowerCase() === address.toLowerCase())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getActiveParlays(): DbParlay[] {
    const parlays = readParlays();
    return parlays
        .filter((p) => p.status === "active")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateParlay(parlayId: string, updates: Partial<DbParlay>) {
    const parlays = readParlays();
    const index = parlays.findIndex((p) => p.id === parlayId);
    if (index !== -1) {
        parlays[index] = { ...parlays[index], ...updates };
        writeParlays(parlays);
        return parlays[index];
    }
    return null;
}

export function updateParlayLegStatus(parlayId: string, marketId: string, status: "won" | "lost") {
    const parlays = readParlays();
    const index = parlays.findIndex((p) => p.id === parlayId);
    if (index !== -1) {
        const legIndex = parlays[index].legs.findIndex((l) => l.marketId === marketId);
        if (legIndex !== -1) {
            parlays[index].legs[legIndex].status = status;
            writeParlays(parlays);
            return parlays[index];
        }
    }
    return null;
}
