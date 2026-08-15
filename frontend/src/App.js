import { useEffect, useMemo, useState, useRef, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { motion, useInView, useMotionValue, useSpring, useTransform, useScroll, useReducedMotion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpRight, BarChart3, Bell, BookOpen, Check, ChevronRight, CircleDollarSign, CreditCard, Eye, EyeOff, FileText, Gift, Globe2, Home, Landmark, LayoutDashboard, LogOut, Menu, Moon, MoreHorizontal, Pencil, Plus, Receipt, Search, Settings, Shield, ShieldCheck, Sparkles, Sun, Target, Trash2, TrendingUp, UserRound, Wallet, X, LockKeyhole, Zap } from "lucide-react";
import { Toaster, toast } from "sonner";
import "@/App.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const api = axios.create({ baseURL: API, withCredentials: true });
const AuthContext = createContext(null);
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatApiError = (detail) => Array.isArray(detail) ? detail.map((e) => e?.msg || JSON.stringify(e)).join(" ") : detail || "Something went wrong. Please try again.";

function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(false)).finally(() => setChecking(false)); }, []);
  const signOut = async () => { await api.post("/auth/logout").catch(() => {}); setUser(false); };
  return <AuthContext.Provider value={{ user, setUser, signOut, checking }}>{children}</AuthContext.Provider>;
}

const Logo = ({ light = false }) => <Link to="/" className={`brand ${light ? "brand-light" : ""}`} data-testid="securefin-logo"><span className="brand-mark"><ShieldCheck size={19} /></span><span>Secure<span>Fin</span></span></Link>;

function WordReveal({ text, className = "", delay = 0 }) {
  const words = text.split(" ");
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{words.map((w, i) => <span key={i} className="reveal-word">{w}</span>)}</span>;
  return <span className={className}>{words.map((w, i) => <motion.span key={i} className="reveal-word" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + i * 0.08, duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>{w}</motion.span>)}</span>;
}

function RevealOnScroll({ children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.2, margin: "0px 0px -80px 0px" });
  const reduce = useReducedMotion();
  const hidden = { opacity: 0, y: 30 };
  const shown = { opacity: 1, y: 0 };
  if (reduce) return <div ref={ref}>{children}</div>;
  return <motion.div ref={ref} initial={hidden} animate={inView ? shown : hidden} transition={{ delay, duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>{children}</motion.div>;
}

function InViewMotion({ as = "div", children, initial, whileInView, transition, className, style, testid, once = true, amount = 0.2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, amount, margin: "0px 0px -60px 0px" });
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag ref={ref} className={className} style={style} data-testid={testid}>{children}</Tag>;
  }
  return <MotionTag ref={ref} initial={initial} animate={inView ? whileInView : initial} transition={transition} className={className} style={style} data-testid={testid}>{children}</MotionTag>;
}

function CursorTrail() {
  const reduce = useReducedMotion();
  const x = useMotionValue(-200); const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 140, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 140, damping: 22, mass: 0.6 });
  const sx2 = useSpring(x, { stiffness: 60, damping: 18, mass: 1 });
  const sy2 = useSpring(y, { stiffness: 60, damping: 18, mass: 1 });
  useEffect(() => {
    if (reduce) return;
    const handler = (e) => { x.set(e.clientX); y.set(e.clientY); };
    const leave = () => { x.set(-500); y.set(-500); };
    window.addEventListener("mousemove", handler);
    window.addEventListener("mouseleave", leave);
    return () => { window.removeEventListener("mousemove", handler); window.removeEventListener("mouseleave", leave); };
  }, [x, y, reduce]);
  if (reduce) return null;
  return <>
    <motion.div className="cursor-aurora cursor-aurora-1" style={{ x: sx2, y: sy2 }} aria-hidden />
    <motion.div className="cursor-aurora cursor-aurora-2" style={{ x: sx, y: sy }} aria-hidden />
  </>;
}

function useMouseParallax(strength = 20) {
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 60, damping: 20 }); const sy = useSpring(y, { stiffness: 60, damping: 20 });
  const tx = useTransform(sx, [-1, 1], [-strength, strength]);
  const ty = useTransform(sy, [-1, 1], [-strength, strength]);
  useEffect(() => {
    const handler = (e) => { const nx = (e.clientX / window.innerWidth) * 2 - 1; const ny = (e.clientY / window.innerHeight) * 2 - 1; x.set(nx); y.set(ny); };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [x, y]);
  return { x: tx, y: ty };
}

