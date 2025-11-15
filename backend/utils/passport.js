const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

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
        // Check if user exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          const now = new Date();
          const expiry = new Date(now);
          expiry.setDate(expiry.getDate() + 7); // 7-day free plan

          // Create new Google user with subscription info
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            password: undefined, // Google signup
            googleId: profile.id,
            subscriptionPlan: "PRO001",
            subscriptionStatus: "active",
            subscriptionType: "trial",
            subscriptionStartAt: now,
            subscriptionExpiresAt: expiry,
            subscriptionCreatedAt: now,
            isVerified: true, // you can mark Google users as verified immediately
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
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
