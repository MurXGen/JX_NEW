'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerVariants, childVariants } from '@/animations/motionVariants';
import { saveToIndexedDB } from '@/utils/indexedDB';
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const isVerified = Cookies.get("isVerified");
    if (isVerified === "yes") {
      router.push("/accounts");
    }
  }, [router]);

  useEffect(() => {
    const redirectIfAuthenticated = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/verify', {
          withCredentials: true,
        });

        if (res.data?.valid) {
          router.replace('/');
        }
      } catch (err) {
      }
    };

    redirectIfAuthenticated();
  }, [router]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      // Step 1: Login (now also returns accounts + trades)
      const res = await axios.post(
        `${API_BASE}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      const { userData, isVerified } = res.data; // 👈 make sure backend sends this

      // Step 2: Save userData in IndexedDB
      console.log("💾 Saving to IndexedDB after login:", userData);
      await saveToIndexedDB("user-data", userData);

      // Step 3: If verified → set cookie
      if (isVerified) {
        Cookies.set("isVerified", "yes", {
          path: "/",
          sameSite: "Strict",
          expires: 3650 // cookie lasts ~10 years
        });
      } else {
        Cookies.remove("isVerified");
      }


      // Step 4: Redirect
      setIsLoading(false);
      setPopupMessage("Login successful!");
      setTimeout(() => {
        router.push("/accounts");
      }, 1000);
    } catch (err) {
      console.error("❌ Login failed:", err);
      setPopupMessage(err.response?.data?.message || "Login failed");
      setIsLoading(false);
    }
  };




  return (
    <div className="login">
      <div className="title">
        <span className="desc">#1 Traders Preference</span>
        <span>Welcome back again...</span>
      </div>
      <motion.div
        className="formContent"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.span variants={childVariants}>Login to Continue</motion.span>

        <motion.input
          variants={childVariants}
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email Address"
          type="email"
        />

        <motion.div variants={childVariants} className="passwordWrap">
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            type={showPassword ? 'text' : 'password'}
          />
          <button
            type="button"
            className="eye-button"
            onClick={() => setShowPassword(prev => !prev)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </motion.div>

        <motion.div variants={childVariants} className="actions">
          <button onClick={handleLogin} disabled={isLoading}>
            {isLoading ? <div className="spinner"></div> : 'Login'} <ArrowRight className="rightButtonArrow" />
          </button>
        </motion.div>
        <motion.span variants={childVariants}>
          <motion.span className='authenticationLinks'>
            Don't have an account?{' '}
            <button onClick={() => router.push('/register')}>Register</button>
          </motion.span>
        </motion.span>

      </motion.div>
    </div>
  );
}

export default Login;
