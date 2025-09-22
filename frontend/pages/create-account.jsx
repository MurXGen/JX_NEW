"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/api/auth";
import { ArrowLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { containerVariants, childVariants } from "@/animations/motionVariants";
import axios from "axios";
import { saveToIndexedDB } from "@/utils/indexedDB";
import Navbar from "@/components/Trades/Navbar";
import ToastMessage from "@/components/ui/ToastMessage";
import BackgroundBlur from "@/components/ui/BackgroundBlur";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const CreateAccount = () => {
  const [accountName, setAccountName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [balance, setBalance] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alertType, setAlertType] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [toastKey, setToastKey] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setToastKey((prev) => prev + 1);

    if (!accountName.trim() || !currency) {
      setAlertType("error");
      setAlertMessage("Please fill in all details");
      return;
    }
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE}/api/account/create`,
        {
          accountName: accountName.toUpperCase(),
          currency,
          balance: parseFloat(balance),
        },
        { withCredentials: true }
      );

      const { userData, message } = res.data;

      // Save updated user data to IndexedDB
      await saveToIndexedDB("user-data", userData);

      console.log("💾 Updated IndexedDB after account creation:", userData);

      setAlertType("success");
      setAlertMessage(message || "Account created successfully!");

      // Redirect after short delay so user sees the toast
      setTimeout(() => {
        router.push("/accounts");
      }, 1200);
    } catch (error) {
      console.error("❌ Account creation failed:", error);
      setAlertType("error");

      if (error.response?.data?.message) {
        setAlertMessage(`❌ ${error.response.data.message}`);
      } else {
        setAlertMessage("❌ Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    router.push("/accounts");
  };

  return (
    <div className="createAccount flexClm gap_32">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flexClm gap_4"
      >
        <span className="font_20">Create Account</span>
        <span
          className="font_12"
          style={{ color: "#ffffff80", fontWeight: "500 !important" }}
        >
          Multiple accounts helps in managing trades
        </span>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="formContent flexClm gap_24"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <input
          type="text"
          className="accountName"
          value={accountName}
          placeholder="Account Name"
          onChange={(e) => setAccountName(e.target.value.toUpperCase())}
          required
        />

        <input
          type="number"
          value={balance}
          placeholder="Balance"
          min="0"
          onChange={(e) => {
            const val = Math.max(0, Number(e.target.value));
            setBalance(val);
          }}
          required
        />

        <div
          className="currencyOptions flexRow gap_12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {["USD", "INR", "USDT"].map((cur) => (
            <span
              key={cur}
              className={`currencyText  button_ter font_12 ${
                currency === cur ? "selected" : ""
              }`}
              onClick={() => setCurrency(cur)}
              variants={childVariants}
              style={{ width: "70px", textAlign: "center" }}
            >
              {cur}
            </span>
          ))}
        </div>

        <motion.div
          className="flexRow flexRow_stretch gap_12"
          variants={childVariants}
        >
          <ArrowLeft
            onClick={handleBackClick}
            className="button_sec"
            size={20}
          />
          <button
            className="button_pri flexRow gap_8"
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spinner" size={16} />
            ) : (
              <>
                Create Account <ArrowUpRight size={16} />
              </>
            )}
          </button>
        </motion.div>
      </motion.form>
      <ToastMessage
        key={toastKey}
        type={alertType}
        message={alertMessage}
        duration={3000}
      />
      <BackgroundBlur />
    </div>
  );
};

export default CreateAccount;
