// require('dotenv').config();
// const TelegramBot = require('node-telegram-bot-api');
// const axios = require('axios');
// const FormData = require('form-data');
// const User = require('./models/User');
// const moment = require('moment');

// const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// // ⏳ In-memory session (consider Redis for persistent sessions in production)
// const userStates = {};

// // Upload Telegram image to Cloudinary using file URL
// const uploadToCloud = async (fileUrl) => {
//   const formData = new FormData();
//   formData.append('file', fileUrl);
//   formData.append('upload_preset', 'TradeWings'); // replace with your actual preset

//   try {
//     const response = await axios.post(
//       'https://api.cloudinary.com/v1_1/dhjplff89/image/upload',
//       formData,
//       {
//         headers: formData.getHeaders()
//       }
//     );
//     return response.data.secure_url;
//   } catch (err) {
//     //     return null;
//   }
// };

// function askStopLoss(chatId) {
//   return bot.sendMessage(chatId, '🚨 Enter Stop Loss (SL) price 1:');
// }

// // START command
// bot.onText(/\/start/, async (msg) => {
//   const chatId = msg.chat.id;
//   let state = userStates[chatId];

//   // ✅ Check if already logged in
//   if (state?.userId && state?.accountId) {
//     return bot.sendMessage(chatId, '👋 You are already logged in. Ready to log your trade!');
//   }

//   try {
//     // 🌐 Check if user with this Telegram ID already exists in DB
//     const user = await User.findOne({ telegramId: chatId });

//     if (user) {
//       const selectedAccount = user.accounts?.[0]; // or handle preferred account selection
//       if (selectedAccount) {
//         userStates[chatId] = {
//           step: null,
//           userId: user._id.toString(),
//           accountId: selectedAccount._id.toString(),
//           account: selectedAccount,
//           user: user,
//         };
//         return bot.sendMessage(chatId, '👋 Welcome back! You are now logged in and ready to log trades.');
//       }
//     }

//     // 🆕 User not found or no account — ask for email
//     userStates[chatId] = { step: 'awaiting_email' };
//     return bot.sendMessage(chatId, '📩 Please enter your email to continue:');

//   } catch (err) {
//     //     return bot.sendMessage(chatId, '⚠️ An error occurred. Please try again later.');
//   }
// });

// bot.on('message', async (msg) => {
//   const chatId = msg.chat.id;
//   const state = userStates[chatId];
//   if (!state || msg.text?.startsWith('/')) return;

//   const text = msg.text ? msg.text.trim() : '';
//   if (!text) return;

//   switch (state.step) {
//     case 'awaiting_email': {
//       const user = await User.findOne({ email: text.toLowerCase() });
//       if (!user) return bot.sendMessage(chatId, '❌ Invalid email, try again.');
//       userStates[chatId] = {
//         ...state,
//         userId: user._id,
//         accounts: user.accounts,
//         reasons: user.accounts[0]?.reasons || [], // optional
//         step: 'account_selection'
//       };
//       const buttons = user.accounts.map((a, i) => [{ text: a.name, callback_data: `account_${i}` }]);
//       return bot.sendMessage(chatId, '📂 Select account:', { reply_markup: { inline_keyboard: buttons } });
//     }

//     case 'awaiting_custom_symbol':
//       state.trade.symbol = text.toUpperCase();
//       return askDirection(chatId);

//     case 'awaiting_quantity':
//       state.trade.quantityUSD = parseFloat(text);
//       return askTradeStatus(chatId);

//     case 'awaiting_pnl': {
//       state.trade.pnl = parseFloat(text);
//       state.step = 'awaiting_open_date_choice';

//       const today = moment().format('DD-MM-YYYY');
//       const yesterday = moment().subtract(1, 'days').format('DD-MM-YYYY');
//       const dayBefore = moment().subtract(2, 'days').format('DD-MM-YYYY');

//       const buttons = [
//         [{ text: `Today (${today})`, callback_data: `open_date_${today}` }],
//         [{ text: `Yesterday (${yesterday})`, callback_data: `open_date_${yesterday}` }],
//         [{ text: `Day Before Yesterday (${dayBefore})`, callback_data: `open_date_${dayBefore}` }],
//         [{ text: '✍️ Enter manually', callback_data: 'open_date_manual' }],
//       ];

//       return bot.sendMessage(chatId, '📅 Select open **date**:', {
//         parse_mode: 'Markdown',
//         reply_markup: { inline_keyboard: buttons },
//       });
//     }

//     case 'awaiting_open_date_manual': {
//       const date = text.trim();
//       const valid = moment(date, 'DD-MM-YYYY', true).isValid();

