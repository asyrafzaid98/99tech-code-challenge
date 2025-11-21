import React, { useState } from 'react';
import { Wallet, Menu, X } from 'lucide-react';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [walletAddress, setWalletAddress] = useState(null);

    const connectWallet = () => {
        // Simulate wallet connection
        const mockAddress = "0x71C...9A23";
        setWalletAddress(mockAddress);
    };

    return (
        <header className="header">
            <div className="logo">
                <div className="logo-icon">⚡</div>
                <span>SwitchSwap</span>
            </div>

            <nav className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                <a href="#" className="active">Swap</a>
                <a href="#">Tokens</a>
                <a href="#">Pools</a>
                <a href="#">More</a>
            </nav>

            <div className="header-actions">
                <button className="connect-btn" onClick={connectWallet}>
                    <Wallet size={18} />
                    {walletAddress ? walletAddress : "Connect Wallet"}
                </button>
                <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>
        </header>
    );
};

export default Header;
