"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/formatNumbers";
import { Pencil, Trash2, Repeat } from "lucide-react";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { calculateStats } from "@/utils/calculateStats";
import BottomBar from "@/components/Trades/BottomBar";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import FullPageLoader from "@/components/ui/FullPageLoader";
import ToastMessage from "@/components/ui/ToastMessage";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const AccountSetting = () => {
  const router = useRouter();
  const [accountData, setAccountData] = useState(null);
  const [stats, setStats] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toast states
  const [alertType, setAlertType] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [toastKey, setToastKey] = useState(0);

  const [accountOverview, setAccountOverview] = useState({
    currentBalance: 0,
    initialBalance: 0,
    roiAmount: 0,
    roiPercentage: 0,
  });
  const [loading, setLoading] = useState(true); // data loader
  const [deleting, setDeleting] = useState(false); // deletion loader

  useEffect(() => {
    const loadAccountData = async () => {
      const accountId = Cookies.get("accountId");

      if (!accountId) {
        router.push("/accounts");
        return;
      }

      const userData = await getFromIndexedDB("user-data");

      if (!userData) {
        setLoading(false);
        return;
      }

      const account = (userData.accounts || []).find(
        (acc) => acc._id === accountId
      );

      if (!account) {
        router.push("/accounts");
        return;
      }

      setAccountData(account);

      if (account.currency) {
        localStorage.setItem("currencyCode", account.currency);
      }

      const accountTrades = (userData.trades || []).filter(
        (trade) => trade.accountId === accountId
      );

      let netPnL = 0;
      if (accountTrades.length > 0) {
        const statsData = calculateStats(accountTrades);
        setStats(statsData);
        netPnL = statsData.netPnL || 0;
      }

      const initialBalance = account.startingBalance?.amount || 0;
      const currentBalance = initialBalance + netPnL;

      const roiAmount = currentBalance - initialBalance;
      const roiPercentage = initialBalance
        ? (roiAmount / initialBalance) * 100
        : 0;

      setAccountOverview({
        currentBalance,
        initialBalance,
        roiAmount,
        roiPercentage,
      });

      setLoading(false);
    };

    loadAccountData();
  }, [router]);

  const handleEdit = () => {
    router.push("/create-account?mode=edit");
  };

  const handleSwitch = () => {
    router.push("/accounts");
  };

  const handleDeactivate = async () => {
    setIsModalOpen(false);
    setDeleting(true);
    setToastKey((k) => k + 1);

    try {
      const accountId = Cookies.get("accountId");
      console.log("🟢 Deactivating accountId:", accountId);

      if (!accountId) {
        setAlertType("error");
        setAlertMessage("No active account selected");
        setDeleting(false);
        console.warn("⚠️ No accountId found in cookies");
        return;
      }

      const url = `${API_BASE}/api/account/deactivate`;
      console.log("🔗 Axios POST URL:", url);

      const payload = { accountId };
      console.log("📦 Payload being sent:", payload);

      const res = await axios.post(url, payload, { withCredentials: true });
      console.log("✅ Response received:", res.data);

      const { userData, message } = res.data;

      if (userData) {
        console.log("💾 Saving updated userData to IndexedDB");
        await saveToIndexedDB("user-data", userData);

        setAlertType("success");
        setAlertMessage(message || "Account deactivated successfully!");
        console.log("⏳ Redirecting to /accounts in 1.2s");
        setTimeout(() => {
          Cookies.remove("accountId");
          router.push("/accounts");
        }, 1200);
      }
    } catch (error) {
      console.error("❌ Account deactivation failed:", error);
      setAlertType("error");
      setAlertMessage(
        error.response?.data?.message || "Failed to deactivate account"
      );

      if (error.response) {
        console.error("📄 Server response:", error.response.data);
        console.error("📌 Status:", error.response.status);
        console.error("📌 Headers:", error.response.headers);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading || deleting) {
    return (
      <FullPageLoader
        message={
          deleting ? "Deactivating account..." : "Loading account data..."
        }
      />
    );
  }

  if (!accountData) {
    return (
      <div className="flexClm itemsCenter justifyCenter h-full">
        <span className="font_14 text-red-500">No account found.</span>
      </div>
    );
  }

  return (
    <div className="accountSetting flexClm gap_24">
      <div className="flexClm">
        <span className="font_20">Account setting</span>
        <span className="font_12">Manage account detail</span>
      </div>

      {/* Account Overview */}
      <div className="chart_boxBg flexClm gap_32" style={{ padding: "16px" }}>
        <div className="flexClm gap_8">
          <span className="font_12">Account name</span>
          <span className="font_16 font_600">{accountData.name}</span>
        </div>

        <div className="flexRow gap_16 flexRow_stretch">
          <div className="flexClm gap_8">
            <span className="font_12 text-gray-400">Current Balance</span>
            <span className="font_14 font_bold">
              {formatCurrency(accountOverview.currentBalance)}
            </span>
          </div>
          <div className="flexClm gap_8" style={{ textAlign: "center" }}>
            <span className="font_12 text-gray-400">Initial Capital</span>
            <span className="font_14 font_bold">
              {formatCurrency(accountOverview.initialBalance)}
            </span>
          </div>
          <div className="flexClm gap_8" style={{ textAlign: "right" }}>
            <span className="font_12 text-gray-400">
              ROI{" "}
              <span
                className={`font_12 ${
                  accountOverview.roiAmount >= 0 ? "success" : "error"
                }`}
              >
                ({accountOverview.roiPercentage.toFixed(2)}%)
              </span>
            </span>
            <span
              className={`font_14 font_bold ${
                accountOverview.roiAmount >= 0 ? "success" : "error"
              }`}
            >
              {formatCurrency(accountOverview.roiAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flexRow_mobile gap_12">
        <button
          className="button_sec width100 flexRow_cntr_mobile flexRow gap_8"
          onClick={handleEdit}
        >
          <Pencil size={16} />
          Edit Account
        </button>

        <ConfirmationModal
          isOpen={isModalOpen}
          title="Deactivate Account"
          message="Are you sure you want to deactivate this account? This action cannot be undone."
          onCancel={() => setIsModalOpen(false)}
          onConfirm={handleDeactivate}
        />

        <button
          className="button_sec width100 flexRow_cntr_mobile flexRow gap_8"
          onClick={handleSwitch}
        >
          <Repeat size={16} />
          Switch Account
        </button>

        <button
          className="button_sec  flexRow_cntr_mobile flexRow gap_8 error"
          onClick={() => setIsModalOpen(true)}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <BottomBar />
      <BackgroundBlur />
      <ToastMessage
        key={toastKey}
        type={alertType}
        message={alertMessage}
        duration={3000}
      />
    </div>
  );
};

export default AccountSetting;
