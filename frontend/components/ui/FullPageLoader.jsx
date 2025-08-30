import React from "react";
import { Loader2 } from "lucide-react";

const FullPageLoader = () => {
  return (
    <div className="fullpageLoader">
      <Loader2 className="spinner" />
    </div>
  );
};

export default FullPageLoader;
