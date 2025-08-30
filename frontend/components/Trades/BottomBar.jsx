"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowUpDown, Plus, Bot, User } from "lucide-react";

export default function BottomBar() {
    const pathname = usePathname();

    const isActive = (path) => pathname === path;

    return (
        <nav className="boxBg popups_btm flexRow flexRow_stretch" style={{ width: '85%', backdropFilter: 'blur(30px)' }}>
            <Link href="/" className="nav-item">
                <div className={`icon-wrapper ${isActive("/") ? "active" : ""}`}>
                    <Home size={22} />
                </div>
            </Link>

            <Link href="/trade" className="nav-item">
                <div className={`icon-wrapper ${isActive("/trade") ? "active" : ""}`}>
                    <ArrowUpDown size={22} />
                </div>
            </Link>

            <Link href="/add-trade" className="nav-item">
                <div className={`icon-wrapper add-btn ${isActive("/add-trade") ? "active" : ""}`}>
                    <Plus size={24} />
                </div>
            </Link>

            <Link href="/tradeassistant" className="nav-item">
                <div className={`icon-wrapper ${isActive("/tradeassistant") ? "active" : ""}`}>
                    <Bot size={22} />
                </div>
            </Link>

            <Link href="/profile" className="nav-item">
                <div className={`icon-wrapper ${isActive("/profile") ? "active" : ""}`}>
                    <User size={22} />
                </div>
            </Link>
        </nav>
    );
}
