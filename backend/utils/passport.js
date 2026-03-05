const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const Account = require("../models/Account");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5001/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          const now = new Date();
          const expiry = new Date(now);
          expiry.setDate(expiry.getDate() + 7);

          // ✅ Create user
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            password: undefined,
            googleId: profile.id,
            subscriptionPlan: "pro",
            subscriptionStatus: "active",
            subscriptionType: "one-time",
            subscriptionStartAt: now,
            subscriptionExpiresAt: expiry,
            subscriptionCreatedAt: now,
            isVerified: true,
          });

          // ✅ Create default journal account
          const defaultAccount = new Account({
            userId: user._id,
            name: "Default Journal",
            currency: "USD", // or detect by IP later if you want
            startingBalance: {
              amount: 0,
              time: new Date(),
            },
          });

          await defaultAccount.save();

          // attach account to user object for callback
          user.defaultAccountId = defaultAccount._id;
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