//       const yearOk = (() => {
//         const yr = parseInt(date.split('-')[2]);
//         const currYear = new Date().getFullYear();
//         return yr >= (currYear - 30) && yr <= currYear;
//       })();

//       if (!valid || !yearOk)
//         return bot.sendMessage(chatId, '❌ Invalid date. Please use *DD-MM-YYYY*, within past 30 years.', { parse_mode: 'Markdown' });

//       state.trade.openTime = date;
//       state.step = 'awaiting_open_time_choice';

//       const timeButtons = [
//         [{ text: '🕐 01:30 AM', callback_data: 'open_time_01:30 AM' }],
//         [{ text: '🕟 05:30 PM', callback_data: 'open_time_05:30 PM' }],
//         [{ text: '✍️ Enter manually', callback_data: 'open_time_manual' }],
//       ];

//       return bot.sendMessage(chatId, '⏰ Select open **time**:', {
//         parse_mode: 'Markdown',
//         reply_markup: { inline_keyboard: timeButtons },
//       });
//     }

//     case 'awaiting_open_time_manual': {
//       if (!moment(text, 'hh:mm A', true).isValid()) {
//         return bot.sendMessage(chatId, '⏰ Wrong format. Use *hh:mm AM/PM*', { parse_mode: 'Markdown' });
//       }

//       state.trade.openTime += ` ${text}`;

//       if (['closed', 'quick'].includes(state.trade.tradeStatus)) {
//         state.step = 'awaiting_close_date_choice';
//         return askCloseDate(chatId); // You’ll send me this next
//       }

//       state.step = 'ask_open_img_confirm';
//       return askOpenImageConfirm(chatId);
//     }

//     case 'awaiting_close_date_manual': {
//       const date = text.trim();
//       const valid = moment(date, 'DD-MM-YYYY', true).isValid();

//       const yearOk = (() => {
//         const yr = parseInt(date.split('-')[2]);
//         const currYear = new Date().getFullYear();
//         return yr >= (currYear - 30) && yr <= currYear;
//       })();

//       if (!valid || !yearOk)
//         return bot.sendMessage(chatId, '❌ Invalid date. Please use *DD-MM-YYYY*, within past 30 years.', { parse_mode: 'Markdown' });

//       state.trade.closeTime = date;
//       state.step = 'awaiting_close_time_choice';

//       const timeButtons = [
//         [{ text: '🕐 01:30 AM', callback_data: 'close_time_01:30 AM' }],
//         [{ text: '🕟 05:30 PM', callback_data: 'close_time_05:30 PM' }],
//         [{ text: '✍️ Enter manually', callback_data: 'close_time_manual' }],
//       ];

//       return bot.sendMessage(chatId, '⏰ Select close **time**:', {
//         parse_mode: 'Markdown',
//         reply_markup: { inline_keyboard: timeButtons },
//       });
//     }

//     case 'awaiting_close_time_manual': {
//       if (!moment(text, 'hh:mm A', true).isValid()) {
//         return bot.sendMessage(chatId, '⏰ Wrong format. Use *hh:mm AM/PM*', { parse_mode: 'Markdown' });
//       }

//       state.trade.closeTime += ` ${text}`; // now full closeTime like "29-06-2025 10:00 AM"
//       state.step = 'ask_open_img_confirm';
//       return askOpenImageConfirm(chatId);
//     }

//     case 'awaiting_reason_manual':
//       state.trade.reason = [text];
//       state.step = 'awaiting_mood';
//       return askMood(chatId);

//     case 'awaiting_mood_manual':
//       state.trade.mood = text;
//       state.step = 'awaiting_rules';
//       return askRulesFollowed(chatId);

//     case 'awaiting_learnings': {
//       if (!state.trade) state.trade = {}; // Ensure the object exists
//       state.trade.learnings = text.toLowerCase() === 'no' ? '' : text;
//       return finalizeTrade(chatId);
//     }

//     case /^awaiting_entry_\d+$/.test(state.step) && state.step: {
//       const index = parseInt(state.step.split('_')[2]);

//       const price = parseFloat(text);
//       if (isNaN(price)) return bot.sendMessage(chatId, '❌ Invalid price.');

//       state.currentEntry = { price };
//       state.step = 'awaiting_entry_allocation_method';
//       return bot.sendMessage(chatId, `📊 Entry #${index}: Choose allocation method:`, {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: '💯 Percentage', callback_data: 'entry_alloc_percent' }],
//             [{ text: '🔢 Quantity', callback_data: 'entry_alloc_quantity' }],
//           ]
//         }
//       });
//     }

