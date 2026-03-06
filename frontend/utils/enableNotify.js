export const enableNotifications = async () => {
  if (!("Notification" in window)) return;

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    console.log("Notifications enabled");
  }
};
