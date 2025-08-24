const express = require('express');
const router = express.Router();
const {registerUser, loginUser } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
// router.get('/full', getFullUserData);

// router.get('/check-auth', checkAuthStatus);
// router.get('/verify', verifyUserFromCookie);
// router.get('/full', getFullUserData);

// After Domain
// router.post('/request-password-reset', requestPasswordReset);
// router.post('/reset-password', resetPassword);
// router.get('/verify-email', verifyEmail);


module.exports = router;
