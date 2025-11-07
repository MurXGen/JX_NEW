"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Clock, ExternalLink, Shield, Send } from "lucide-react";
import axios from "axios";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function PaymentVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const amount = searchParams.get("amount");
  const planName = searchParams.get("planName");
  const period = searchParams.get("period");
  const upiId = "journalx@upi"; // replace with your real UPI ID
  const qrImage = "/images/upi_qr.png"; // upload this internally to public/images folder

  const [copied, setCopied] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [timer, setTimer] = useState(30);
  const [showVerify, setShowVerify] = useState(false);
  const [upiRef, setUpiRef] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Copy UPI ID
  const handleCopy = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Open UPI app manually
  const handleOpenUpiApp = async () => {
    try {
      // 🔹 Create order in DB when user actually initiates payment
      const res = await axios.post(
        `${API_BASE}/api/payments/create-order`,
        {
          planId: planName,
          amount: parseInt(amount) * 100, // store in paise
          method: "upi",
          period,
          currency: "INR",
        },
        { withCredentials: true }
      );

      setOrderId(res.data.orderId || res.data._id);
      localStorage.setItem("upiOrderId", res.data.orderId || res.data._id);

      // 🔹 Start 30s timer
      let count = 30;
      const timerInterval = setInterval(() => {
        count--;
        setTimer(count);
        localStorage.setItem("upiTimer", count);
        if (count <= 0) {
          clearInterval(timerInterval);
          setShowVerify(true);
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("Failed to create order. Please try again.");
    }

    // Redirect user to any installed UPI app (without prefilled amount)
    window.location.href = `upi://pay?pa=${upiId}&cu=INR`;
  };

  // Persist timer if user refreshes
  useEffect(() => {
    const savedTimer = localStorage.getItem("upiTimer");
    const savedOrder = localStorage.getItem("upiOrderId");
    if (savedOrder) setOrderId(savedOrder);
    if (savedTimer && savedTimer > 0) {
      setTimer(savedTimer);
      setShowVerify(false);
      const interval = setInterval(() => {
        const newTime = localStorage.getItem("upiTimer") - 1;
        if (newTime <= 0) {
          clearInterval(interval);
          setShowVerify(true);
        } else {
          setTimer(newTime);
          localStorage.setItem("upiTimer", newTime);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleVerify = async () => {
    if (!upiRef) return alert("Please enter UPI Reference ID");
    setVerifying(true);

    try {
      // 🔹 Push to Telegram via backend route
      await axios.post(`${API_BASE}/api/payments/notify-admin`, {
        orderId,
        upiRef,
      });

      alert("UPI Reference sent for admin verification ✅");
      router.push("/payment-pending");
    } catch (err) {
      console.error(err);
      alert("Failed to send for verification");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flexClm flex_center min-h-screen gap_20 p-4">
      <motion.div
        className="chart_boxBg p-6 rounded-2xl text-center flexClm gap_12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Shield className="vector mx-auto" size={40} />
        <h2 className="font_18 font_weight_600">Manual UPI Payment</h2>
        <p className="font_12 shade_50">
          Scan or copy UPI ID below and pay ₹{amount} manually.
        </p>

        {/* QR Code */}
        <div className="w-48 h-48 mx-auto relative">
          <Image
            src={qrImage}
            alt="UPI QR"
            fill
            className="object-contain rounded-lg"
          />
        </div>

        {/* UPI ID */}
        <div className="flexRow gap_8 flex_center mt-4">
          <span className="font_14 font_weight_600">{upiId}</span>
          <button onClick={handleCopy} className="button_ter flexRow gap_4">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Open UPI App */}
        {!orderId && (
          <motion.button
            className="upgrade_btn mt-4 flexRow gap_4 flex_center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenUpiApp}
          >
            <ExternalLink size={16} />
            Open UPI App
          </motion.button>
        )}

        {/* Timer */}
        {orderId && !showVerify && (
          <div className="flexRow gap_6 flex_center mt-4">
            <Clock size={16} />
            <span className="font_14">Waiting for payment... {timer}s</span>
          </div>
        )}

        {/* Verification Input */}
        <AnimatePresence>
          {showVerify && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flexClm gap_8 mt-6"
            >
              <input
                type="text"
                placeholder="Enter UPI Reference ID"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                className="input_field"
              />
              <motion.button
                className="upgrade_btn flexRow gap_4 flex_center"
                onClick={handleVerify}
                disabled={verifying}
                whileHover={{ scale: verifying ? 1 : 1.02 }}
              >
                {verifying ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <Send size={16} /> Submit for Verification
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