//     case /^awaiting_entry_\d+_percent$/.test(state.step) && state.step: {
//       const percent = parseFloat(text);
//       if (isNaN(percent) || percent <= 0 || percent > 100)
//         return bot.sendMessage(chatId, '❌ Enter a valid percentage between 1 and 100');

//       const totalPercent = (state.trade.entries || []).reduce((sum, e) => sum + (e.allocation || 0), 0);
//       const newTotal = totalPercent + percent;
//       const totalQty = state.trade.quantityUSD || 0;
//       const thisQty = (percent / 100) * totalQty;

//       if (newTotal > 100) {
//         return bot.sendMessage(chatId, `❌ Allocation exceeds 100%. Already used: ${totalPercent}%`);
//       }

//       const entryPrice = state.currentEntry?.price;
//       if (!entryPrice) return bot.sendMessage(chatId, '❌ Missing entry price.');

//       state.trade.entries = state.trade.entries || [];
//       state.trade.entries.push({
//         price: entryPrice,
//         allocation: percent,
//         quantity: thisQty,
//       });

//       if (newTotal < 100) {
//         const nextIndex = state.trade.entries.length + 1;
//         state.step = `awaiting_entry_${nextIndex}`;
//         return bot.sendMessage(chatId, `📈 Enter entry price #${nextIndex}:`);
//       }

//       state.step = 'awaiting_sl_price';
//       return bot.sendMessage(chatId, '🚨 Enter Stop Loss (SL) price:');

//     }

//     case 'awaiting_entry_percent': {
//       const percent = parseFloat(text);
//       if (isNaN(percent) || percent <= 0 || percent > 100)
//         return bot.sendMessage(chatId, '❌ Enter valid percentage (1–100)');

//       const totalAllocated = (state.trade.entries || []).reduce((sum, e) => sum + e.allocation, 0);
//       const newTotal = totalAllocated + percent;

//       if (newTotal > 100) {
//         return bot.sendMessage(chatId, `❌ Allocation exceeds 100%. Currently allocated: ${totalAllocated}%`);
//       }

//       const totalQty = state.trade.quantityUSD || 0;
//       const qty = +(totalQty * (percent / 100)).toFixed(2);

//       state.trade.entries = state.trade.entries || [];
//       state.trade.entries.push({
//         price: state.currentEntry.price,
//         allocation: percent,
//         quantity: qty,
//       });

//       if (newTotal < 100) {
//         state.step = `awaiting_entry_${state.trade.entries.length + 1}`;
//         return bot.sendMessage(chatId, `Enter entry price #${state.trade.entries.length + 1}:`);
//       }

//       state.step = 'awaiting_sl';
//       return askStopLoss(chatId);
//     }

//     case /^awaiting_entry_\d+_quantity$/.test(state.step) && state.step: {
//       const qty = parseFloat(text);
//       if (isNaN(qty) || qty <= 0) return bot.sendMessage(chatId, '❌ Enter a valid quantity.');

//       const totalQty = state.trade.quantityUSD || 0;
//       const usedQty = (state.trade.entries || []).reduce((sum, e) => sum + e.quantity, 0);
//       const newTotal = usedQty + qty;

//       if (newTotal > totalQty) {
//         return bot.sendMessage(chatId, `❌ Quantity exceeds total. Already used: ${usedQty}`);
//       }

//       const allocation = +(qty / totalQty * 100).toFixed(2);

//       const entryPrice = state.currentEntry?.price;
//       if (!entryPrice) return bot.sendMessage(chatId, '❌ Missing entry price.');

//       state.trade.entries = state.trade.entries || [];
//       state.trade.entries.push({
//         price: entryPrice,
//         allocation,
//         quantity: qty,
//       });

//       if (newTotal < totalQty) {
//         const nextIndex = state.trade.entries.length + 1;
//         state.step = `awaiting_entry_${nextIndex}`;
//         return bot.sendMessage(chatId, `📈 Enter entry price #${nextIndex}:`);
//       }

//       state.step = 'awaiting_sl';
//       return; // 🔥 Remove the call to askStopLoss(chatId)

//     }

//     case 'awaiting_sl': {
//       state.step = 'awaiting_sl_price';
//       return bot.sendMessage(chatId, '🚨 Enter Stop Loss (SL) price:');
//     }

//     case 'awaiting_sl_price': {
//       const price = parseFloat(text);
//       if (isNaN(price)) return bot.sendMessage(chatId, '❌ Invalid price');

