'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createAccount } from '@/api/auth';
import { ArrowLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerVariants, childVariants } from '@/animations/motionVariants';
import axios from 'axios';
import { saveToIndexedDB } from '@/utils/indexedDB';


const CreateAccount = () => {
  const [accountName, setAccountName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [balance, setBalance] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const router = useRouter();
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();

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
      const res = await axios.post(
        `${API_BASE}/api/account/create`,
        {
          accountName: accountName.toUpperCase(),
          currency,
          balance: parseFloat(balance),
        },
        { withCredentials: true }
      );

      const { userData } = res.data;

      // Save to IndexedDB in the same structure as login
      await saveToIndexedDB("user-data", userData);

      console.log("💾 Updated IndexedDB after account creation:", userData);

      setAlertType("success");
      setAlertMessage("Account created successfully!");

      // Redirect or refresh
      router.push("/accounts");
    } catch (error) {
      console.error("❌ Account creation failed:", error);
      setAlertType("error");
      setAlertMessage("Failed to create account");
    }

  };

  const handleBackClick = () => {
    router.push('/accounts');
  };


  return (
    <div className="createAccount">
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' }}
      >
        <ArrowLeft className="backButton" onClick={handleBackClick} />
        Create Account
      </motion.h1>


      <motion.form
        onSubmit={handleSubmit}
        className='formContent'
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="formGroup" variants={childVariants}>
          <label>Account Name</label>
          <input
            type="text"
            className='accountName'
            value={accountName}
            onChange={(e) => setAccountName(e.target.value.toUpperCase())}
            required
          />
        </motion.div>

        <motion.div className="formGroup" variants={childVariants}>
          <label>Currency</label>
          <div className="currencyOptions" variants={containerVariants}
            initial="hidden"
            animate="visible">
            {['USD', 'INR', 'USDT'].map((cur) => (
              <div
                key={cur}
                className={`currencyBox ${currency === cur ? 'selected' : ''}`}
                onClick={() => setCurrency(cur)}
                variants={childVariants}
              >
                {cur}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="formGroup" variants={childVariants}>
          <label>Balance</label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            required
          />
        </motion.div>

        <motion.div className="actions" variants={childVariants}>
          <button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="loadingSpinner" />
            ) : (
              <>
                Create Account <ArrowUpRight className="rightButtonArrow" />
              </>
            )}
          </button>
        </motion.div>
      </motion.form>
    </div >
  );
};

export default CreateAccount;
