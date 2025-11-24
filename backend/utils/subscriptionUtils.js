// utils/subscriptionUtils.js

function computeSubscriptionStatus(user) {
  const now = new Date();

  // No subscription at all
  if (!user.subscriptionStartAt && !user.subscriptionExpiresAt) {
    return { status: "none" };
  }

  // Free trial
  if (
    user.subscriptionType === "free-trial" ||
    user.subscriptionType === "trial"
  ) {
    if (new Date(user.subscriptionExpiresAt) > now) {
      return { status: "trial" };
    } else {
      return { status: "expired" };
    }
  }

  // Lifetime plans
  if (
    user.subscriptionType === "one-time" ||
    user.subscriptionType === "lifetime"
  ) {
    return { status: "active" }; // lifetime never expires
  }

  // Recurring plans
  if (user.subscriptionType === "recurring") {
    if (new Date(user.subscriptionExpiresAt) > now) {
      return { status: "active" };
    } else {
      return { status: "expired" };
    }
  }

  return { status: "none" };
}

module.exports = { computeSubscriptionStatus };
