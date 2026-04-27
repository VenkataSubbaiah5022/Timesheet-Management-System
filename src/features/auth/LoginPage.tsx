import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { apiClient } from "../../services/api/client";
import { appendActivity } from "../../services/activityLog";
import { Button } from "../../shared/components/ui/button";
import { Clock3, Eye, EyeOff, AlertCircle } from "lucide-react";
import { roleHome } from "./routes";
import { useAuthStore } from "./store";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.42, delay } }),
};

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [shake, setShake] = useState(false);
  const login = useMutation({
    mutationFn: () => apiClient.login(email, password),
    onSuccess: (user) => {
      setUser(user);
      appendActivity({ action: "Signed in", detail: user.email });
      navigate(roleHome(user.role));
    },
    onError: () => {
      setShake(true);
      window.setTimeout(() => setShake(false), 420);
    },
  });
  const heroTime = useMemo(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), []);

  return (
    <div className="login-mesh-bg relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="login-noise" />
      <div className="login-orbit-mark left-[-12vw] top-[10vh]" />
      <div className="login-orbit-mark right-[-14vw] bottom-[-8vh]" />

      <motion.div
        initial="hidden"
        animate="show"
        className={`login-glass-card w-full max-w-md rounded-2xl p-6 ${shake ? "animate-login-shake" : ""}`}
      >
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show" className="mb-5 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Clock3 className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Timesheet Portal</p>
            <p className="text-[11px] text-muted-foreground">Current workspace time {heroTime}</p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.06} initial="hidden" animate="show" className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Track your time. Master your productivity.</p>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.12} initial="hidden" animate="show" className="mt-5 space-y-2">
          <div className="premium-input-wrap">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="h-10 w-full rounded-[11px] border border-transparent bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="premium-input-wrap">
            <div className="flex h-10 items-center rounded-[11px] border border-transparent bg-card px-3">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:scale-105 hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.18} initial="hidden" animate="show" className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            onClick={() => setRememberMe((v) => !v)}
          >
            <span className="relative inline-flex size-4 items-center justify-center rounded-[5px] border border-border bg-card">
              {rememberMe ? (
                <svg viewBox="0 0 16 16" className="size-3 text-primary" fill="none">
                  <path className="animate-check-draw" d="M3.2 8.3 6.6 11.2 12.8 4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </span>
            Remember me
          </button>
        </motion.div>

        <AnimatePresence>
          {login.isError ? (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="login-error-surface mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{(login.error as Error).message}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div variants={fadeUp} custom={0.24} initial="hidden" animate="show" className="mt-4">
          <Button
            className="btn-gradient-primary btn-press h-10 w-full"
            onClick={() => login.mutate()}
            disabled={login.isPending}
          >
            {login.isPending ? (
              <span className="inline-flex items-center gap-2">
                <span className="clock-loader" />
                <span className="animate-in fade-in-0 duration-150">Signing in</span>
              </span>
            ) : (
              "Login"
            )}
          </Button>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.3} initial="hidden" animate="show" className="mt-4 space-y-0.5 text-xs text-muted-foreground">
          <p>Admin: admin@demo.com / admin123</p>
          <p>Manager: manager@demo.com / manager123</p>
          <p>Employee: arjun@demo.com / emp123</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
