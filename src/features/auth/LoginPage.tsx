import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api/client";
import { appendActivity } from "../../services/activityLog";
import { Button } from "../../shared/components/ui/button";
import { Card } from "../../shared/components/ui/card";
import { Input } from "../../shared/components/ui/input";
import { ThemeToggle } from "../theme/ThemeToggle";
import { roleHome } from "./routes";
import { useAuthStore } from "./store";

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const login = useMutation({
    mutationFn: () => apiClient.login(email, password),
    onSuccess: (user) => {
      setUser(user);
      appendActivity({ action: "Signed in", detail: user.email });
      navigate(roleHome(user.role));
    },
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Login</h2>
          <p className="text-sm text-muted-foreground">Admin: admin@demo.com / admin123</p>
          <p className="text-sm text-muted-foreground">Manager: manager@demo.com / manager123</p>
          <p className="text-sm text-muted-foreground">Employee: arjun@demo.com / emp123</p>
        </div>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        {login.isError && <p className="text-sm text-destructive">{(login.error as Error).message}</p>}
        <Button className="w-full" onClick={() => login.mutate()} disabled={login.isPending}>
          {login.isPending ? "Logging in..." : "Login"}
        </Button>
      </Card>
    </div>
  );
}