function Landing() {
  const navigate = useNavigate();
  const features = [
    { icon: Wallet, title: "Financial clarity", text: "Bring spending, investments, subscriptions and budgets into one calm workspace." },
    { icon: ShieldCheck, title: "Security, built in", text: "Understand your account health and strengthen the digital life around your money." },
    { icon: TrendingUp, title: "Useful momentum", text: "Turn real activity into clearer trends, useful insights and better next decisions." }
  ];
  const parallax = useMouseParallax(14);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className="landing-page">
    <CursorTrail />
    <motion.nav className={`landing-nav ${scrolled ? "is-scrolled" : ""}`} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <Logo />
      <div className="landing-links nav-pill">
        <a href="#home" className="active" data-testid="nav-home">Home</a>
        <a href="#features" data-testid="nav-features">Features</a>
        <a href="#security" data-testid="nav-security">Security</a>
        <a href="#how-it-works" data-testid="nav-how-it-works">How it works</a>
      </div>
      <div className="nav-actions">
        <button className="text-button" onClick={() => navigate("/auth?mode=login")} data-testid="nav-sign-in">Sign in</button>
        <button className="button button-primary" onClick={() => navigate("/auth?mode=register")} data-testid="nav-get-started">Get started <ArrowUpRight size={15} /></button>
      </div>
    </motion.nav>
    <main>
      <section className="hero-section" id="home">
        <div className="hero-city" aria-hidden>
          <div className="hero-city-img" />
          <div className="hero-city-veil" />
        </div>
        <div className="hero-copy">
          <motion.div className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }}>
            <span className="eyebrow-dot" /> Finance, with a stronger lock
          </motion.div>
          <h1>
            <WordReveal text="Your money." delay={0.35} />
            <br />
            <em><WordReveal text="Secured by design." delay={0.75} /></em>
          </h1>
          <motion.p initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 1.35, duration: 0.9 }}>
            Track your spending, investments and financial goals in one secure workspace — built with your digital security in mind.
          </motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.55, duration: 0.7 }}>
            <button className="button button-primary button-large" onClick={() => navigate("/auth?mode=register")} data-testid="hero-get-started">
              Get started <span className="arrow-orb"><ArrowUpRight size={16} /></span>
            </button>
            <a className="button button-ghost button-large" href="#features" data-testid="hero-explore-features">Explore SecureFin <ChevronRight size={17} /></a>
          </motion.div>
          <motion.div className="hero-trust" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.9 }}>
            <div className="avatar-stack"><span>AS</span><span>RK</span><span>NM</span></div>
            <span><strong>Built for peace of mind</strong><br />Your money and security, together</span>
          </motion.div>
        </div>
        <DashboardPreview parallax={parallax} />
      </section>
      <section className="trust-strip" id="security">
        <div><LockKeyhole size={18} /><strong>Security shouldn&apos;t be an afterthought.</strong></div>
        <span><Check size={15} /> Password protection</span>
        <span><Check size={15} /> Secure authentication</span>
        <span><Check size={15} /> Privacy-focused design</span>
        <span><Check size={15} /> Protected API access</span>
      </section>
      <section className="feature-section section-shell" id="features">
        <RevealOnScroll>
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> One calm command center</div>
              <h2>Everything important.<br /><em>Nothing unnecessary.</em></h2>
            </div>
            <p>See the complete picture without losing sight of what matters most: your next good decision.</p>
          </div>
        </RevealOnScroll>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text }, i) => (
            <RevealOnScroll key={title} delay={i * 0.1}>
              <motion.article className="feature-card" whileHover={{ y: -6 }} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`); }} data-testid={`feature-card-${title.toLowerCase().replaceAll(" ", "-")}`}>
                <div className="feature-icon"><Icon size={20} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="feature-arrow"><ArrowUpRight size={16} /></span>
              </motion.article>
            </RevealOnScroll>
          ))}
        </div>
      </section>
      <section className="steps-section" id="how-it-works">
        <div className="section-shell">
          <RevealOnScroll>
            <div className="eyebrow"><span className="eyebrow-dot" /> A better rhythm</div>
            <h2>Three steps to a clearer<br /><em>financial life.</em></h2>
          </RevealOnScroll>
          <div className="steps-grid">
            {[
              { n: "01", h: "Create your secure account", p: "Start with a private workspace built around your financial life." },
              { n: "02", h: "Track and organize", p: "Add activity once, then let SecureFin keep the details easy to find." },
              { n: "03", h: "Build better habits", p: "Monitor financial health and the security behind the account." }
            ].map((s, i) => (
              <RevealOnScroll key={s.n} delay={i * 0.12}>
                <div className="step"><span>{s.n}</span><h3>{s.h}</h3><p>{s.p}</p></div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>
      <section className="security-section section-shell">
        <RevealOnScroll>
          <div className="security-panel">
            <div className="security-orbit"><Shield size={62} /></div>
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> The SecureFin difference</div>
              <h2>Your financial data deserves<br /><em>more than a password.</em></h2>
              <p>SecureFin keeps protection close to the decisions you make every day — from hashed credentials to protected routes and clear security activity.</p>
              <div className="security-points">
                <span><Check size={14} /> Password hashing</span>
                <span><Check size={14} /> Input validation</span>
                <span><Check size={14} /> Secure logout</span>
                <span><Check size={14} /> Session awareness</span>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>
      <section className="cta-section">
        <div className="section-shell cta-inner">
          <RevealOnScroll>
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> Start from a stronger place</div>
              <h2>Take control of your<br /><em>finances securely.</em></h2>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={0.15}>
            <button className="button button-primary button-large" onClick={() => navigate("/auth?mode=register")} data-testid="final-get-started">
              Get started <span className="arrow-orb"><ArrowUpRight size={17} /></span>
            </button>
          </RevealOnScroll>
        </div>
      </section>
    </main>
    <footer className="footer">
      <Logo />
      <div className="footer-links">
        <a href="#features" data-testid="footer-features">Features</a>
        <a href="#security" data-testid="footer-security">Security</a>
        <a href="mailto:hello@securefin.app" data-testid="footer-contact">Contact</a>
      </div>
      <span>© 2026 SecureFin</span>
    </footer>
  </div>;
}

function ScrollLinkedChart() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 20%"] });
  const pathLength = useSpring(scrollYProgress, { stiffness: 80, damping: 20, mass: 0.5 });
  const areaOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [0, 0.6, 1]);
  // Points shaped like fintech growth curve, viewBox 0-500 x 0-130
  const linePath = "M 10 100 C 60 90, 100 82, 140 78 S 220 62, 260 58 S 340 40, 380 32 S 460 18, 490 12";
  const areaPath = linePath + " L 490 128 L 10 128 Z";
  return <div className="preview-chart" ref={ref}>
    <svg viewBox="0 0 500 130" width="100%" height="130" preserveAspectRatio="none">
      <defs>
        <linearGradient id="auroraLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7cc5ff" />
          <stop offset="45%" stopColor="#b892ff" />
          <stop offset="100%" stopColor="#d16bff" />
        </linearGradient>
        <linearGradient id="auroraFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9366ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#9366ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={areaPath} fill="url(#auroraFill)" style={{ opacity: areaOpacity }} />
      <motion.path d={linePath} fill="none" stroke="url(#auroraLine)" strokeWidth="2.5" strokeLinecap="round" style={{ pathLength }} />
    </svg>
  </div>;
}
function DashboardPreview({ parallax }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15, margin: "0px 0px -40px 0px" });
  const reduce = useReducedMotion();
  const enter = { opacity: 1, y: 0 };
  const hidden = { opacity: 0, y: 40 };
  return <motion.div ref={ref} className="preview-wrap" initial={reduce ? enter : hidden} animate={reduce || inView ? enter : hidden} transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}>
    <div className="preview-glow" />
    <motion.div className="float-widget fw-left-top" style={{ x: parallax?.x, y: parallax?.y }} animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
      <div className="fw-label">Expenses Report</div>
      <div className="fw-donut"><span>68%</span></div>
      <div className="fw-sub">₹5,352.22</div>
    </motion.div>
    <motion.div className="float-widget fw-right-top" style={{ x: parallax?.x, y: parallax?.y }} animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
      <div className="fw-label">Your Goals</div>
      <div className="fw-goal-row"><span className="fw-mini" style={{ "--p": "72%" }} /><span>Emergency</span></div>
      <div className="fw-goal-row"><span className="fw-mini" style={{ "--p": "45%" }} /><span>Vacation</span></div>
    </motion.div>
    <motion.div className="preview-card" whileHover={{ y: -6, rotate: 0 }} transition={{ type: "spring", stiffness: 200 }}>
      <div className="preview-top">
        <span className="preview-label"><span className="status-dot" /> SecureFin / Overview</span>
        <MoreHorizontal size={18} />
      </div>
      <div className="preview-balance">
        <span>Total Balance</span>
        <strong>₹1,84,620</strong>
        <small><span>+12.4%</span> this month</small>
      </div>
      <div className="preview-chart-wrap">
        <ScrollLinkedChart />
      </div>
      <div className="preview-foot">
        <div><span>Income</span><strong>₹92,000</strong></div>
        <div><span>Investments</span><strong>₹2,74,550</strong></div>
        <div className="preview-score"><ShieldCheck size={15} /><span>Security</span><strong>88/100</strong></div>
      </div>
    </motion.div>
    <motion.div className="float-widget fw-left-bottom" style={{ x: parallax?.x, y: parallax?.y }} animate={{ y: [0, -12, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
      <div className="fw-label">Saving Budget</div>
      <div className="fw-value">₹5,352.22</div>
      <div className="fw-sub">+8.2% this month</div>
    </motion.div>
    <motion.div className="float-widget fw-right-bottom" style={{ x: parallax?.x, y: parallax?.y }} animate={{ y: [0, -9, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}>
      <div className="fw-label">Security Score</div>
      <div className="fw-value">88<span style={{ color: "var(--ink-muted)", fontSize: 14 }}>/100</span></div>
      <div className="fw-sub" style={{ color: "var(--green)" }}>Strong foundation</div>
    </motion.div>
  </motion.div>;
}

function AuthPage() {
  const navigate = useNavigate(); const location = useLocation(); const { user, setUser } = useAuth();
  const params = new URLSearchParams(location.search); const [mode, setMode] = useState(params.get("mode") || "login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm_password: "", two_factor_code: "" }); const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [resetToken, setResetToken] = useState(""); const [success, setSuccess] = useState(false);
  useEffect(() => { if (user && user !== false) navigate("/app"); }, [user, navigate]);
  const score = useMemo(() => { const p = form.password; return [p.length >= 12, /[A-Z]/.test(p), /[a-z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length; }, [form.password]);
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => { e.preventDefault(); setBusy(true); setError(""); try { if (mode === "forgot") { const r = await api.post("/auth/forgot-password", { email: form.email }); toast.success(r.data.message); if (r.data.development_token) { setResetToken(r.data.development_token); setMode("reset"); } } else if (mode === "reset") { await api.post("/auth/reset-password", { token: resetToken || form.confirm_password, password: form.password }); toast.success("Password updated"); setMode("login"); } else if (mode === "register") { const r = await api.post("/auth/register", { ...form, demo_data: true }); setSuccess(true); setTimeout(() => { setUser(r.data); navigate("/app"); }, 1100); } else { const r = await api.post("/auth/login", { email: form.email, password: form.password }, { params: form.two_factor_code ? { two_factor_code: form.two_factor_code } : {} }); setSuccess(true); setTimeout(() => { setUser(r.data); navigate("/app"); }, 1100); } } catch (e) { setError(formatApiError(e.response?.data?.detail)); } finally { setBusy(false); } };
  const title = mode === "register" ? "Build your secure picture." : mode === "forgot" ? "Reset your access." : mode === "reset" ? "Choose a new password." : "Welcome back.";
  return <div className="auth-page"><CursorTrail />{success && <div className="auth-success-overlay" data-testid="auth-success-overlay" role="status" aria-live="polite"><div className="auth-success-burst" /><div className="auth-success-ring" /><div className="auth-success-check"><svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden><circle cx="26" cy="26" r="24" stroke="url(#successStroke)" strokeWidth="2.5" strokeLinecap="round" pathLength="1" className="auth-success-circle" /><path d="M15 26.5 L23 34.5 L38 18" stroke="url(#successStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength="1" className="auth-success-tick" /><defs><linearGradient id="successStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6cf1a4" /><stop offset="50%" stopColor="#b892ff" /><stop offset="100%" stopColor="#ff7ac0" /></linearGradient></defs></svg></div><div className="auth-success-text">{mode === "register" ? "Account created" : "Signed in"}<span>Taking you to your dashboard…</span></div></div>}<div className="auth-orbs" aria-hidden><span className="auth-orb auth-orb-1" /><span className="auth-orb auth-orb-2" /><span className="auth-orb auth-orb-3" /></div><div className="auth-aside"><Logo light /><div className="auth-aside-copy"><div className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> Security, without the friction</div><h1>{title}</h1><p>Take control of your finances without compromising your digital security.</p></div><div className="auth-aside-bottom"><span><ShieldCheck size={16} /> Protected workspace</span><span>SecureFin / 2026</span></div></div><div className="auth-main"><div className="mobile-auth-logo"><Logo /></div><div className="auth-card"><div className="auth-card-head"><div className="eyebrow">Private by design</div><h2>{mode === "register" ? "Create your account" : mode === "forgot" ? "Forgot password?" : mode === "reset" ? "Reset password" : "Sign in to SecureFin"}</h2><p>{mode === "register" ? "Start with a secure financial workspace." : mode === "forgot" ? "We’ll prepare a secure reset link for your account." : mode === "reset" ? "Use a new password you’ll remember." : "Your financial command center is waiting."}</p></div>{error && <div className="form-error" data-testid="auth-error"><X size={16} /> {error}</div>}<form onSubmit={submit} data-testid={`${mode}-form`}>{mode === "register" && <Field label="Full name" name="name" value={form.name} onChange={update} placeholder="Aarav Mehta" testid="register-name-input" />}{mode !== "reset" && <Field label="Email address" name="email" type="email" value={form.email} onChange={update} placeholder="you@example.com" testid={`${mode}-email-input`} />}{mode !== "forgot" && <><Field label="Password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={update} placeholder="At least 8 characters" testid={`${mode}-password-input`} suffix={<button type="button" className="input-icon" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} data-testid="toggle-password-visibility">{showPassword ? <Eye size={17} /> : <EyeOff size={17} />}</button>} />{mode === "register" && <PasswordMeter score={score} />}</>}{mode === "register" && <Field label="Confirm password" name="confirm_password" type="password" value={form.confirm_password} onChange={update} placeholder="Repeat your password" testid="register-confirm-password-input" />}{mode === "login" && <div className="auth-options"><label className="checkbox-label"><input type="checkbox" data-testid="remember-me-checkbox" /> <span>Remember me</span></label><button type="button" className="link-button" onClick={() => { setMode("forgot"); setError(""); }} data-testid="forgot-password-link">Forgot password?</button></div>}{mode === "login" && error.includes("Two-factor") && <Field label="Authenticator code" name="two_factor_code" value={form.two_factor_code} onChange={update} placeholder="123456" testid="two-factor-code-input" />}{mode === "reset" && <Field label="Reset token" name="confirm_password" value={resetToken || form.confirm_password} onChange={(e) => { setResetToken(e.target.value); update(e); }} placeholder="Paste development reset token" testid="reset-token-input" />}{mode === "register" && <label className="terms"><input type="checkbox" required data-testid="terms-checkbox" /> <span>I agree to SecureFin’s terms and privacy principles</span></label>}<button className="button button-primary full-width" disabled={busy} data-testid={`${mode}-submit-button`}>{busy ? "Working…" : mode === "register" ? "Create secure account" : mode === "forgot" ? "Prepare reset link" : mode === "reset" ? "Update password" : "Sign in"} <ArrowUpRight size={16} /></button></form><div className="auth-switch">{mode === "forgot" || mode === "reset" ? <button className="link-button" onClick={() => setMode("login")} data-testid="back-to-login-link">← Back to sign in</button> : <>{mode === "register" ? "Already have an account?" : "New to SecureFin?"} <button className="link-button" onClick={() => setMode(mode === "register" ? "login" : "register")} data-testid="auth-mode-toggle">{mode === "register" ? "Sign in" : "Create an account"}</button></>}</div></div></div></div>;
}

function Field({ label, name, type = "text", value, onChange, placeholder, suffix, testid }) { return <label className="field"><span>{label}</span><div className="input-wrap"><input required name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} data-testid={testid} />{suffix}</div></label>; }
function PasswordMeter({ score }) { const labels = ["Very weak", "Weak", "Medium", "Strong", "Very strong"]; return <div className="password-meter" data-testid="password-strength-indicator"><div className="meter-bars">{[1, 2, 3, 4, 5].map((x) => <span className={x <= score ? `fill-${score}` : ""} key={x} />)}</div><small>{labels[Math.min(score, 4)]} · Use upper, lower, number and special characters</small></div>; }

const navItems = [{ to: "/app", label: "Overview", icon: LayoutDashboard }, { to: "/app/transactions", label: "Transactions", icon: Receipt }, { to: "/app/investments", label: "Investments", icon: TrendingUp }, { to: "/app/subscriptions", label: "Subscriptions", icon: CreditCard }, { to: "/app/budgets", label: "Budgets", icon: Landmark }, { to: "/app/analytics", label: "Analytics", icon: BarChart3 }, { to: "/app/security", label: "Security center", icon: ShieldCheck }];

function ProtectedApp() { const { user, checking } = useAuth(); if (checking) return <div className="page-loader" data-testid="auth-loading">Loading SecureFin…</div>; if (!user) return <Navigate to="/auth?mode=login" replace />; return <AppShell />; }
function AppShell() { const { user, signOut } = useAuth(); const [light, setLight] = useState(localStorage.getItem("securefin-theme") === "light"); const [mobile, setMobile] = useState(false); const [search, setSearch] = useState(""); const navigate = useNavigate(); useEffect(() => { document.body.classList.toggle("light", light); localStorage.setItem("securefin-theme", light ? "light" : "dark"); }, [light]); const doSearch = async (e) => { setSearch(e.target.value); if (e.target.value.length > 1) { const r = await api.get(`/search?q=${encodeURIComponent(e.target.value)}`); if (r.data.length) navigate("/app/search", { state: { results: r.data, query: e.target.value } }); } }; return <div className="app-shell"><aside className={`sidebar ${mobile ? "open" : ""}`}><div className="sidebar-head"><Logo /><button className="mobile-close" onClick={() => setMobile(false)} data-testid="close-mobile-sidebar"><X size={18} /></button></div><div className="workspace-label">Workspace <span>PERSONAL</span></div><nav className="side-nav">{navItems.map(({ to, label, icon: Icon }) => <NavLink end={to === "/app"} to={to} key={to} onClick={() => setMobile(false)} data-testid={`sidebar-${label.toLowerCase().replaceAll(" ", "-")}`}><Icon size={17} /><span>{label}</span>{label === "Security center" && <i className="nav-alert">2</i>}</NavLink>)}</nav><div className="sidebar-bottom"><NavLink to="/app/profile" data-testid="sidebar-profile"><UserRound size={17} /> <span>Profile</span></NavLink><NavLink to="/app/settings" data-testid="sidebar-settings"><Settings size={17} /> <span>Settings</span></NavLink><button className="theme-toggle" onClick={() => setLight(!light)} data-testid="theme-toggle">{light ? <Moon size={17} /> : <Sun size={17} />} <span>{light ? "Dark mode" : "Light mode"}</span><b>{light ? "OFF" : "ON"}</b></button><button className="logout-button" onClick={async () => { await signOut(); navigate("/"); }} data-testid="logout-button"><LogOut size={17} /> <span>Log out</span></button></div></aside><div className="main-shell"><header className="app-header"><button className="mobile-menu" onClick={() => setMobile(true)} data-testid="open-mobile-sidebar"><Menu size={21} /></button><div className="global-search"><Search size={17} /><input placeholder="Search anything…" value={search} onChange={doSearch} data-testid="global-search-input" /></div><div className="header-actions"><button className="icon-button" data-testid="notifications-button"><Bell size={18} /><i /></button><div className="security-pill"><ShieldCheck size={15} /><span>Protected</span></div><button className="profile-chip" onClick={() => navigate("/app/profile")} data-testid="header-profile-button"><span>{user.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</span><strong>{user.name?.split(" ")[0]}</strong></button></div></header><div className="app-content"><Routes><Route index element={<Overview />} /><Route path="transactions" element={<RecordsPage type="transactions" />} /><Route path="investments" element={<RecordsPage type="investments" />} /><Route path="subscriptions" element={<RecordsPage type="subscriptions" />} /><Route path="budgets" element={<RecordsPage type="budgets" />} /><Route path="analytics" element={<Analytics />} /><Route path="security" element={<SecurityCenter />} /><Route path="profile" element={<Profile />} /><Route path="settings" element={<SettingsPage />} /><Route path="search" element={<SearchResults />} /></Routes></div></div></div>; }

function PageHeader({ eyebrow, title, text, action }) { return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1 data-testid="page-title">{title}</h1><p>{text}</p></div>{action}</div>; }
function StatCard({ label, value, trend, icon: Icon, accent = "teal" }) { return <article className={`stat-card stat-${accent}`} data-testid={`stat-${label.toLowerCase().replaceAll(" ", "-")}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div><strong>{value}</strong><small className={trend?.startsWith("+") ? "positive" : ""}>{trend} <span>vs last month</span></small></article>; }
function Overview() { const { user } = useAuth(); const [data, setData] = useState(null); const [range, setRange] = useState("6M"); useEffect(() => { api.get("/dashboard").then((r) => setData(r.data)).catch(() => toast.error("Could not load your overview.")); }, []); if (!data) return <div className="loading-block" data-testid="dashboard-loading">Loading your overview…</div>; const t = data.totals; const chart = [{ month: "May", income: 79000, expenses: 31000 }, { month: "Jun", income: 82000, expenses: 34800 }, { month: "Jul", income: 85000, expenses: 37500 }, { month: "Aug", income: 88000, expenses: 39500 }, { month: "Sep", income: 91000, expenses: 42600 }, { month: "Oct", income: t.income || 92000, expenses: t.expenses || 9650 }]; return <><PageHeader eyebrow="Tuesday, October 21, 2026" title={`Good evening, ${user.name?.split(" ")[0]}.`} text="Here’s your financial and security overview." action={<div className="page-actions"><button className="button button-secondary" onClick={() => window.location.reload()} data-testid="refresh-overview-button">Refresh</button><NavLink className="button button-primary" to="/app/transactions" data-testid="add-transaction-quick-link"><Plus size={16} /> Add transaction</NavLink></div>} /><div className="demo-banner" data-testid="demo-data-banner"><Gift size={16} /><span><strong>Starter workspace</strong> Demo records are helping you see the full picture.</span><button onClick={async () => { await api.delete("/demo-data"); toast.success("Demo data removed"); window.location.reload(); }} data-testid="remove-demo-data-button">Remove demo data</button></div><div className="stats-grid"><StatCard label="Total balance" value={money(t.balance)} trend="+12.4%" icon={Wallet} /><StatCard label="Income" value={money(t.income)} trend="+8.1%" icon={ArrowUpRight} accent="green" /><StatCard label="Expenses" value={money(t.expenses)} trend="-3.6%" icon={Receipt} accent="orange" /><StatCard label="Investments" value={money(t.investments)} trend={`+${Number(t.return_percent || 0).toFixed(1)}%`} icon={TrendingUp} accent="blue" /><StatCard label="Security score" value={`${data.security_score}/100`} trend={data.security_label} icon={ShieldCheck} accent="dark" /></div><div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-head"><div><h2>Income vs expenses</h2><span>Monthly performance</span></div><div className="range-tabs">{["7D", "1M", "6M", "1Y"].map((x) => <button className={range === x ? "active" : ""} onClick={() => setRange(x)} key={x} data-testid={`overview-range-${x.toLowerCase()}`}>{x}</button>)}</div></div><ResponsiveContainer width="100%" height={245}><AreaChart data={chart}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9366ff" stopOpacity={0.45} /><stop offset="100%" stopColor="#9366ff" stopOpacity={0} /></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7cc5ff" stopOpacity={0.35} /><stop offset="100%" stopColor="#7cc5ff" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(184,154,255,0.10)" strokeDasharray="4 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#a89dc4", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#a89dc4", fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} /><Tooltip formatter={(v) => money(v)} contentStyle={{ background: "#14102a", border: "1px solid rgba(184,154,255,0.20)", borderRadius: 10, color: "#ede7fb", boxShadow: "0 12px 40px rgba(30,15,80,0.35)" }} /><Area type="monotone" dataKey="income" stroke="#b892ff" fill="url(#incomeFill)" strokeWidth={2.5} /><Area type="monotone" dataKey="expenses" stroke="#7cc5ff" fill="url(#expenseFill)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer><div className="chart-legend"><span><i className="legend-teal" /> Income</span><span><i className="legend-orange" /> Expenses</span></div></section><section className="panel spending-panel"><div className="panel-head"><div><h2>Spending breakdown</h2><span>This month by category</span></div><NavLink to="/app/analytics" className="icon-link" data-testid="spending-analytics-link"><ArrowUpRight size={17} /></NavLink></div><div className="donut-wrap"><ResponsiveContainer width="52%" height={180}><PieChart><Pie data={data.spending_breakdown.length ? data.spending_breakdown : [{ name: "No spending", value: 1 }]} innerRadius={54} outerRadius={76} paddingAngle={4} dataKey="value"><Cell fill="#9366ff" /><Cell fill="#7cc5ff" /><Cell fill="#ffc266" /><Cell fill="#d16bff" /><Cell fill="#38d4c4" /></Pie></PieChart></ResponsiveContainer><div className="donut-total"><strong>{money(t.expenses)}</strong><span>total spent</span></div></div><div className="category-list">{(data.spending_breakdown.length ? data.spending_breakdown.slice(0, 4) : [{ name: "No spending yet", value: 0 }]).map((x, i) => <div key={x.name} data-testid={`spending-category-${x.name.toLowerCase().replaceAll(" ", "-")}`}><span><i className={`cat-dot cat-${i}`} />{x.name}</span><strong>{money(x.value)}</strong></div>)}</div></section></div><div className="lower-grid"><section className="panel recent-panel"><div className="panel-head"><div><h2>Recent transactions</h2><span>Latest activity across your accounts</span></div><NavLink to="/app/transactions" className="inline-link" data-testid="view-all-transactions">View all <ArrowUpRight size={15} /></NavLink></div><TransactionList items={data.transactions} /></section><section className="panel security-mini"><div className="panel-head"><div><h2>Security pulse</h2><span>Your account health today</span></div><ShieldCheck size={20} className="teal-icon" /></div><div className="security-score-row"><div className="score-ring" style={{ "--score": `${data.security_score * 3.6}deg` }}><strong>{data.security_score}</strong><span>/100</span></div><div><strong>{data.security_label}</strong><p>{data.security_score >= 85 ? "Your key security controls are looking good." : "A few controls could use your attention."}</p><NavLink to="/app/security" className="inline-link" data-testid="security-pulse-link">Review security <ArrowUpRight size={14} /></NavLink></div></div><div className="security-check"><Check size={15} /> No suspicious activity detected</div></section></div></>;
}

