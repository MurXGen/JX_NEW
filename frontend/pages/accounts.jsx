'use client';

import { useEffect, useState } from 'react';
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import axios from 'axios';
import { ArrowDown, Loader2, LucideLassoSelect } from 'lucide-react';
import { getFromIndexedDB } from '@/utils/indexedDB';
import { motion } from 'framer-motion';
import { containerVariants, childVariants } from '@/animations/motionVariants';
import { saveToIndexedDB } from '@/utils/indexedDB';


function Accounts() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [accountSymbols, setAccountSymbols] = useState({});

  useEffect(() => {
    const verified = Cookies.get("isVerified");

    if (verified !== "yes") {
      // 🚨 User not verified → redirect to login
      router.push("/login");
      return;
    }

    // ✅ Proceed with loading accounts if verified
    setLoading(true);

    // You can put your IndexedDB fetching logic here
    // e.g. getFromIndexedDB("user-data").then(...)

    setLoading(false);
  }, [router]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        // 1️⃣ Check IndexedDB first
        const cachedUser = await getFromIndexedDB('user-data');

        // 🔍 Log everything that comes from IndexedDB
        console.log("🗂 Full cachedUser from IndexedDB:", cachedUser);

        if (cachedUser?.accounts?.length > 0) {
          console.log(`📦 Loaded accounts from IndexedDB — Total accounts: ${cachedUser.accounts.length}`);
          setAccounts(cachedUser.accounts);
          buildSymbolMap(cachedUser.accounts);
        } else {
          console.warn("⚠ No accounts found in IndexedDB — fetching from API...");
        }

      } catch (err) {
        console.error('❌ Error fetching accounts:', err);
      }
    };

    const buildSymbolMap = (accountsData) => {
      const symbolMap = {};
      accountsData.forEach((acc) => {
        switch (acc.currency?.toUpperCase()) {
          case 'USD':
            symbolMap[acc.name] = '$';
            break;
          case 'INR':
            symbolMap[acc.name] = '₹';
            break;
          case 'USDT':
            symbolMap[acc.name] = '₮';
            break;
          default:
            symbolMap[acc.name] = '¤';
        }
      });
      setAccountSymbols(symbolMap);
    };

    fetchAccounts();
  }, []);


  const handleAccountClick = (accountId) => {
    try {
      // 1️⃣ Save account ID in cookies with long expiry (~10 years)
      Cookies.set("accountId", accountId, {
        path: "/",
        sameSite: "Strict",
        expires: 3650 // ~10 years
      });

      console.log("✅ Account ID saved to cookies:", accountId);

      // 2️⃣ Redirect to home page
      router.push("/");
    } catch (err) {
      console.error("❌ Failed to set accountId cookie:", err);
    }
  };



  const handleClick = async () => {
    setLoading(true);
    router.push('/create-account');
  };

  if (loading) return <p>Loading accounts...</p>;

  return (
    <div className="dashboard">

      <div className="actions">
        <button onClick={handleClick} disabled={loading} className="btn">
          {loading ? (
            <Loader2 className="loadingSpinner" />
          ) : (
            '+ Create Account'
          )}
        </button>
      </div>

      <div className="title">
        <LucideLassoSelect className="vectorColor" size={20} />
        <span>Your Accounts</span>
      </div>

      <motion.div
        className="accountsList"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {accounts.length === 0 ? (
          <motion.div className="noAccountsMessage" variants={childVariants}>
            <span>No account found. You can create one.</span>
          </motion.div>
        ) : (
          accounts.map((acc) => (
            <motion.div
              key={acc._id}
              className="accountCard"
              variants={childVariants}
              onClick={() => handleAccountClick(acc._id)}
            >
              <div className="accountName">
                <span>{acc.name}</span>
              </div>
              <div className="accountBalance">
                <span>
                  Starting Balance{' '}
                  <span className='accountAmounts'>
                    {accountSymbols[acc.name]}
                    {acc.startingBalance.amount}
                  </span>
                </span>

              </div>
              <div className="accountMetrics">
                <span>Trades: {acc.totalTrades}</span>
                <span>{acc.currency}</span>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {accounts.length > 3 && ( // Only show if there are enough accounts to scroll
        <motion.button
          className="scrollToBottomButton"
          onClick={() => {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: 'smooth'
            });
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowDown size={20} />
        </motion.button>
      )}
    </div>
  );

}

export default Accounts;
