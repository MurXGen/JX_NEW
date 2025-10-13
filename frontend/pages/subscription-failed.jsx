// components/Subscription/SubscriptionFailed.js
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  XCircle,
  RefreshCw,
  ArrowLeft,
  HelpCircle,
  Shield,
  Mail,
} from "lucide-react";

export default function SubscriptionFailed() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorMessage =
    searchParams.get("message") ||
    "The payment was not completed. This could be due to insufficient funds, card decline, or technical issues.";

  const retryPayment = () => {
    router.back(); // Go back to payment page
  };

  return (
    <div className="subscription-failed">
      <div className="flexClm gap_24">
        {/* Error Header */}
        <motion.div
          className="flexClm gap_12 flex_center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              delay: 0.2,
            }}
            className="error"
          >
            <XCircle size={80} className="error" />
          </motion.div>
          <span className="font_24 font_weight_700">Payment Failed</span>
          <span
            className="font_12 shade_50"
            style={{
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            We couldn't process your payment. Don't worry, you can try again.
          </span>
        </motion.div>

        {/* Error Details */}
        <motion.div
          className="flexClm gap_12 chart_boxBg"
          style={{ padding: "16px" }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flexRow gap_12">
            <HelpCircle size={20} className="error" />
            <div className="">
              <span className="font_14 font_weight_600">
                Possible Reasons for failure
              </span>
            </div>
          </div>

          <div className="common-issues">
            <span
              className="font_12 font_weight_600"
              style={{ color: "var(--white-50)" }}
            >
              Common issues:
            </span>
            <ul
              className="issues-list font_12"
              style={{ color: "var(--white-50)" }}
            >
              <li>Insufficient funds in your account</li>
              <li>Card declined by your bank</li>
              <li>Incorrect card details entered</li>
              <li>Network connectivity issues</li>
            </ul>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flexClm gap_24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <div className="flexRow flexRow_stretch widthh100 gap_12">
            <button
              className="button_sec flexRow flex_center gap_8 width100"
              onClick={() => router.push("/pricing")}
            >
              <ArrowLeft size={18} />
              Select other Plan
            </button>
            <motion.button
              className="button_pri flexRow flex_center gap_8 width100"
              onClick={retryPayment}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={18} />
              Try Again
            </motion.button>
          </div>

          <button
            className="support-link"
            onClick={() => router.push("/support")}
          >
            Need help? Contact Support
          </button>
        </motion.div>

        {/* Solutions & Support */}
        <motion.div
          className="chart_boxBg"
          style={{ padding: "20px 16px" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {/* <div className="solutions-header">
            <span className="font_16 font_weight_600">Let's fix this</span>
          </div> */}

          <div className="flexRow_mobile flexRow_stretch gap_32">
            <div className="flexRow gap_8">
              <RefreshCw size={20} className="vector" />
              <div className="solution-content">
                <span className="font_14 font_weight_600">Try Again</span>
                <span className="font_12" style={{ color: "var(--white-50)" }}>
                  Retry the payment with same details
                </span>
              </div>
            </div>

            <div className="flexRow gap_8">
              <Shield size={20} className="vector" />
              <div className="solution-content">
                <span className="font_14 font_weight_600">
                  Use Different Method
                </span>
                <span className="font_12" style={{ color: "var(--white-50)" }}>
                  Try UPI, Crypto, or another card
                </span>
              </div>
            </div>

            <div className="flexRow gap_8">
              <Mail size={20} className="vector" />
              <div className="solution-content">
                <span className="font_14 font_weight_600">Contact Support</span>
                <span className="font_12" style={{ color: "var(--white-50)" }}>
                  Get help from our team
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Assurance */}
        <motion.div
          className="security-assurance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <div className="security-badge flexRow gap_8 flex_center">
            <Shield size={16} className="vector" />
            <span className="font_12">
              Your payment information is secure and encrypted
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
