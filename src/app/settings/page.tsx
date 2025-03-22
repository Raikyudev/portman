"use client";

import { useSession } from "next-auth/react";
import ProtectedLayout from "@/app/ProtectedLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { ChangeAccountDetailsForm } from "@/components/ChangeAccountDetailsForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [preferredCurrency, setPreferredCurrency] = useState("USD");
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  // Currency display names for better UX
  const currencyDisplayNames: Record<string, string> = {
    USD: "USD - US Dollar",
    CAD: "CAD - Canadian Dollar",
    GBP: "GBP - British Pound",
    EUR: "EUR - Euro",
    JPY: "JPY - Japanese Yen",
    HKD: "HKD - Hong Kong Dollar",
    CNY: "CNY - Chinese Yuan",
  };

  if (status === "loading") return <div>Loading...</div>;

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <Tabs
          defaultValue="account"
          className="grid grid-cols-1 md:grid-cols-6 gap-6"
        >
          {/* Sidebar with tab triggers */}
          <TabsList className="flex flex-col h-fit space-y-2 bg-true-black p-4 rounded-lg md:col-span-1">
            <TabsTrigger value="account" asChild>
              <Button variant="ghost" className="w-full justify-start">
                Account
              </Button>
            </TabsTrigger>
            <TabsTrigger value="portfolio" asChild>
              <Button variant="ghost" className="w-full justify-start">
                Portfolio
              </Button>
            </TabsTrigger>
          </TabsList>

          {/* Main content area */}
          <div className="md:col-span-5">
            <TabsContent value="portfolio">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p>Portfolio settings content goes here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* User Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">First Name:</span>
                        <span>{session?.user?.first_name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Last Name:</span>
                        <span>{session?.user?.last_name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Email Address:</span>
                        <span>{session?.user?.email || "N/A"}</span>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4">
                      <Button onClick={() => setIsAccountDialogOpen(true)}>
                        Change Account Details
                      </Button>
                      <Button onClick={() => setIsPasswordDialogOpen(true)}>
                        Change Password
                      </Button>
                    </div>

                    {/* Currency Selector */}
                    <div className="space-y-2 max-w-xs">
                      <label className="font-medium">Preferred Currency:</label>
                      <Select
                        value={preferredCurrency}
                        onValueChange={setPreferredCurrency}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currencyDisplayNames[currency] || currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Dialogs for forms */}
        <Dialog
          open={isAccountDialogOpen}
          onOpenChange={setIsAccountDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Account Details</DialogTitle>
            </DialogHeader>
            <ChangeAccountDetailsForm
              onClose={() => setIsAccountDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={isPasswordDialogOpen}
          onOpenChange={setIsPasswordDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
            </DialogHeader>
            <ChangePasswordForm
              onClose={() => setIsPasswordDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  );
}
