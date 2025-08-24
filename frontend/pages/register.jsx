'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import PopupAlert from '@/components/PopupAlert';
import { containerVariants, childVariants } from '@/animations/motionVariants';
import { register } from '@/api/auth';

function Register() {
  const [step, setStep] = useState('enter-email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const redirectIfAuthenticated = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/auth/verify`, {
          withCredentials: true,
        });

        if (res.data?.valid) {
          router.replace('/');
        }
      } catch (err) {
        // no userId in cookies — no problem, stay on page
      }
    };

    redirectIfAuthenticated();
  }, [router]);

  useEffect(() => {
    document.body.classList.add('gradient-bg');
    return () => document.body.classList.remove('gradient-bg');
  }, []);


const handleRegister = async () => {
  if (password !== confirmPassword) {
    setPopupMessage('Passwords do not match');
    return;
  }

  setIsLoading(true);
  try {
    const res = await register({ name, email, password });

    setPopupMessage('Registered successfully!');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      router.push('/');
    }, 1500);
  } catch (err) {
    console.error('Error during registration:', err);
    setPopupMessage(err.response?.data?.message || 'Registration failed');
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="register">
      <Navbar />
      <div className="title">
        <span className="desc">#1 Traders Preference</span>
        <span>Welcome to Journaling...</span>
      </div>

      <PopupAlert
        message={popupMessage}
        type={popupMessage === 'Registered successfully!' ? 'success' : 'error'}
        onClose={() => setPopupMessage('')}
      />

      <div className="container">
        {step === 'enter-email' && (
          <motion.div
            key="email-step"
            className="formContent"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.span variants={childVariants}>Name (optional)</motion.span>
            <motion.input
              variants={childVariants}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              type="text"
            />
            <motion.span variants={childVariants}>Email address</motion.span>
            <motion.input
              variants={childVariants}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
            />
            <motion.div className="actions" variants={childVariants}>
              <button onClick={() => setStep('set-password')}>
                Next <ArrowRight className="rightButtonArrow" />
              </button>
            </motion.div>

            <motion.span variants={childVariants}>
              <motion.span className='authenticationLinks'>
                Already have an account?{' '}
                <button onClick={() => router.push('/login')}>Login</button>
              </motion.span>
            </motion.span>
          </motion.div>
        )}

        {step === 'set-password' && (
          <motion.div
            key="password-step"
            className="formContent"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.span variants={childVariants}>Create a Password</motion.span>
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

            <motion.div variants={childVariants} className="passwordWrap">
              <input
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
              />
              <button
                type="button"
                className="eye-button"
                onClick={() => setShowConfirmPassword(prev => !prev)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </motion.div>

            <motion.div className="actions" variants={childVariants}>
              <button onClick={() => setStep('enter-email')}>
                <ArrowLeft className="buttonArrow" /> Back
              </button>
              <button onClick={handleRegister} disabled={isLoading}>
                {isLoading ? (
                  <div className="spinner">Registering...</div>
                ) : (
                  <>
                    Register <ArrowRight className="rightButtonArrow" />
                  </>
                )}
              </button>
            </motion.div>
            <motion.span variants={childVariants}>
              <motion.span className='authenticationLinks'>
                Already have an account?{' '}
                <button onClick={() => router.push('/login')}>Login</button>
              </motion.span>
            </motion.span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Register;