function TransactionList({ items }) { return <div className="transaction-list">{items?.length ? items.map((item) => <div className="transaction-row" key={item.id} data-testid={`transaction-row-${item.id}`}><span className={`transaction-icon ${item.type === "income" ? "income" : "expense"}`}>{item.type === "income" ? <ArrowDownLeftIcon /> : <Receipt size={16} />}</span><div className="transaction-meta"><strong>{item.description || item.name || item.category}</strong><span>{item.category} · {item.date}</span></div><strong className={item.type === "income" ? "amount-positive" : ""}>{item.type === "income" ? "+" : "-"}{money(item.amount)}</strong></div>) : <EmptyState title="No transactions yet" text="Start tracking your finances by adding your first transaction." />}</div>; }
function ArrowDownLeftIcon() { return <ArrowUpRight size={16} style={{ transform: "rotate(90deg)" }} />; }
function EmptyState({ title, text, action }) { return <div className="empty-state" data-testid="empty-state"><FileText size={24} /><strong>{title}</strong><p>{text}</p>{action}</div>; }

const pageConfig = { transactions: { title: "Transactions", eyebrow: "Money movement", text: "Every income and expense, organized and easy to understand.", singular: "transaction", icon: Receipt }, investments: { title: "Investments", eyebrow: "Long-term momentum", text: "Track the portfolio you’re building, one position at a time.", singular: "investment", icon: TrendingUp }, subscriptions: { title: "Subscriptions", eyebrow: "Recurring commitments", text: "Stay ahead of renewals and keep monthly spending intentional.", singular: "subscription", icon: CreditCard }, budgets: { title: "Budgets", eyebrow: "Spending guardrails", text: "Give every category a clear limit and a little more breathing room.", singular: "budget", icon: Landmark } };
function RecordsPage({ type }) { const config = pageConfig[type]; const [items, setItems] = useState([]); const [show, setShow] = useState(false); const [editing, setEditing] = useState(null); const [search, setSearch] = useState(""); const load = () => api.get(`/${type}`, { params: { search } }).then((r) => setItems(r.data)).catch(() => {}); useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [type]); useEffect(() => { const timer = setTimeout(() => { load(); }, 250); return () => clearTimeout(timer); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search]); const remove = async (id) => { if (!window.confirm("Remove this record?")) return; await api.delete(`/${type}/${id}`); toast.success("Record removed"); load(); }; const submit = async (data) => { try { if (editing) await api.put(`/${type}/${editing.id}`, data); else await api.post(`/${type}`, data); toast.success(editing ? "Record updated" : "Record added"); setShow(false); setEditing(null); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } }; return <><PageHeader eyebrow={config.eyebrow} title={config.title} text={config.text} action={<button className="button button-primary" onClick={() => { setEditing(null); setShow(true); }} data-testid={`add-${config.singular}-button`}><Plus size={16} /> Add {config.singular}</button>} /><div className="records-toolbar"><div className="table-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${type}…`} data-testid={`${type}-search-input`} /></div><span data-testid={`${type}-count`}>{items.length} records</span></div><section className="panel records-panel"><div className="records-table-head"><span>Name / description</span><span>Category</span><span>Date / cycle</span><span>Amount</span><span /></div>{items.length ? items.map((item) => <RecordRow key={item.id} item={item} type={type} onEdit={() => { setEditing(item); setShow(true); }} onDelete={() => remove(item.id)} />) : <EmptyState title={`No ${type} yet`} text={`Add your first ${config.singular} to make this page useful.`} action={<button className="button button-secondary" onClick={() => setShow(true)} data-testid={`empty-add-${config.singular}-button`}><Plus size={15} /> Add {config.singular}</button>} />}</section>{show && <RecordModal type={type} config={config} initial={editing} onClose={() => { setShow(false); setEditing(null); }} onSubmit={submit} />}</>; }
function RecordRow({ item, type, onEdit, onDelete }) { const amount = item.amount ?? item.limit ?? 0; const label = item.description || item.name || item.category; return <div className="record-row" data-testid={`${type}-row-${item.id}`}><span className="record-name"><span className="record-icon"><Receipt size={15} /></span><span><strong>{label}</strong><small>{item.is_demo ? "Starter data" : item.type || item.category || "Personal"}</small></span></span><span>{item.category || item.type || item.period || "—"}</span><span>{item.date || item.next_billing_date || item.purchase_date || item.period || "—"}</span><strong className={item.type === "income" ? "amount-positive" : ""}>{item.type === "income" ? "+" : ""}{money(amount)}</strong><span className="row-actions"><button onClick={onEdit} data-testid={`edit-${type}-${item.id}`} aria-label="Edit record"><Pencil size={15} /></button><button onClick={onDelete} data-testid={`delete-${type}-${item.id}`} aria-label="Delete record"><Trash2 size={15} /></button></span></div>; }
function RecordModal({ type, config, initial, onClose, onSubmit }) { const [form, setForm] = useState(initial || { type: type === "transactions" ? "expense" : undefined, date: new Date().toISOString().slice(0, 10), billing_cycle: "Monthly" }); const update = (e) => setForm({ ...form, [e.target.name]: e.target.value }); const save = (e) => { e.preventDefault(); const data = { ...form, amount: Number(form.amount || form.limit || 0) }; onSubmit(data); }; return <div className="modal-backdrop" role="dialog" data-testid={`${type}-modal`}><div className="modal-card"><div className="modal-head"><div><div className="eyebrow">{initial ? "Edit record" : "New record"}</div><h2>{initial ? "Update details" : `Add ${config.singular}`}</h2></div><button onClick={onClose} data-testid={`close-${type}-modal`}><X size={18} /></button></div><form onSubmit={save} className="record-form">{type === "transactions" ? <><label className="field"><span>Type</span><select name="type" value={form.type || "expense"} onChange={update} data-testid="transaction-type-input"><option value="expense">Expense</option><option value="income">Income</option></select></label><Field label="Description" name="description" value={form.description || ""} onChange={update} placeholder="What was this for?" testid="transaction-description-input" /><Field label="Amount" name="amount" type="number" value={form.amount || ""} onChange={update} placeholder="0" testid="transaction-amount-input" /><Field label="Category" name="category" value={form.category || ""} onChange={update} placeholder="Food, salary, bills…" testid="transaction-category-input" /><Field label="Date" name="date" type="date" value={form.date || ""} onChange={update} placeholder="" testid="transaction-date-input" /></> : type === "budgets" ? <><Field label="Category" name="category" value={form.category || ""} onChange={update} placeholder="Food, shopping…" testid="budget-category-input" /><Field label="Monthly limit" name="limit" type="number" value={form.limit || ""} onChange={update} placeholder="0" testid="budget-limit-input" /><Field label="Already spent" name="spent" type="number" value={form.spent || "0"} onChange={update} placeholder="0" testid="budget-spent-input" /></> : <><Field label={`${type === "investments" ? "Investment" : "Subscription"} name`} name="name" value={form.name || ""} onChange={update} placeholder={type === "investments" ? "Index fund or stock" : "Streaming, gym, software…"} testid={`${type.slice(0, -1)}-name-input`} /><Field label="Amount" name="amount" type="number" value={form.amount || ""} onChange={update} placeholder="0" testid={`${type.slice(0, -1)}-amount-input`} />{type === "investments" ? <><Field label="Current value" name="current_value" type="number" value={form.current_value || ""} onChange={update} placeholder="0" testid="investment-current-value-input" /><Field label="Type" name="type" value={form.type || "ETF"} onChange={update} placeholder="ETF, stock…" testid="investment-type-input" /></> : <><Field label="Billing cycle" name="billing_cycle" value={form.billing_cycle || "Monthly"} onChange={update} placeholder="Monthly" testid="subscription-cycle-input" /><Field label="Next billing date" name="next_billing_date" type="date" value={form.next_billing_date || ""} onChange={update} placeholder="" testid="subscription-date-input" /></>}</>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose} data-testid={`cancel-${type}-modal`}>Cancel</button><button className="button button-primary" data-testid={`save-${type}-button`}>{initial ? "Save changes" : `Add ${config.singular}`}</button></div></form></div></div>; }

