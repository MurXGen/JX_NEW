'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import GlassyBottomBar from '@/components/GlassyBottomBar';
import Navbar from '@/components/Navbar';
import { Trash, RotateCcw, ArrowRightCircle, MessageSquare, ArrowRightLeft } from 'lucide-react';
import { getCurrencySymbol } from '@/utils/currencySymbol';
import LoadingOverlay from '@/components/LoadingOverlay';
import PopupAlert from '@/components/PopupAlert';
import { motion, AnimatePresence } from 'framer-motion';
import { containerVariants, childVariants } from '@/animations/motionVariants';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const Profile = () => {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteCountdown, setDeleteCountdown] = useState(20);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
    const [feedback, setFeedback] = useState('');

    const countdownRef = useRef(null);
    const router = useRouter();

    const [popupMessage, setPopupMessage] = useState('');
    const [popupType, setPopupType] = useState('success');

    useEffect(() => {
        const fetchAccount = async () => {
            try {
                // ✅ Check auth via cookie
                const res = await axios.get(`${API_BASE}/api/auth/verify`, {
                    withCredentials: true,
                });

                if (!res.data?.valid) {
                    return router.push('/accounts');
                }

                // ✅ Fetch account if verified
                const accountRes = await axios.get(`${API_BASE}/api/account/current`, {
                    withCredentials: true,
                });

                if (accountRes.data?.account) {
                    setAccount(accountRes.data.account);
                } else {
                    router.push('/accounts');
                }
            } catch {
                router.push('/accounts');
            } finally {
                setLoading(false);
            }
        };

        fetchAccount();
    }, [router]);

    useEffect(() => {
        if (isDeleting) {
            countdownRef.current = setInterval(() => {
                setDeleteCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current);
                        deleteAccount();
                        return 20;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(countdownRef.current);
    }, [isDeleting]);

    const deleteAccount = async () => {
        try {
            const res = await axios.delete(`${API_BASE}/api/account/delete`, {
                withCredentials: true,
            });

            if (res.status === 200 && res.data?.user) {
                await saveToIndexedDB('user-data', res.data.user);
                console.log('✅ IndexedDB updated after account deletion');

                setPopupMessage('Account deleted successfully!');
                setPopupType('success');

                setTimeout(() => {
                    router.push('/accounts');
                }, 1500);
            } else {
                throw new Error('Delete failed or user data missing');
            }
        } catch (err) {
            console.error('Error deleting account:', err);
            setPopupMessage('Error deleting account.');
            setPopupType('error');
        }
    };



    const handleFeedbackClick = () => {
        const lastFeedbackTime = localStorage.getItem('feedbackTime');
        const now = Date.now();

        if (lastFeedbackTime) {
            const diff = now - parseInt(lastFeedbackTime, 10);
            const hoursPassed = diff / (1000 * 60 * 60);

            if (hoursPassed < 6) {
                const remaining = (6 - hoursPassed).toFixed(1);
                alert(`Please wait ${remaining} more hours to submit feedback.`);
                return;
            }
        }

        setShowFeedbackPopup(true);
    };

    const handleSubmitFeedback = async () => {
        try {
            await axios.post(`${API_BASE}/api/account/feedback`, { feedback }, {
                withCredentials: true,
            });
            localStorage.setItem('feedbackTime', Date.now().toString());
            setFeedback('');
            setShowFeedbackPopup(false);

            setPopupType('success');
            setPopupMessage('Feedback submitted. Thank you!');
        } catch {
            setPopupType('error');
            setPopupMessage('Please fill in the message.');
        }
    };

    if (loading || !account) return <LoadingOverlay />;

    return (
        <div className='profile'>
            <Navbar />


            <motion.div
                className="profileHeader"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div className="accounName" variants={childVariants}>
                    <label>Account Name</label>
                    <span>{account?.name || 'New Account'}</span>
                </motion.div>

                <motion.div
                    className="accounBalance"
                    style={{ textAlign: 'right' }}
                    variants={childVariants}
                >
                    <label>Current Balance</label>
                    <span>
                        {getCurrencySymbol(account?.currency || 'usd')}
                        {account?.endingBalance?.amount?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                    </span>
                </motion.div>
            </motion.div>

            <motion.div
                className="profileActions"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.button
                    className='switchBtn'
                    onClick={() => router.push('/accounts')}
                    variants={childVariants}
                    whileHover={{ scale: 1.03 }}
                >
                    <ArrowRightLeft className="lucideVector" /> Switch Account
                </motion.button>

                {!isDeleting ? (
                    <motion.button
                        className='deleteBtn'
                        onClick={() => setIsDeleting(true)}
                        variants={childVariants}
                        whileHover={{ scale: 1.03 }}

                    >
                        <Trash className="lucideVector" style={{ color: '#ff0000', }} /> Delete Account
                    </motion.button>
                ) : (
                    <motion.div className='deleteCountdownBox' variants={childVariants}>
                        <p>Deleting in {deleteCountdown}s</p>
                        <button onClick={() => {
                            clearInterval(countdownRef.current);
                            setIsDeleting(false);
                            setDeleteCountdown(20);
                        }}>
                            <RotateCcw className="lucideVector" /> Cancel Delete
                        </button>
                    </motion.div>
                )}

                <motion.button
                    className='feedbackBtn'
                    onClick={handleFeedbackClick}
                    variants={childVariants}
                    whileHover={{ scale: 1.03 }}
                >
                    <MessageSquare className="lucideVector" /> Feedback
                </motion.button>
            </motion.div>

            <AnimatePresence>
                {showFeedbackPopup && (
                    <motion.div
                        className='feedbackPopup'
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        <motion.div
                            className="popupContent"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <motion.label variants={childVariants}>Write us a feedback</motion.label>
                            <motion.textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Share your thoughts..."
                                variants={childVariants}
                            />
                            <motion.div className='actions' variants={childVariants}>
                                <button onClick={handleSubmitFeedback}>Submit</button>
                                <button onClick={() => setShowFeedbackPopup(false)}>Cancel</button>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {popupMessage && (
                <PopupAlert
                    message={popupMessage}
                    type={popupType}
                    onClose={() => setPopupMessage('')}
                />
            )}

            <GlassyBottomBar />
        </div>
    );

};

export default Profile;