//       const totalQty = state.trade.quantityUSD;
//       state.trade.sl = {
//         price,
//         quantity: totalQty,
//       };

//       state.trade.tps = [];
//       state.step = 'awaiting_tp_1';
//       return bot.sendMessage(chatId, '🎯 Enter TP #1 price:');
//     }

//     // TP Price Entry (TP#1, TP#2, ...)
//     case /^awaiting_tp_\d+$/.test(state.step) && state.step: {
//       const tpIndex = parseInt(state.step.split('_')[2]);
//       const price = parseFloat(text);
//       if (isNaN(price)) return bot.sendMessage(chatId, '❌ Invalid TP price.');

//       state.currentTP = { price };
//       state.step = 'awaiting_tp_allocation_method';

//       return bot.sendMessage(chatId, `📊 Choose allocation method for TP #${tpIndex}:`, {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: '💯 Percentage', callback_data: 'tp_alloc_percent' }],
//             [{ text: '🔢 Quantity', callback_data: 'tp_alloc_quantity' }],
//           ]
//         }
//       });
//     }

//     case 'awaiting_tp_percent': {
//       const percent = parseFloat(text);
//       if (isNaN(percent) || percent <= 0 || percent > 100)
//         return bot.sendMessage(chatId, '❌ Enter valid % between 1–100');

//       const used = state.trade.tps?.reduce((sum, tp) => sum + (tp.allocation || 0), 0) || 0;
//       const total = used + percent;

//       if (total > 100)
//         return bot.sendMessage(chatId, `❌ Exceeds 100%. Already used: ${used}%.`);

//       const qty = parseFloat(((state.trade.quantityUSD || 0) * percent / 100).toFixed(2));

//       state.trade.tps.push({
//         price: state.currentTP.price,
//         allocation: percent,
//         quantity: qty,
//       });

//       if (total < 100) {
//         const nextTP = state.trade.tps.length + 1;
//         state.step = `awaiting_tp_${nextTP}`;
//         return bot.sendMessage(chatId, `🎯 Enter TP #${nextTP} price:`);
//       }

//       delete state.currentTP;
//       state.step = 'ask_open_img_confirm';
//       return askOpenImageConfirm(chatId);
//     }

//     case 'awaiting_tp_quantity': {
//       const qty = parseFloat(text);
//       if (isNaN(qty) || qty <= 0)
//         return bot.sendMessage(chatId, '❌ Invalid quantity.');

//       const totalQty = state.trade.quantityUSD || 0;
//       const used = state.trade.tps?.reduce((sum, tp) => sum + (tp.quantity || 0), 0) || 0;
//       const total = used + qty;

//       if (total > totalQty)
//         return bot.sendMessage(chatId, `❌ Exceeds total. Already used: ${used}`);

//       const alloc = parseFloat(((qty / totalQty) * 100).toFixed(2));

//       state.trade.tps.push({
//         price: state.currentTP.price,
//         quantity: qty,
//         allocation: alloc,
//       });

//       if (total < totalQty) {
//         const nextTP = state.trade.tps.length + 1;
//         state.step = `awaiting_tp_${nextTP}`;
//         return bot.sendMessage(chatId, `🎯 Enter TP #${nextTP} price:`);
//       }

//       delete state.currentTP;
//       state.step = 'ask_open_img_confirm';
//       return askOpenImageConfirm(chatId);
//     }

//   }
// });

// // Callback queries
// bot.on('callback_query', async (cb) => {
//   const chatId = cb.message.chat.id;
//   const state = userStates[chatId];
//   if (!state) return;

//   const data = cb.data;
//   if (data.startsWith('account_')) {
//     const acc = state.accounts[+data.split('_')[1]];
//     userStates[chatId] = {
//       ...state,
//       accountId: acc._id,
//       account: acc,
//       trade: {},
//       step: 'awaiting_symbol'
//     };
//     const syms = acc.symbols.map(s => [{ text: s, callback_data: `symbol_${s}` }]);
//     syms.push([{ text: 'Other', callback_data: 'symbol_other' }]);
//     return bot.sendMessage(chatId, 'Choose symbol:', { reply_markup: { inline_keyboard: syms } });
//   }

//   if (data.startsWith('symbol_')) {
//     const sym = data.split('_')[1];
//     if (sym === 'other') {
//       userStates[chatId].step = 'awaiting_custom_symbol';
//       return bot.sendMessage(chatId, 'Type your symbol:');
//     }
//     userStates[chatId].trade.symbol = sym;
//     return askDirection(chatId);
//   }

