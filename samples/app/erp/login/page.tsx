"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useErpStore } from "@/lib/erp/store";

export default function ErpLoginPage() {
  const router = useRouter();
  const organizations = useErpStore((state) => state.organizations);
  const users = useErpStore((state) => state.users);
  const login = useErpStore((state) => state.login);
  const token = useErpStore((state) => state.token);

  const [organizationId, setOrganizationId] = useState("");
  const [userId, setUserId] = useState("");

  const usersForOrganization = useMemo(
    () => users.filter((user) => user.organizationId === organizationId),
    [users, organizationId]
  );

  useEffect(() => {
    if (token) {
      router.replace("/erp/dashboard");
    }
  }, [token, router]);

  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>ERP Login</CardTitle>
          <CardDescription>Выберите организацию и пользователя для входа</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organization">Организация</Label>
            <Select
              value={organizationId}
              onValueChange={(value) => {
                setOrganizationId(value);
                setUserId("");
              }}>
              <SelectTrigger id="organization">
                <SelectValue placeholder="Выберите организацию" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">Пользователь</Label>
            <Select value={userId} onValueChange={setUserId} disabled={!organizationId}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent>
                {usersForOrganization.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={!organizationId || !userId}
            onClick={() => {
              login({ organizationId, userId });
              router.push("/erp/dashboard");
            }}>
            Войти
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
