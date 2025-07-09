import React from "react";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 overflow-hidden">
      {/* SVG Wave Background */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <path fill="#174ea6" fillOpacity="0.3" d="M0,320L80,293.3C160,267,320,213,480,197.3C640,181,800,203,960,229.3C1120,256,1280,288,1360,304L1440,320L1440,600L1360,600C1280,600,1120,600,960,600C800,600,640,600,480,600C320,600,160,600,80,600L0,600Z" />
        <path fill="#2563eb" fillOpacity="0.2" d="M0,400L80,373.3C160,347,320,293,480,277.3C640,261,800,283,960,309.3C1120,336,1280,368,1360,384L1440,400L1440,600L1360,600C1280,600,1120,600,960,600C800,600,640,600,480,600C320,600,160,600,80,600L0,600Z" />
      </svg>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full">
        <h1 className="text-white text-7xl md:text-8xl font-extrabold tracking-tight mb-4 drop-shadow-lg">SOE</h1>
        <h2 className="text-white text-2xl md:text-3xl font-medium mb-8 text-center drop-shadow">
          Your Enterprise<br className="hidden md:block" /> Decision Layer
        </h2>
        <Link
          href="/auth"
          className="bg-white text-blue-900 font-semibold text-lg px-8 py-3 rounded-full shadow-lg hover:bg-blue-100 transition mb-16"
        >
          Get Started
        </Link>
      </div>

      {/* Tagline at the bottom */}
      <div className="relative z-10 w-full flex justify-center pb-8">
        <p className="text-blue-100 text-base md:text-lg text-center">
          Transform your business decision making with AI-powered insights
        </p>
      </div>
    </div>
  );
}