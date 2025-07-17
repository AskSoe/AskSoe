import React, { useState } from "react";
import { FaSalesforce, FaSlack, FaGoogleDrive, FaRegCopyright } from "react-icons/fa";
import { SiNotion } from "react-icons/si";
import { FiLinkedin, FiMail } from "react-icons/fi";

const SYSTEMS = [
  { name: "Salesforce", icon: <FaSalesforce className="text-blue-400" size={32} /> },
  { name: "Slack", icon: <FaSlack className="text-purple-400" size={32} /> },
  { name: "Google Drive", icon: <FaGoogleDrive className="text-green-400" size={32} /> },
  { name: "Notion", icon: <SiNotion className="text-black dark:text-white" size={32} /> },
];

export default function LandingPage() {
  const [form, setForm] = useState({
    name: "",
    jobTitle: "",
    email: "",
    systemsUsed: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-cream-100 font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 w-full bg-gradient-to-r from-blue-900/90 to-blue-800/90 backdrop-blur flex items-center justify-between px-6 py-4 shadow-md">
        <div className="flex items-center gap-2">
          <img src="/images/soe-logo.png" alt="SOE Logo" className="h-8 w-8 mr-2" />
          <span className="text-2xl font-extrabold tracking-tight text-cream-100">SOE</span>
        </div>
        <a href="#waitlist" className="bg-cream-100 text-blue-900 font-semibold px-5 py-2 rounded-full shadow hover:bg-cream-200 transition">Join Waitlist</a>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center flex-1 py-16 px-4 relative overflow-hidden">
        {/* Optional animated background */}
        <div className="absolute inset-0 pointer-events-none select-none z-0">
          <svg className="w-full h-full" viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <defs>
              <linearGradient id="bgwave" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#174ea6" stopOpacity="0.3" />
                <stop offset="1" stopColor="#2563eb" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path fill="url(#bgwave)" d="M0,320L80,293.3C160,267,320,213,480,197.3C640,181,800,203,960,229.3C1120,256,1280,288,1360,304L1440,320L1440,600L1360,600C1280,600,1120,600,960,600C800,600,640,600,480,600C320,600,160,600,80,600L0,600Z" />
            <path fill="url(#bgwave)" d="M0,400L80,373.3C160,347,320,293,480,277.3C640,261,800,283,960,309.3C1120,336,1280,368,1360,384L1440,400L1440,600L1360,600C1280,600,1120,600,960,600C800,600,640,600,480,600C320,600,160,600,80,600L0,600Z" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col items-center w-full">
          <h1 className="text-4xl md:text-6xl font-extrabold text-cream-100 text-center drop-shadow-lg mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Ask anything. Get answers from every system.
          </h1>
          <p className="text-lg md:text-2xl text-cream-200 text-center max-w-2xl mb-8">
            SOE connects your business tools — like Salesforce, Slack, Notion, and more — into one intelligent assistant.
          </p>
          <a href="#waitlist" className="bg-cream-100 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:bg-cream-200 hover:text-blue-900 transition text-lg mb-8">Join the Waitlist</a>
          {/* Logos/graphic */}
          <div className="flex flex-wrap gap-6 items-center justify-center mb-8">
            {SYSTEMS.map((sys) => (
              <div key={sys.name} className="bg-white rounded-full p-5 shadow-xl border-4 border-blue-200 flex items-center justify-center transition-transform duration-200 hover:scale-110">
                {React.cloneElement(sys.icon, { size: 40 })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-3xl mx-auto py-12 px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-cream-100 text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-blue-800/80 rounded-xl p-6 text-center shadow">
            <div className="text-4xl mb-2">🔗</div>
            <h3 className="font-semibold text-lg mb-2">Connect your tools</h3>
            <p className="text-cream-200">Easily link Salesforce, Slack, Notion, and more.</p>
          </div>
          <div className="bg-blue-800/80 rounded-xl p-6 text-center shadow">
            <div className="text-4xl mb-2">💬</div>
            <h3 className="font-semibold text-lg mb-2">Ask in plain English</h3>
            <p className="text-cream-200">No jargon. Just ask questions and get instant answers.</p>
          </div>
          <div className="bg-blue-800/80 rounded-xl p-6 text-center shadow">
            <div className="text-4xl mb-2">⚡</div>
            <h3 className="font-semibold text-lg mb-2">Get answers instantly</h3>
            <p className="text-cream-200">See links, context, and take action right away.</p>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-8 px-4 bg-blue-900/80">
        <h3 className="text-center text-lg font-semibold text-cream-100 mb-4">Works with your favorite tools</h3>
        <div className="flex flex-wrap gap-8 items-center justify-center">
          {SYSTEMS.map((sys) => (
            <div key={sys.name} className="bg-white/90 rounded-full p-3 shadow flex items-center justify-center">
              {sys.icon}
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist Form */}
      <section id="waitlist" className="max-w-lg mx-auto py-16 px-4 w-full">
        <h2 className="text-2xl md:text-3xl font-bold text-cream-100 text-center mb-6">Join the Waitlist</h2>
        {success ? (
          <div className="bg-green-100 text-green-900 rounded-lg p-6 text-center font-semibold shadow">
            Thanks for joining! We'll be in touch soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-blue-800/80 rounded-xl p-8 shadow flex flex-col gap-5">
            <input
              type="text"
              name="name"
              required
              placeholder="Full Name"
              className="rounded px-4 py-3 bg-cream-100 text-blue-900 placeholder:text-blue-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.name}
              onChange={handleChange}
            />
            <input
              type="text"
              name="jobTitle"
              placeholder="Job Title"
              className="rounded px-4 py-3 bg-cream-100 text-blue-900 placeholder:text-blue-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.jobTitle}
              onChange={handleChange}
            />
            <input
              type="email"
              name="email"
              required
              placeholder="Work Email"
              className="rounded px-4 py-3 bg-cream-100 text-blue-900 placeholder:text-blue-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.email}
              onChange={handleChange}
            />
            <input
              type="text"
              name="systemsUsed"
              placeholder="Which tools do you use most? (e.g. Salesforce, Slack)"
              className="rounded px-4 py-3 bg-cream-100 text-blue-900 placeholder:text-blue-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.systemsUsed}
              onChange={handleChange}
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number (optional)"
              className="rounded px-4 py-3 bg-cream-100 text-blue-900 placeholder:text-blue-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.phone}
              onChange={handleChange}
            />
            {error && <div className="text-red-200 text-center font-semibold">{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-cream-100 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:bg-cream-200 hover:text-blue-900 transition text-lg mt-2 disabled:opacity-60"
            >
              {submitting ? "Joining..." : "Join the Waitlist"}
            </button>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer className="w-full py-6 px-4 bg-blue-900/90 flex flex-col md:flex-row items-center justify-between gap-4 text-cream-200 text-sm mt-auto">
        <div className="flex items-center gap-2">
          <a href="https://linkedin.com/in/dangshaw" target="_blank" rel="noopener noreferrer" className="hover:text-cream-100"><FiLinkedin size={20} /></a>
          <a href="mailto:dangshaw@gmail.com" className="hover:text-cream-100"><FiMail size={20} /></a>
        </div>
        <div className="flex items-center gap-1">
          <FaRegCopyright />
          <span>{new Date().getFullYear()} SOE. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}