//   if (['long', 'short'].includes(data)) {
//     userStates[chatId].trade.direction = data;
//     userStates[chatId].step = 'awaiting_quantity';

//     const currency = state.account?.currency?.toUpperCase() || 'USD';
//     const symbolMap = {
//       USD: 'USD',
//       INR: 'INR',
//       EUR: 'EUR',
//       GBP: 'GBP'
//       // Add more if needed
//     };
//     const label = symbolMap[currency] || currency;

//     return bot.sendMessage(chatId, `💰 Enter quantity in ${label}:`);
//   }

//   if (['closed', 'running', 'quick'].includes(data)) {
//     userStates[chatId].trade.tradeStatus = data;
//     if (data === 'quick') return askQuickNext(chatId);
//     userStates[chatId].step = 'awaiting_entry_1';
//     return askEntries(chatId, 1);
//   }

//   if (data === 'open_img_yes') {
//     userStates[chatId].step = 'awaiting_open_img';
//     return bot.sendMessage(chatId, '📤 Please send the OPEN image now.');
//   }
//   if (data === 'open_img_no') {
//     return askCloseImageConfirm(chatId); // move to close image step
//   }

//   // Handle close image confirm
//   if (data === 'close_img_yes') {
//     userStates[chatId].step = 'awaiting_close_img';
//     return bot.sendMessage(chatId, '📤 Please send the CLOSE image now.');
//   }
//   if (data === 'close_img_no') {
//     userStates[chatId].step = 'awaiting_reason';
//     return askReason(chatId);
//   }

//   // 📅 Handle open date selection
//   if (data.startsWith('open_date_')) {
//     const selected = data.replace('open_date_', '');

//     if (selected === 'manual') {
//       userStates[chatId].step = 'awaiting_open_date_manual';
//       return bot.sendMessage(chatId, '📅 Please enter the open *date* in DD-MM-YYYY format:', {
//         parse_mode: 'Markdown'
//       });
//     }

//     // Preselected date like today/yesterday
//     userStates[chatId].trade.openTime = selected;
//     userStates[chatId].step = 'awaiting_open_time_choice';

//     const timeOptions = [
//       [{ text: '🕐 01:30 AM', callback_data: 'open_time_01:30 AM' }],
//       [{ text: '🕟 05:30 PM', callback_data: 'open_time_05:30 PM' }],
//       [{ text: '✍️ Enter manually', callback_data: 'open_time_manual' }]
//     ];

//     return bot.sendMessage(chatId, '⏰ Choose the *open time*:', {
//       parse_mode: 'Markdown',
//       reply_markup: { inline_keyboard: timeOptions }
//     });
//   }

//   // ⏰ Handle open time selection
//   if (data.startsWith('open_time_')) {
//     const timeStr = data.replace('open_time_', '');

//     if (timeStr === 'manual') {
//       userStates[chatId].step = 'awaiting_open_time_manual';
//       return bot.sendMessage(chatId, '⏰ Please enter open time in format *hh:mm AM/PM*:', {
//         parse_mode: 'Markdown'
//       });
//     }

//     // Append selected time to the stored open date
//     userStates[chatId].trade.openTime += ` ${timeStr}`;

//     const status = userStates[chatId].trade.tradeStatus;
//     if (status === 'closed' || status === 'quick') {
//       userStates[chatId].step = 'awaiting_close_date_choice';

//       const today = moment().format('DD-MM-YYYY');
//       const yesterday = moment().subtract(1, 'days').format('DD-MM-YYYY');
//       const dayBefore = moment().subtract(2, 'days').format('DD-MM-YYYY');

//       const buttons = [
//         [{ text: `Today (${today})`, callback_data: `close_date_${today}` }],
//         [{ text: `Yesterday (${yesterday})`, callback_data: `close_date_${yesterday}` }],
//         [{ text: `Day Before Yesterday (${dayBefore})`, callback_data: `close_date_${dayBefore}` }],
//         [{ text: '✍️ Enter manually', callback_data: 'close_date_manual' }],
//       ];

//       return bot.sendMessage(chatId, '📅 Select *close date*:', {
//         parse_mode: 'Markdown',
//         reply_markup: { inline_keyboard: buttons }
//       });
//     }

//     if (data === 'alloc_percent') {
//       state.allocationMode = 'percent';
//       state.step = 'awaiting_allocation_value';
//       return bot.sendMessage(chatId, 'Enter allocation % for this entry:');
//     }

//     if (data === 'alloc_currency') {
//       state.allocationMode = 'currency';
//       const curr = state.account?.currency || 'USD';
//       state.step = 'awaiting_allocation_value';
//       return bot.sendMessage(chatId, `Enter allocation in ${curr}:`);
//     }

