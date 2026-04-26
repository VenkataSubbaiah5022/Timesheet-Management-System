import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api/client";
import { Button } from "../../shared/components/ui/button";
import { Card } from "../../shared/components/ui/card";
import { Input } from "../../shared/components/ui/input";
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
      navigate(user.role === "admin" ? "/admin/dashboard" : "/employee/clock");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Login</h2>
          <p className="text-sm text-slate-500">Admin: admin@demo.com / admin123</p>
          <p className="text-sm text-slate-500">Employee: arjun@demo.com / emp123</p>
        </div>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        {login.isError && <p className="text-sm text-red-600">{(login.error as Error).message}</p>}
        <Button className="w-full" onClick={() => login.mutate()} disabled={login.isPending}>
          {login.isPending ? "Logging in..." : "Login"}
        </Button>
      </Card>
    </div>
  );
}
