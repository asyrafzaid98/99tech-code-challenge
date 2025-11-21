import React, { useEffect, useState } from "react";

/**
 * Build plausible filename variants and map them to raw github URLs.
 */

const MANUAL_ICON_MAP = {
    // add any problem tokens here (key must be uppercase)
    'YIELDUSD': 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/YieldUSD.svg',
    'AMPLUNA': 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/ampLUNA.svg',
    'STLUNA': 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/stLUNA.svg',
    'STOSMO': 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/stOSMO.svg',
    'AXLUSDC': 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/axlUSDC.svg',
    'STATOM': 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/stATOM.svg',
    'WSTETH': 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/wstETH.svg',
    // add more if you find others
};


function tokenGithubCandidates(symbol) {
    if (!symbol) return [];
    const key = symbol.toUpperCase();
    if (MANUAL_ICON_MAP[key]) {
        return [MANUAL_ICON_MAP[key]]; // single guaranteed correct URL
    }
    const s = symbol.trim();
    const set = new Set();
    set.add(s);
    set.add(s.toLowerCase());
    set.add(s.toUpperCase());

    const maxN = Math.min(4, s.length - 1);
    for (let n = 1; n <= maxN; n++) {
        const a = s.slice(0, n), b = s.slice(n);
        set.add(a.toLowerCase() + b);
        set.add(a.toLowerCase() + b.toUpperCase());
        set.add(a.toUpperCase() + b.toLowerCase());
        set.add(a.toUpperCase() + b);
    }

    // some extra forms
    for (let n = 1; n <= Math.min(3, s.length - 1); n++) {
        set.add(s.slice(0, n).toLowerCase() + s.slice(n).toUpperCase());
    }

    const RAW_BASE = "https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens";
    return Array.from(set).map(name => `${RAW_BASE}/${encodeURIComponent(name)}.svg`);
}

/** simple in-memory cache (symbolUpper -> url|null) */
const resolvedCache = {};

/** sanitize raw svg text (remove bare `crossorigin` tokens and empty attrs) */
function sanitizeSvgText(str) {
    if (!str) return str;
    return str.replace(/\s+crossorigin\b/g, "").replace(/crossorigin=(["'])\s*\1/g, "");
}

/** convert svg text -> blob URL (object URL) */
function svgTextToBlobUrl(svgText) {
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    return URL.createObjectURL(blob);
}

/**
 * TokenImage component:
 * - tries candidate raw github urls by letting <img> attempt them (onError attempts next)
 * - on repeated failure it will fetch the SVG text, sanitize it and serve a blob URL
 * - caches successful url per symbol
 */
export default function TokenImage({ symbol, className = 'token-icon', wrapperClass = 'token-icon-wrapper', alt }) {
    const [candidates, setCandidates] = useState([]);
    const [index, setIndex] = useState(0);
    const [resolved, setResolved] = useState(null);
    const [sanitizedBlob, setSanitizedBlob] = useState(null);

    useEffect(() => {
        if (!symbol) {
            setCandidates([]);
            setIndex(0);
            setResolved(null);
            setSanitizedBlob(null);
            return;
        }

        const key = symbol.toUpperCase();

        // if we cached a URL (even null), use it
        if (Object.prototype.hasOwnProperty.call(resolvedCache, key)) {
            const v = resolvedCache[key];
            if (v) setResolved(v);
            else { setCandidates([]); setIndex(0); }
            return;
        }

        const c = tokenGithubCandidates(symbol);
        setCandidates(c);
        setIndex(0);
        setResolved(null);
        setSanitizedBlob(null);
        // expose candidates for quick debugging in console
        // console.debug('TokenImage candidates for', symbol, c);
    }, [symbol]);

    useEffect(() => {
        // cache resolved url
        if (resolved && symbol) {
            resolvedCache[symbol.toUpperCase()] = resolved;
        }
        // store sanitized blob as resolved also
        if (sanitizedBlob && symbol) {
            resolvedCache[symbol.toUpperCase()] = sanitizedBlob;
        }
    }, [resolved, sanitizedBlob, symbol]);

    // If already resolved via cache, render it
    if (symbol && resolvedCache[symbol.toUpperCase()]) {
        const url = resolvedCache[symbol.toUpperCase()];
        return (
            <div className={wrapperClass}>
                <img
                    src={url}
                    alt={alt ?? symbol}
                    className={className}
                    onError={(e) => {
                        console.warn('Cached icon failed to load, clearing cache for', symbol);
                        delete resolvedCache[symbol.toUpperCase()];
                        // force re-evaluation
                        setResolved(null);
                        const c = tokenGithubCandidates(symbol);
                        setCandidates(c);
                        setIndex(0);
                    }}
                />
            </div>
        );
    }

    // fallback inline small svg if no candidates
    if (!candidates || candidates.length === 0) {
        return (
            <div className={wrapperClass}>
                <div className={className} dangerouslySetInnerHTML={{
                    __html: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'><rect width='100%' height='100%' rx='6' fill='%23222'/><text x='50%' y='50%' fill='%23fff' font-size='10' text-anchor='middle' dominant-baseline='central'>${(symbol || '?').slice(0, 3).toUpperCase()}</text></svg>`
                }} />
            </div>
        );
    }

    const src = candidates[index];

    // when image fails, we try to fetch the SVG text and sanitize it before giving up
    async function attemptSanitizeAndUse(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                // remote 404/other -> nothing to sanitize
                return false;
            }
            const txt = await res.text();
            // quick check for bad tokens
            if (txt.includes('crossorigin') || txt.includes('<!DOCTYPE') || txt.includes('<html')) {
                const fixed = sanitizeSvgText(txt);
                const blobUrl = svgTextToBlobUrl(fixed);
                setSanitizedBlob(blobUrl);
                // cache will be set in effect above
                return true;
            } else {
                // if it looks fine but browser still failed to render via <img>, still try blob as it sometimes helps
                const blobUrl = svgTextToBlobUrl(txt);
                setSanitizedBlob(blobUrl);
                return true;
            }
        } catch (err) {
            // fetch failed (CORS maybe) - treat as failure
            return false;
        }
    }

    return (
        <div className={wrapperClass}>
            <img
                src={src}
                alt={alt ?? symbol}
                className={className}
                onError={async () => {
                    console.warn('TokenImage: load error for', symbol, 'tried', src);
                    // try next candidate if any
                    const next = index + 1;
                    if (next < candidates.length) {
                        setIndex(next);
                        return;
                    }
                    // all candidates tried — attempt to fetch & sanitize the last candidate
                    const ok = await attemptSanitizeAndUse(src);
                    if (!ok) {
                        // nothing worked: cache null to avoid repeated attempts and force fallback render
                        resolvedCache[symbol.toUpperCase()] = null;
                        // cause fallback render
                        setCandidates([]);
                        setIndex(0);
                    }
                }}
                onLoad={() => {
                    // when <img> successfully loads, cache it
                    resolvedCache[symbol.toUpperCase()] = src;
                    setResolved(src);
                }}
            />
        </div>
    );
}