//     if (data === 'tp_alloc_percent') {
//       userStates[chatId].tpMode = 'percent';
//       userStates[chatId].step = 'awaiting_tp_alloc_value';
//       return bot.sendMessage(chatId, 'Enter allocation % for this TP:');
//     }

//     if (data === 'tp_alloc_qty') {
//       const currency = userStates[chatId].account?.currency || 'USD';
//       userStates[chatId].tpMode = 'qty';
//       userStates[chatId].step = 'awaiting_tp_alloc_value';
//       return bot.sendMessage(chatId, `Enter allocation in ${currency}:`);
//     }

//     // Running trade: skip close date/time
//     userStates[chatId].step = 'ask_open_img_confirm';
//     return askOpenImageConfirm(chatId);
//   }

//   // 📅 Handle close date selection
//   if (data.startsWith('close_date_')) {
//     const selected = data.replace('close_date_', '');

//     if (selected === 'manual') {
//       userStates[chatId].step = 'awaiting_close_date_manual';
//       return bot.sendMessage(chatId, '📅 Please enter the close *date* in DD-MM-YYYY format:', {
//         parse_mode: 'Markdown'
//       });
//     }

//     userStates[chatId].trade.closeTime = selected;
//     userStates[chatId].step = 'awaiting_close_time_choice';

//     const closeTimeOptions = [
//       [{ text: '🕐 01:30 AM', callback_data: 'close_time_01:30 AM' }],
//       [{ text: '🕟 05:30 PM', callback_data: 'close_time_05:30 PM' }],
//       [{ text: '✍️ Enter manually', callback_data: 'close_time_manual' }]
//     ];

//     return bot.sendMessage(chatId, '⏰ Choose the *close time*:', {
//       parse_mode: 'Markdown',
//       reply_markup: { inline_keyboard: closeTimeOptions }
//     });
//   }

//   // ⏰ Handle close time selection
//   if (data.startsWith('close_time_')) {
//     const timeStr = data.replace('close_time_', '');

//     if (timeStr === 'manual') {
//       userStates[chatId].step = 'awaiting_close_time_manual';
//       return bot.sendMessage(chatId, '⏰ Please enter close time in format *hh:mm AM/PM*:', {
//         parse_mode: 'Markdown'
//       });
//     }

//     // Append selected time to stored close date
//     userStates[chatId].trade.closeTime += ` ${timeStr}`;
//     userStates[chatId].step = 'ask_open_img_confirm';
//     return askOpenImageConfirm(chatId);
//   }

//   // Handle reason selection
//   if (data.startsWith('reason_')) {
//     const reason = data.replace('reason_', '');
//     if (reason === 'other') {
//       userStates[chatId].step = 'awaiting_reason_manual';
//       return bot.sendMessage(chatId, '✍️ Please type your reason:');
//     }

//     userStates[chatId].trade.reason = [reason];
//     userStates[chatId].step = 'awaiting_mood';
//     return askMood(chatId);
//   }

//   if (data.startsWith('mood_')) {
//     const mood = data.replace('mood_', '');
//     if (mood === 'other') {
//       userStates[chatId].step = 'awaiting_mood_manual';
//       return bot.sendMessage(chatId, '✍️ Type your mood:');
//     }

//     userStates[chatId].trade.mood = mood.charAt(0).toUpperCase() + mood.slice(1);
//     userStates[chatId].step = 'awaiting_rules';
//     return askRulesFollowed(chatId);
//   }

//   if (data === 'rules_yes' || data === 'rules_no') {
//     userStates[chatId].trade.rulesFollowed = data === 'rules_yes';
//     userStates[chatId].step = 'awaiting_learnings_choice';

//     return bot.sendMessage(chatId, '📚 Any learnings from this trade?', {
//       reply_markup: {
//         inline_keyboard: [
//           [
//             { text: 'Yes', callback_data: 'learnings_yes' },
//             { text: 'No', callback_data: 'learnings_no' }
//           ]
//         ]
//       }
//     });
//   }

//   if (data === 'learnings_yes') {
//     userStates[chatId].step = 'awaiting_learnings';
//     return bot.sendMessage(chatId, '✍️ Please type your learnings:');
//   }

//   if (data === 'learnings_no') {
//     if (!userStates[chatId]) userStates[chatId] = {};
//     if (!userStates[chatId].trade) userStates[chatId].trade = {};

//     userStates[chatId].trade.learnings = '';
//     return finalizeTrade(chatId);
//   }