function Analytics() { const [data, setData] = useState(null); useEffect(() => { api.get("/analytics").then((r) => setData(r.data)); }, []); if (!data) return <div className="loading-block">Loading analytics…</div>; return <><PageHeader eyebrow="Patterns worth noticing" title="Analytics" text="A clearer view of how your money is moving over time." /><div className="analytics-summary"><StatCard label="Savings rate" value={`${Number(data.savings_rate).toFixed(1)}%`} trend="Based on stored activity" icon={Sparkles} accent="teal" /><StatCard label="Total income" value={money(data.totals.income)} trend="All tracked income" icon={ArrowUpRight} accent="green" /><StatCard label="Total expenses" value={money(data.totals.expenses)} trend="All tracked expenses" icon={Receipt} accent="orange" /></div><section className="panel analytics-chart"><div className="panel-head"><div><h2>Income and expense trends</h2><span>Calculated from your stored transactions</span></div><span className="insight-badge"><Zap size={14} /> Live insight</span></div><ResponsiveContainer width="100%" height={330}><BarChart data={data.monthly.length ? data.monthly : [{ month: "No data", income: 0, expenses: 0 }]}><CartesianGrid vertical={false} stroke="rgba(184,154,255,0.10)" strokeDasharray="4 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#a89dc4", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#a89dc4", fontSize: 11 }} /><Tooltip formatter={(v) => money(v)} contentStyle={{ background: "#14102a", border: "1px solid rgba(184,154,255,0.20)", borderRadius: 10, color: "#ede7fb" }} /><Bar dataKey="income" fill="#9366ff" radius={[6, 6, 0, 0]} /><Bar dataKey="expenses" fill="#7cc5ff" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></section><div className="insights-row"><div className="insight-card"><TrendingUp size={18} /><strong>Your savings rate is {Number(data.savings_rate).toFixed(1)}%</strong><p>This is calculated from your stored income and expense records.</p></div><div className="insight-card"><CircleDollarSign size={18} /><strong>Balance: {money(data.totals.balance)}</strong><p>Keep adding activity to make your trends more useful.</p></div></div></>; }

function SecurityCenter() { const { user, setUser } = useAuth(); const [events, setEvents] = useState([]); const [setup, setSetup] = useState(null); const [code, setCode] = useState(""); useEffect(() => { api.get("/security/events").then((r) => setEvents(r.data)); }, []); const begin2fa = async () => { const r = await api.post("/auth/2fa/setup"); setSetup(r.data); }; const verify = async () => { try { await api.post("/auth/2fa/verify", { code }); toast.success("Two-factor authentication enabled"); setUser({ ...user, two_factor_enabled: true }); setSetup(null); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } }; const disable = async () => { await api.post("/auth/2fa/disable"); setUser({ ...user, two_factor_enabled: false }); toast.success("Two-factor authentication disabled"); }; return <><PageHeader eyebrow="Account protection" title="Security center" text="See how your account is protected and what to strengthen next." /><div className="security-overview"><section className="panel big-score-panel"><div className="score-ring large" style={{ "--score": `${user.two_factor_enabled ? 316 : 274}deg` }}><strong>{user.two_factor_enabled ? 88 : 76}</strong><span>/100</span></div><div><div className="eyebrow">Overall security score</div><h2>{user.two_factor_enabled ? "Strong foundation." : "Good, with room to grow."}</h2><p>{user.two_factor_enabled ? "Two-factor authentication is active on this account." : "Enable two-factor authentication to add another layer of protection."}</p></div></section><section className="panel checklist-panel"><div className="panel-head"><div><h2>Security checklist</h2><span>Based on your account settings</span></div><ShieldCheck className="teal-icon" /></div><CheckItem label="Password protection" value="Active" good /><CheckItem label="Protected sessions" value="Active" good /><CheckItem label="Two-factor authentication" value={user.two_factor_enabled ? "Enabled" : "Needs attention"} good={user.two_factor_enabled} /><CheckItem label="Suspicious activity" value="No recent flags" good /></section></div><div className="security-columns"><section className="panel password-panel"><div className="panel-head"><div><h2>Password security</h2><span>Test a password locally — it never leaves this browser.</span></div><LockKeyhole size={18} /></div><PasswordTester /></section><section className="panel twofa-panel"><div className="panel-head"><div><h2>Two-factor authentication</h2><span>Add an authenticator app challenge at login.</span></div><Shield size={19} /></div>{user.two_factor_enabled ? <div className="enabled-state"><div className="success-icon"><Check size={17} /></div><strong>Authenticator protection is on</strong><p>Your next sign-in will require a current code.</p><button className="button button-secondary" onClick={disable} data-testid="disable-2fa-button">Disable 2FA</button></div> : setup ? <div className="setup-state"><strong>1. Add this secret to your authenticator</strong><code data-testid="two-factor-secret">{setup.secret}</code><strong>2. Enter the six-digit code</strong><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" data-testid="two-factor-verify-input" /><button className="button button-primary" onClick={verify} data-testid="verify-2fa-button">Verify and enable</button></div> : <div className="setup-state"><div className="twofa-illustration"><ShieldCheck size={28} /></div><strong>Protect sign-ins with an extra step</strong><p>Use any authenticator app. Setup is completed securely from this device.</p><button className="button button-primary" onClick={begin2fa} data-testid="enable-2fa-button">Set up 2FA <ArrowUpRight size={15} /></button></div>}</section></div><section className="panel activity-panel"><div className="panel-head"><div><h2>Security activity</h2><span>Recent sign-ins and account events</span></div><Globe2 size={18} /></div>{events.length ? events.map((e) => <div className="activity-row" key={e.id} data-testid={`security-event-${e.id}`}><span className="activity-icon"><ShieldCheck size={15} /></span><div><strong>{e.event}</strong><span>{e.device}</span></div><small>{new Date(e.created_at).toLocaleString()}</small></div>) : <EmptyState title="No activity yet" text="Your account events will appear here after you sign in." />}</section></>; }
function CheckItem({ label, value, good }) { return <div className="check-item" data-testid={`security-check-${label.toLowerCase().replaceAll(" ", "-")}`}><span className={good ? "check-good" : "check-warn"}>{good ? <Check size={14} /> : "!"}</span><span>{label}</span><strong>{value}</strong></div>; }
function PasswordTester() { const [password, setPassword] = useState(""); const checks = [{ label: "12+ characters", ok: password.length >= 12 }, { label: "Uppercase letter", ok: /[A-Z]/.test(password) }, { label: "Lowercase letter", ok: /[a-z]/.test(password) }, { label: "Number", ok: /\d/.test(password) }, { label: "Special character", ok: /[^A-Za-z0-9]/.test(password) }]; const score = checks.filter((x) => x.ok).length; return <div className="password-tester"><div className="tester-input"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Type a password to check" data-testid="password-strength-checker-input" />{password && <span>{score >= 4 ? "Strong" : score >= 2 ? "Needs work" : "Very weak"}</span>}</div><div className="strength-checks">{checks.map((x) => <span key={x.label} className={x.ok ? "ok" : ""}><Check size={13} /> {x.label}</span>)}</div></div>; }
function Profile() { const { user, setUser, signOut } = useAuth(); const navigate = useNavigate(); const [name, setName] = useState(user.name); const save = async () => { const r = await api.put("/profile", { name }); setUser({ ...user, ...r.data }); toast.success("Profile updated"); }; const doLogout = async () => { if (!window.confirm("Sign out of SecureFin?")) return; await signOut(); navigate("/"); }; return <><PageHeader eyebrow="Your identity" title="Profile" text="Keep your personal details current across SecureFin." /><section className="panel profile-panel"><div className="profile-hero"><div className="profile-avatar large-avatar">{user.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</div><div><h2>{user.name}</h2><p>{user.email}</p><span className="verified-label"><Check size={13} /> Account verified</span></div></div><div className="profile-form"><Field label="Full name" name="profile_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" testid="profile-name-input" /><Field label="Email address" name="profile_email" value={user.email} onChange={() => {}} placeholder="you@example.com" testid="profile-email-input" /><div className="profile-actions"><button className="button button-primary" onClick={save} data-testid="save-profile-button">Save profile <Check size={15} /></button><button className="button button-danger" onClick={doLogout} data-testid="profile-logout-button"><LogOut size={15} /> Log out</button></div></div></section></>; }
function SettingsPage() { const { user } = useAuth(); return <><PageHeader eyebrow="Workspace preferences" title="Settings" text="Tune SecureFin to the way you think about money." /><div className="settings-list"><section className="panel setting-row"><div className="setting-icon"><Sun size={18} /></div><div><h3>Appearance</h3><p>Switch between light and dark mode from the sidebar.</p></div><span className="setting-status">Available</span></section><section className="panel setting-row"><div className="setting-icon"><ShieldCheck size={18} /></div><div><h3>Account security</h3><p>{user.two_factor_enabled ? "Two-factor authentication is enabled." : "Add an authenticator challenge in Security center."}</p></div><NavLink className="button button-secondary" to="/app/security" data-testid="settings-security-link">Review security</NavLink></section><section className="panel setting-row"><div className="setting-icon"><Bell size={18} /></div><div><h3>Notifications</h3><p>Get useful reminders for budgets, renewals and sign-ins.</p></div><span className="setting-status">On</span></section></div></>; }
function SearchResults() { const location = useLocation(); const results = location.state?.results || []; return <><PageHeader eyebrow="Global search" title="Search results" text={`Results for “${location.state?.query || ""}” across your workspace.`} /><section className="panel records-panel">{results.length ? results.map((r) => <div className="record-row" key={r.id} data-testid={`search-result-${r.id}`}><span className="record-name"><span className="record-icon"><Search size={15} /></span><span><strong>{r.description || r.name || r.category}</strong><small>{r.record_type}</small></span></span><span>{r.category || r.type || "—"}</span><span>{r.date || r.next_billing_date || "—"}</span><strong>{money(r.amount)}</strong><span /></div>) : <EmptyState title="No matching records" text="Try a different name, category or description." />}</section></>; }

function App() { return <BrowserRouter><AuthProvider><Routes><Route path="/" element={<Landing />} /><Route path="/auth" element={<AuthPage />} /><Route path="/app/*" element={<ProtectedApp />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes><Toaster position="bottom-right" richColors /></AuthProvider></BrowserRouter>; }
export default App;