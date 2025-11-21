import React, { useEffect, useState } from "react";
import tokenIcons from './assets/tokenIcons';
import './App.css';
import TokenImage from './TokenImage';
import Header from './assets/Header.jsx';

const PRICES_URL = "https://interview.switcheo.com/prices.json";




export default function App() {

  const [prices, setPrices] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [fromToken, setFromToken] = useState({ symbol: "ETH", name: "Ethereum" });
  const [toToken, setToToken] = useState({ symbol: "USDT", name: "Tether" });
  const [showModal, setShowModal] = useState(false);
  const [modalFor, setModalFor] = useState("from");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [formError, setFormError] = useState(""); // used for inline small error under input
  const [rotation, setRotation] = useState(0);

  // success UI
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // error UI
  const [showError, setShowError] = useState(false);
  const [errorData, setErrorData] = useState(null);

  useEffect(() => {
    fetch(PRICES_URL)
      .then((r) => r.json())
      .then((data) => {
        // Accept array or object response. Normalize to lookup: { SYMBOL: { usd: price } }
        if (Array.isArray(data)) {
          const lookup = {};
          data.forEach((item) => {
            if (!item) return;
            const sym = (item.currency || item.symbol || "").toUpperCase();
            const price = item.price ?? item.usd ?? null;
            if (sym) lookup[sym] = { usd: price, raw: item };
          });
          setPrices(lookup);
          const list = Object.keys(lookup).map((k) => ({ symbol: k, price: lookup[k].usd }));
          setTokens(list);
        } else if (data && typeof data === "object") {
          // object keyed by symbol
          const lookup = {};
          Object.keys(data).forEach((k) => {
            const val = data[k];
            const price = val && (val.usd ?? val) ? (val.usd ?? val) : null;
            lookup[k.toUpperCase()] = { usd: price, raw: val };
          });
          setPrices(lookup);
          const list = Object.keys(lookup).map((k) => ({ symbol: k, price: lookup[k].usd }));
          setTokens(list);
        } else {
          throw new Error("Unrecognized price format");
        }
      })
      .catch((err) => {
        console.warn("Could not fetch prices.json — fallback", err);
        const fallback = [
          { symbol: "USDT", price: 1 },
          { symbol: "ETH", price: 1900 },
          { symbol: "BTC", price: 30000 },
        ];
        const lookup = {};
        fallback.forEach((t) => (lookup[t.symbol] = { usd: t.price }));
        setPrices(lookup);
        setTokens(fallback);
      });
  }, []);

  // useEffect(() => {
  //   if (amount === "" || Number(amount) <= 0) setFormError("Please enter an amount greater than 0.");
  //   else setFormError("");
  // }, [amount]);

  function openTokenModal(which) {
    setModalFor(which);
    setSearch("");
    setShowModal(true);
  }

  function chooseToken(token) {
    if (modalFor === "from") setFromToken(token);
    else setToToken(token);
    setShowModal(false);
    // clear error displays when user reselects tokens
    setShowError(false);
    setErrorData(null);
  }

  function swapTokens() {
    setRotation(prev => prev + 180);
    const prevFrom = fromToken;
    const prevTo = toToken;
    setFromToken(prevTo);
    setToToken(prevFrom);
    // clear errors on manual swap
    setShowError(false);
    setErrorData(null);
  }

  // helper to format numeric string (keeps simple decimal precision)
  function formatNumber(n, digits = 6) {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return "";
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits, useGrouping: false });
  }

  // small helper to make a pseudo tx id
  function makeTxId() {
    return `tx_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
  }

  // Show an error in the error box (message can be string, detail optional)
  function showErrorBox(message, detail = null) {
    setErrorData({ message, detail });
    setShowError(true);
  }


  function closeErrorBox() {
    setShowError(false);
    setErrorData(null);
  }

  // Confirm Swap handler: validates, computes estimated receive, performs the token swap and sets amount,
  // then shows a success box with details. On validation/runtime errors it shows the error box.
  function handleConfirmSwap() {
    // basic validation
    if (amount === "" || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      showErrorBox("Invalid amount", "Please enter a valid amount greater than 0 before swapping.");
      return;
    }

    // Prevent swapping identical tokens
    if (!fromToken?.symbol || !toToken?.symbol) {
      showErrorBox("Missing token", "Please select both tokens before swapping.");
      return;
    }
    if (fromToken.symbol === toToken.symbol) {
      showErrorBox("Same token selected", "Select two different tokens to swap.");
      return;
    }

    // compute estimated receive
    try {
      const fromPrice = (prices && prices[fromToken.symbol] && prices[fromToken.symbol].usd) || 1;
      const toPrice = (prices && prices[toToken.symbol] && prices[toToken.symbol].usd) || 1;
      const usd = Number(amount) * Number(fromPrice);
      const raw = usd / Number(toPrice || 1);
      const afterFee = raw * (1 - 0.003);
      const received = Number(afterFee);

      // perform swap
      const prevFrom = fromToken;
      const prevTo = toToken;
      setFromToken(prevTo);
      setToToken(prevFrom);

      // set amount to what the user would now send in the new direction
      setAmount(received > 0 ? formatNumber(received, 6) : "");

      // rotate button visually
      setRotation(prev => prev + 180);

      // create success data and show box
      const txId = makeTxId();
      const timestamp = new Date().toISOString();
      const sdata = {
        txId,
        timestamp,
        from: { amount: Number(amount), symbol: prevFrom.symbol },
        to: { amount: Number(received), symbol: prevTo.symbol },
      };
      setSuccessData(sdata);
      setShowSuccess(true);
      // clear any error box
      setShowError(false);
      setErrorData(null);
    } catch (err) {
      // show unexpected runtime error
      console.error("Swap failed", err);
      showErrorBox("Swap failed", err?.message || String(err));
    }
  }

  function closeSuccess() {
    setShowSuccess(false);
    setSuccessData(null);
  }

  async function copyTxId() {
    if (!successData?.txId) return;
    try {
      await navigator.clipboard.writeText(successData.txId);
      alert("TX id copied to clipboard");
    } catch (e) {
      console.warn("Clipboard copy failed", e);
      alert("Copy failed — please copy manually: " + successData.txId);
    }
  }

  function estimatedReceive() {
    if (!prices || !amount || Number(amount) <= 0) return "0.00";
    const fromPrice = (prices[fromToken.symbol] && prices[fromToken.symbol].usd) || 1;
    const toPrice = (prices[toToken.symbol] && prices[toToken.symbol].usd) || 1;
    const usd = Number(amount) * Number(fromPrice);
    const raw = usd / Number(toPrice || 1);
    const afterFee = raw * (1 - 0.003);
    return Number(afterFee).toFixed(6);
  }

  const filtered = tokens.filter((t) => t.symbol && t.symbol.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-wrap">

      <Header />
      <div className="card">
        <div className="header-title">Currency Swap</div>
        <div className="sub">Explore Multiple Currency Swap Here!</div>

        <div className="small">Amount to send</div>
        <div className="amount-box">
          <input
            className="amount-input"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          <button className="token-btn" onClick={() => openTokenModal("from")}>
            <TokenImage key={`from-${fromToken.symbol}`} symbol={fromToken.symbol} />
            <div style={{ fontSize: 12, fontWeight: 700 }}>{fromToken.symbol}</div>
          </button>
        </div>

        <div
          className="swap-btn"
          onClick={swapTokens}
          title="Swap"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M7 10l5-5 5 5" stroke="#9aa3b2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 14l-5 5-5-5" stroke="#9aa3b2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="small">Amount to receive</div>
        <div className="amount-box">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{estimatedReceive()}</div>
          </div>
          <button className="token-btn" onClick={() => openTokenModal("to")}>
            <TokenImage key={`to-${toToken.symbol}`} symbol={toToken.symbol} />
            <div style={{ fontSize: 12, fontWeight: 700 }}>{toToken.symbol}</div>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8 }}>
          <div className="small">Estimated fee: 0.00</div>
          <div className="small">Slippage: <input style={{ width: 54, marginLeft: 6, background: 'transparent', border: 'none', color: 'inherit' }} value={slippage} onChange={(e) => setSlippage(e.target.value)} /> %</div>
        </div>

        {/* small inline form error */}
        {formError && <div className="error" style={{ marginTop: 10 }}>{formError}</div>}

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button className="confirm-btn" disabled={!!formError} onClick={handleConfirmSwap}>Confirm Swap</button>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Select a Token</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <input className="search" placeholder="Search token name or symbol" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="token-list">
              {filtered.length === 0 && <div className="small">No tokens</div>}
              {filtered.map((t) => {
                return (
                  <div key={t.symbol} className="token-row" onClick={() => chooseToken({ symbol: t.symbol, name: t.symbol })}>
                    <TokenImage key={`list-${t.symbol}`} symbol={t.symbol} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="token-name">{t.symbol}</div>
                      <div className="token-sub">{t.price ? `≈ $${Number(t.price).toLocaleString(undefined, { maximumFractionDigits: 6 })}` : ''}</div>
                    </div>
                    {(modalFor === 'from' ? fromToken.symbol === t.symbol : toToken.symbol === t.symbol) && <div className="selected-tag">SELECTED</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Success box */}
      {showSuccess && successData && (
        <div className="success-box" role="status" aria-live="polite">
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1f6f3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#bff5c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>

          <div className="success-left">
            <div className="success-title">Swap successful</div>

            <div className="success-row">
              <div style={{ flex: 1 }}>
                <div className="success-amount">{successData.from.amount} {successData.from.symbol}</div>
                <div className="success-meta">You swapped</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div className="success-amount">{successData.to.amount.toFixed(6)} {successData.to.symbol}</div>
                <div className="success-meta">You received (approx.)</div>
              </div>
            </div>

            <div style={{ marginTop: 6 }}>
              <div className="success-meta">Transaction id:</div>
              <div className="success-tx">{successData.txId}</div>
              <div className="success-meta" style={{ marginTop: 6 }}>Time: {new Date(successData.timestamp).toLocaleString()}</div>
            </div>

            <div className="success-actions">
              <button className="success-btn success-copy" onClick={copyTxId}>Copy TX id</button>
              <button className="success-btn success-close" onClick={closeSuccess}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Error box */}
      {showError && errorData && (
        <div className="error-box" role="alert" aria-live="assertive">
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#5f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 8v4" stroke="#ffdada" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 16h.01" stroke="#ffdada" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>

          <div className="error-left">
            <div className="error-title">An error occurred</div>

            <div className="error-row">
              <div style={{ flex: 1 }}>
                <div className="error-meta">{errorData.message}</div>
              </div>
            </div>

            {errorData.detail && (
              <div style={{ marginTop: 6 }}>
                <div className="error-meta">Details:</div>
                <div className="error-detail">{String(errorData.detail)}</div>
              </div>
            )}

            <div className="error-actions">
              <button className="error-btn error-close" onClick={closeErrorBox}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
