"use client";

import { childVariants, containerVariants } from "@/animations/motionVariants";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import Dropdown from "@/components/ui/Dropdown";
import PlanLimitModal from "@/components/ui/PlanLimitModal";
import SectionHeader from "@/components/ui/SectionHeader";
import ToastMessage from "@/components/ui/ToastMessage";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { canAddAccount } from "@/utils/planRestrictions";
import axios from "axios";
import { motion } from "framer-motion";
import Cookies from "js-cookie";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const CreateAccount = () => {
  const [accountName, setAccountName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [balance, setBalance] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alertType, setAlertType] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [toastKey, setToastKey] = useState(0);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const searchParams = useSearchParams();
  const mode = searchParams.get("mode"); // e.g., "edit"
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!isEdit) return;

    const prefillAccount = async () => {
      const accountId = Cookies.get("accountId");
      if (!accountId) return;

      const userData = await getFromIndexedDB("user-data");
      const accountData = userData?.accounts?.find((a) => a._id === accountId);

      if (accountData) {
        setAccountName(accountData.name || "");
        setCurrency(accountData.currency || "USD");
        setBalance(accountData.startingBalance?.amount || "");
      }
    };

    prefillAccount();
  }, [isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userData = await getFromIndexedDB("user-data");
    const accountCount = (userData.accounts || []).length;

    // ✅ Apply plan restriction ONLY when creating, not updating
    if (!isEdit && !canAddAccount(userData, accountCount)) {
      setShowPlanModal(true); // Show modal instead of alert
      return;
    }

    // ✅ Clear previous toast
    setAlertType("");
    setAlertMessage("");
    setToastKey((prev) => prev + 1);

    if (!accountName.trim() || !currency || !balance) {
      setAlertType("error");
      setAlertMessage("Please fill in all details");
      return;
    }

    if (isNaN(parseFloat(balance))) {
      setAlertType("error");
      setAlertMessage("Please enter a valid balance amount");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        accountName: accountName.toUpperCase(),
        currency,
        balance: parseFloat(balance),
      };

      let url = `${API_BASE}/api/account/create`;

      if (isEdit) {
        const accountId = Cookies.get("accountId");
        if (!accountId) throw new Error("Journal ID not found for editing");
        payload.accountId = accountId;
        url = `${API_BASE}/api/account/update`;
      }

      const res = await axios.post(url, payload, { withCredentials: true });
      const { userData, message } = res.data;

      await saveToIndexedDB("user-data", userData);

      setAlertType("success");
      setAlertMessage(
        message ||
          (isEdit
            ? "Journal updated successfully!"
            : "Journal created successfully!")
      );

      // Redirect after short delay so user sees the toast
      setTimeout(() => {
        router.push("/accounts");
      }, 1200);
    } catch (error) {
      setAlertType("error");
      setAlertMessage(
        error.response?.data?.message || "Failed to save account"
      );
    } finally {
      setLoading(false);
    }
  };

  const currencyOptions = [
    { value: "USD", label: `USD (${getCurrencySymbol("USD")})` },
    { value: "INR", label: `INR (${getCurrencySymbol("INR")})` },
    { value: "EUR", label: `EUR (${getCurrencySymbol("EUR")})` },
    { value: "GBP", label: `GBP (${getCurrencySymbol("GBP")})` },
    { value: "JPY", label: `JPY (${getCurrencySymbol("JPY")})` },
    { value: "USDT", label: `USDT (${getCurrencySymbol("USDT")})` },
  ];

  const handleCancel = () => {
    router.push("/accounts");
  };

  return (
    <div className="createAccount flexClm gap_32">
      <SectionHeader
        title="Create journal"
        description="Journals structure logged trades"
        level={2} // uses <h2>
        // showButton={accounts.length > 0}
        // buttonLabel="Create journal"
        // onButtonClick={handleCreateAccount}
        loading={loading}
      />

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
          placeholder="Journal name"
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

        <div className="flexClm gap_12">
          <span className="font_14 shade_50">Journal currency</span>
          <Dropdown
            options={currencyOptions}
            value={currency}
            onChange={setCurrency}
            placeholder="Select Currency"
          />
        </div>

        <motion.div
          className="flexRow flexRow_stretch gap_12"
          variants={childVariants}
        >
          <button
            className="button_sec width100 flex_center flexRow gap_8"
            type="button"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="button_pri width100 flex_center flexRow gap_8"
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                {isEdit ? "Update Journal" : "Create"}{" "}
                <ArrowUpRight size={16} />
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
      <PlanLimitModal
        isOpen={showPlanModal}
        onKeep={() => setShowPlanModal(false)}
        onUpgrade={() => router.push("/pricing")}
      />
    </div>
  );
};

export default CreateAccount;