//   if (state.step.startsWith('awaiting_entry') && state.step.endsWith('allocation_method')) {
//     const index = (state.trade.entries?.length || 0) + 1;

//     if (data === 'entry_alloc_percent') {
//       state.step = `awaiting_entry_${index}_percent`;
//       return bot.sendMessage(chatId, '📊 Enter allocation in % (e.g. 25):');
//     }

//     if (data === 'entry_alloc_quantity') {
//       const currency = state.account?.currency || 'USD';
//       state.step = `awaiting_entry_${index}_quantity`;
//       return bot.sendMessage(chatId, `💰 Enter allocation in ${currency} (e.g. 300):`);
//     }
//   }

//   if (state.step === 'awaiting_tp_allocation_method') {
//     if (data === 'tp_alloc_percent') {
//       state.step = 'awaiting_tp_percent';
//       return bot.sendMessage(chatId, '💯 Enter allocation % for this TP:');
//     }

//     if (data === 'tp_alloc_quantity') {
//       const currency = state.account?.currency?.toUpperCase() || 'USD';
//       state.step = 'awaiting_tp_quantity';
//       return bot.sendMessage(chatId, `🔢 Enter quantity in ${currency}:`);
//     }

//   }

// });

// bot.on('photo', async (msg) => {
//   const chatId = msg.chat.id;
//   const state = userStates[chatId];
//   if (!state || !['awaiting_open_img', 'awaiting_close_img'].includes(state.step)) return;

//   const file = msg.photo[msg.photo.length - 1]; // Highest resolution
//   const fileLink = await bot.getFileLink(file.file_id);
//   const imageUrl = await uploadToCloud(fileLink);

//   if (!imageUrl) {
//     return bot.sendMessage(chatId, '❌ Failed to upload image. Try again.');
//   }

//   if (state.step === 'awaiting_open_img') {
//     state.trade.openImageUrl = imageUrl;
//     state.step = 'ask_close_img_confirm';
//     return askCloseImageConfirm(chatId); // Correct next step
//   }

//   if (state.step === 'awaiting_close_img') {
//     state.trade.closeImageUrl = imageUrl;
//     state.step = 'awaiting_reason';
//     return askReason(chatId);
//   }
// });

// // --- Helper Functions ---
// const askOpenImageConfirm = (chatId) => {
//   userStates[chatId].step = 'ask_open_img_confirm';
//   return bot.sendMessage(chatId, '📸 Do you want to upload an OPEN image?', {
//     reply_markup: {
//       inline_keyboard: [
//         [{ text: '✅ Yes', callback_data: 'open_img_yes' }],
//         [{ text: '❌ No', callback_data: 'open_img_no' }]
//       ]
//     }
//   });
// };

// const askCloseImageConfirm = (chatId) => {
//   userStates[chatId].step = 'ask_close_img_confirm';
//   return bot.sendMessage(chatId, '📸 Do you want to upload a CLOSE image?', {
//     reply_markup: {
//       inline_keyboard: [
//         [{ text: '✅ Yes', callback_data: 'close_img_yes' }],
//         [{ text: '❌ No', callback_data: 'close_img_no' }]
//       ]
//     }
//   });
// };

// const askMood = (chatId) => {
//   userStates[chatId].step = 'awaiting_mood';
//   const moods = ['Confident', 'Fear', 'Greedy', 'Overconfident', 'Anxious', 'Calm'];
//   const buttons = moods.map(m => [{ text: m, callback_data: `mood_${m.toLowerCase()}` }]);
//   buttons.push([{ text: '📝 Other', callback_data: 'mood_other' }]);

//   return bot.sendMessage(chatId, '😶‍🌫️ What was your mood during the trade?', {
//     reply_markup: { inline_keyboard: buttons }
//   });
// };

// const askRulesFollowed = (chatId) => {
//   userStates[chatId].step = 'awaiting_rules';
//   return bot.sendMessage(chatId, '📏 Did you follow your rules for this trade?', {
//     reply_markup: {
//       inline_keyboard: [
//         [{ text: '✅ Yes', callback_data: 'rules_yes' }],
//         [{ text: '❌ No', callback_data: 'rules_no' }]
//       ]
//     }
//   });
// };

// const askDirection = (chatId) => {
//   userStates[chatId].step = 'awaiting_direction';
//   return bot.sendMessage(chatId, '📈 Choose the trade direction:', {
//     reply_markup: {
//       inline_keyboard: [
//         [{ text: '📈 Long', callback_data: 'long' }, { text: '📉 Short', callback_data: 'short' }]
//       ]
//     }
//   });
// };

