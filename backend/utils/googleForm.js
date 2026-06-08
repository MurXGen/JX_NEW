// utils/googleForm.js

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSc2a9NsuUaO9fSUYHyYH-vTvHW4v2u6qGlI_vcMFWsS-_ap2A/viewform?usp=header";

// Field IDs from your Google Form (replace with actual IDs)
const FORM_FIELD_IDS = {
  pincode: "entry.123456789",
  city: "entry.987654321",
  state: "entry.111111111",
  phone: "entry.222222222",
  submissionType: "entry.333333333",
  timestamp: "entry.444444444",
  userAgent: "entry.555555555",
  referrer: "entry.666666666",
};

// Submit data to Google Form
export const submitToGoogleForm = async (formData) => {
  try {
    const params = new URLSearchParams();

    Object.keys(formData).forEach((key) => {
      if (FORM_FIELD_IDS[key] && formData[key]) {
        params.append(FORM_FIELD_IDS[key], formData[key]);
      }
    });

    // Use no-cors to avoid CORS issues
    const response = await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    // With no-cors, response is opaque, so we assume success
    console.log("Submitted to Google Form:", formData);
    return { success: true };
  } catch (error) {
    console.error("Error submitting to Google Form:", error);
    return { success: false, error };
  }
};

// Track pincode submission
export const trackPincodeToGoogleForm = async (data) => {
  const formData = {
    pincode: data.pincode,
    city: data.city || "",
    state: data.state || "",
    phone: data.phone || "",
    submissionType: data.type || "submit", // submit, skip, auto_filled, outside_click
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    referrer: typeof document !== "undefined" ? document.referrer : "",
  };

  // Also send to GA for analytics
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "pincode_google_form", {
      event_category: "pincode",
      event_label: data.type,
      pincode: data.pincode,
      city: data.city,
      state: data.state,
    });
  }

  return submitToGoogleForm(formData);
};
