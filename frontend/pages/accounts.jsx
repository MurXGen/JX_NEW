'use client';

import { useEffect, useState } from 'react';
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import axios from 'axios';
import { ArrowDown, ArrowRight, Loader2, LucideLassoSelect, Plus } from 'lucide-react';
import { getFromIndexedDB } from '@/utils/indexedDB';
import { motion } from 'framer-motion';
import { containerVariants, childVariants } from '@/animations/motionVariants';
import { saveToIndexedDB } from '@/utils/indexedDB';
import Navbar from '@/components/Trades/Navbar';
import BackgroundBlur from '@/components/ui/BackgroundBlur';
import { formatCurrency } from '@/utils/formatNumbers';
import FullPageLoader from '@/components/ui/FullPageLoader';


function Accounts() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [accountSymbols, setAccountSymbols] = useState({});
  const [currentBalances, setCurrentBalances] = useState({});
  const [tradesCount, setTradesCount] = useState({});


  useEffect(() => {
    const verified = Cookies.get("isVerified");

    if (verified !== "yes") {
      router.push("/login");
      return;
    }

    // Only stop loading after fetching is done
    const fetchAccountsAndTrades = async () => {
      try {
        const cachedUser = await getFromIndexedDB("user-data");
        console.log("🗂 Full cachedUser from IndexedDB:", cachedUser);

        if (cachedUser?.accounts?.length > 0) {
          setAccounts(cachedUser.accounts);
          buildSymbolMap(cachedUser.accounts);

          if (cachedUser.trades?.length > 0) {
            const balanceMap = {};
            const countMap = {};

            cachedUser.accounts.forEach((acc) => {
              const starting = acc.startingBalance.amount || 0;
              const tradesForAcc = cachedUser.trades.filter(
                (t) => t.accountId === acc._id
              );
              const pnlSum = tradesForAcc.reduce(
                (sum, t) => sum + (Number(t.pnl) || 0),
                0
              );

              balanceMap[acc.name] = starting + pnlSum;
              countMap[acc.name] = tradesForAcc.length;
            });

            setCurrentBalances(balanceMap);
            setTradesCount(countMap);
          } else {
            const emptyCountMap = {};
            cachedUser.accounts.forEach((acc) => {
              emptyCountMap[acc.name] = 0;
            });
            setTradesCount(emptyCountMap);
          }
        } else {
          console.warn("⚠ No accounts found in IndexedDB — fetching from API...");
        }
      } catch (err) {
        console.error("❌ Error fetching accounts/trades:", err);
      } finally {
        setLoading(false); // ✅ stop loader here
      }
    };

    const buildSymbolMap = (accountsData) => {
      const symbolMap = {};
      accountsData.forEach((acc) => {
        switch (acc.currency?.toUpperCase()) {
          case "USD":
            symbolMap[acc.name] = "$";
            break;
          case "INR":
            symbolMap[acc.name] = "₹";
            break;
          case "USDT":
            symbolMap[acc.name] = "₮";
            break;
          default:
            symbolMap[acc.name] = "¤";
        }
      });
      setAccountSymbols(symbolMap);
    };

    fetchAccountsAndTrades();
  }, [router]);


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

  if (loading) {
    return <FullPageLoader />; // 👈 show loader until data is fetched
  }


  return (
    <div className="dashboard flexClm gap_32">
      <Navbar />
      <BackgroundBlur />

      <div className="flexRow flexRow_stretch">
        <div className="flexClm">
          <span className='font_20'>Choose your account</span>
          <span className='font_12' style={{ color: '#ffffff60' }}>Manage the way you want</span>
        </div>
        <button className="button_sec flexRow" onClick={handleClick} disabled={loading}>
          <Plus size={16} />
        </button>
      </div>

      <motion.div
        className="accountsList flexClm gap_24"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {accounts.length === 0 ? (
          <motion.div className="noAccountsMessage" style={{ textAlign: 'center', marginTop: '50%' }} variants={childVariants}>
            <span className='font_12'>No account found. You can create one.</span>
          </motion.div>
        ) : (
          accounts.map((acc) => (
            <motion.div
              key={acc._id}
              className="accountCard flexClm gap_16"
              variants={childVariants}
              onClick={() => handleAccountClick(acc._id)}
            >
              <div className="accountName flexRow flexRow_stretch" style={{ borderBottom: "0.5px solid #ffffff33", padding: "0 0 8px 0", margin: "0 0 4px 0" }}>
                <span className="font_16" style={{ color: "#ffffffcc" }}>
                  {acc.name}
                </span>
                <div className='flexRow gap_12'>
                  <span className='font_12 button_ter'>Trades: {tradesCount[acc.name] ?? 0}</span>
                  <ArrowRight size={16} className='vector' />
                </div>

              </div>

              <div className="accountBalance flexRow flexRow_stretch">
                <div className="flexClm gap_4 font_12">
                  <span className="font_12" style={{ color: "#ffffff80" }}>
                    Starting Balance
                  </span>
                  <span className="accountAmounts font_16" style={{ color: "" }}>
                    {formatCurrency(acc.startingBalance.amount, accountSymbols[acc.name])}
                  </span>
                </div>

                <div className="flexClm gap_4 font_12">
                  <span style={{ color: "#ffffff80" }}>Current Balance</span>
                  <span
                    className="accountAmounts font_16 vector"
                    style={{ textAlign: "right" }}
                  >
                    {formatCurrency(
                      currentBalances[acc.name] ?? acc.startingBalance.amount,
                      accountSymbols[acc.name]
                    )}
                  </span>
                </div>
              </div>

            </motion.div>
          ))
        )}
      </motion.div>

      {accounts.length > 3 && ( // Only show if there are enough accounts to scroll
        <button
          className="popups_btm button_ter"
          onClick={() => {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: 'smooth'
            });
          }}

        >
          <ArrowDown size={20} />
        </button>
      )}
    </div>
  );

}

export default Accounts;
