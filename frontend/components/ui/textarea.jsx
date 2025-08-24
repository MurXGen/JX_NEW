import React from "react";

export const Textarea = ({ className = "", ...props }) => {
  return (
    <textarea
      className={`w-full p-2 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none ${className}`}
      {...props}
    />
  );
};
