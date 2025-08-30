import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const API = `${API_BASE}/api/auth`;

// Updated register function to accept an object with { name, email, password }
export const register = ({ name, email, password }) =>
  axios.post(`${API}/register`, { name, email, password }, {
    withCredentials: true, // ✅ Include cookies
  });

// Updated login function to accept { email, password }
export const login = async ({ email, password }) => {
  try {
    const res = await axios.post(`${API}/login`, { email, password }, {
      withCredentials: true,
    });
    return res.data;
  } catch (err) {
    console.error("Login error:", err.response?.data || err.message);
    throw err;
  }
};


// Account creation remains unchanged
export const createAccount = (accountName, currency, balance) =>
  axios.post(`${API_BASE}/api/account/create`, {
    accountName,
    currency,
    balance
  }, {
    withCredentials: true, // ✅ Include cookies for authorization
  });