// const askTradeStatus = (chatId) => {
//   userStates[chatId].step = 'awaiting_trade_status';
//   return bot.sendMessage(chatId, '⚙️ Choose trade status:', {
//     reply_markup: {
//       inline_keyboard: [
//         [{ text: '📕 Closed', callback_data: 'closed' }],
//         [{ text: '📘 Running', callback_data: 'running' }],
//         [{ text: '⚡ Quick', callback_data: 'quick' }]
//       ]
//     }
//   });
// };

// const askQuickNext = (chatId) => {
//   userStates[chatId].step = 'awaiting_pnl';
//   return bot.sendMessage(chatId, '💸 Enter PnL value for this quick trade (e.g., 120 or -30):');
// };

// const askEntries = (chatId, i) => {
//   userStates[chatId].step = `awaiting_entry_${i}`;
//   return bot.sendMessage(chatId, `📥 Enter entry price #${i}:`);
// };

// const askReason = (chatId) => {
//   const acc = userStates[chatId].account;
//   const reasons = (acc?.reasons || []).filter(Boolean);
//   const buttons = reasons.map(r => [{ text: r, callback_data: `reason_${r}` }]);

//   buttons.push([{ text: '📝 Other', callback_data: 'reason_other' }]);

//   userStates[chatId].step = 'awaiting_reason';
//   return bot.sendMessage(chatId, '🧠 Select a reason for taking this trade:', {
//     reply_markup: { inline_keyboard: buttons }
//   });
// };

// const finalizeTrade = async (chatId) => {
//   const st = userStates[chatId];
//   const t = st.trade;

//   // Format dates
//   const openMoment = moment(t.openTime, 'DD-MM-YYYY hh:mm A');
//   const openTimeFormatted = openMoment.toDate();
//   let closeTimeFormatted = null;

//   if (t.closeTime) {
//     const closeMoment = moment(t.closeTime, 'DD-MM-YYYY hh:mm A');
//     closeTimeFormatted = closeMoment.toDate();
//   }

//   const avgEntryPrice = t.avgEntryPrice || 0;
//   const avgExitPrice = t.avgExitPrice || null;
//   const avgTPPrice = t.avgTPPrice || null;
//   const feeType = t.feeType || '$';
//   const feeAmount = parseFloat(t.feeAmount || 0);
//   const feeValue = parseFloat(t.feeValue || 0);
//   const pnl = parseFloat(t.pnl || 0);
//   const expectedProfit = parseFloat(t.expectedProfit || pnl);
//   const expectedLoss = parseFloat(t.expectedLoss || 0);
//   const rr = t.rr || 0;
//   const duration = t.duration || 0;

//   const payload = {
//     symbol: t.symbol,
//     direction: t.direction,
//     quantityUSD: t.quantityUSD,
//     tradeStatus: t.tradeStatus,
//     openTime: openTimeFormatted,
//     closeTime: closeTimeFormatted,
//     openImageUrl: t.openImageUrl || '',
//     closeImageUrl: t.closeImageUrl || '',
//     entries: t.entries || [],
//     exits: t.exits || [],
//     sl: t.sl || { price: 0, percentage: 0, quantity: t.quantityUSD },
//     tps: t.tps || [],
//     pnl,
//     rulesFollowed: t.rulesFollowed ?? true,
//     reason: Array.isArray(t.reason) ? t.reason : [t.reason],
//     mood: t.mood || '',
//     learnings: t.learnings || '',
//     avgEntryPrice,
//     avgExitPrice,
//     avgTPPrice,
//     feeType,
//     feeAmount,
//     feeValue,
//     expectedProfit,
//     expectedLoss,
//     rr,
//     duration
//   };

//   try {
//     await axios.post('http://localhost:5000/api/trades/add', payload, {
//       headers: {
//         Cookie: `userId=${st.userId}; accountId=${st.accountId}`,
//         'Content-Type': 'application/json'
//       }
//     });

//     // 🔁 Generate a new 5-digit code only after a trade is submitted
//     st.lastTelegramCode = Math.floor(10000 + Math.random() * 90000);
//     const updateUrl = `https://poor-colts-beam.loca.lt/?telegram=${st.lastTelegramCode}`;

//     bot.sendMessage(chatId, '✅ Trade logged successfully!', {
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: '🔄 Update on Website', url: updateUrl }]
//         ]
//       }
//     });
//   } catch (error) {
//     //     bot.sendMessage(chatId, '❌ Failed to save trade—please try again.');
//   }

//   // Clear trade data but keep lastTelegramCode
//   delete st.trade;
// };
