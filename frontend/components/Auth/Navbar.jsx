"use client"; // for Next.js App Router (if using hooks)

import React, { useState } from "react";
import Link from "next/link";

const Navbar = () => {

  return (
    <>
    <div className="navbarAuth flexRow gap_4">
        <span>Journal</span>
        <span style={{color:'#FDDA70',fontSize:'24px',fontWeight:'900'}}>X</span>
    </div>
    </>
  );
};

export default Navbar;
