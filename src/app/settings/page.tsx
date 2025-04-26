// Settings page

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
import { useEffect, useState } from "react";
import { ChangeEmailForm } from "@/components/ChangeEmailForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SUPPORTED_CURRENCIES, Currency } from "@/lib/constants";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import PortfolioSettingsList from "@/components/PortfolioSettingsList";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>();
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Map currency codes to readable names
  const currencyDisplayNames: Record<string, string> = {
    USD: "USD - US Dollar",
    CAD: "CAD - Canadian Dollar",
    GBP: "GBP - British Pound",
    EUR: "EUR - Euro",
    JPY: "JPY - Japanese Yen",
    HKD: "HKD - Hong Kong Dollar",
    CNY: "CNY - Chinese Yuan",
  };

  // Initialise preferred currency when session loads
  useEffect(() => {
    if (session?.user?.preferences?.currency) {
      setPreferredCurrency(session.user.preferences.currency as Currency);
    }
  }, [session]);

  // Handle changing preferred currency
  const handleCurrencyChange = async (newCurrency: string) => {
    try {
      const response = await fetch("/api/user/change-currency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currency: newCurrency }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(error.error || "Failed to update currency");
      }

      const result = await response.json();
      setPreferredCurrency(newCurrency as Currency);

      await update({
        preferences: result.user.preferences,
      });
    } catch (error) {
      console.error("Error updating currency:", error);
    }
  };
  if (status === "loading") return <div>Loading...</div>;
  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4 ">
        <div className="bg-true-black rounded-lg p-4 mb-2">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <Tabs
          defaultValue="account"
          className="grid grid-cols-1 md:grid-cols-6 gap-6"
        >
          <TabsList className="flex flex-col h-fit space-y-2 bg-true-black p-4 rounded-lg md:col-span-1">
            <TabsTrigger value="account" asChild>
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-red"
              >
                Account
              </Button>
            </TabsTrigger>
            <TabsTrigger value="portfolio" asChild>
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-red"
              >
                Portfolio
              </Button>
            </TabsTrigger>
          </TabsList>

          <div className="md:col-span-5">
            <TabsContent value="account">
              <Card className="bg-true-black">
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between hover:bg-black p-2 rounded-lg">
                        <span className="font-medium">First Name:</span>
                        <span>{session?.user?.first_name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between hover:bg-black p-2 rounded-lg">
                        <span className="font-medium">Last Name:</span>
                        <span>{session?.user?.last_name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between hover:bg-black p-2 rounded-lg">
                        <span className="font-medium">Email Address:</span>
                        <span>{session?.user?.email || "N/A"}</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button onClick={() => setIsAccountDialogOpen(true)}>
                        Change Account Details
                      </Button>
                      <Button onClick={() => setIsPasswordDialogOpen(true)}>
                        Change Password
                      </Button>
                    </div>

                    <div className="space-y-2 max-w-xs">
                      <label className="font-medium">Preferred Currency:</label>
                      <Select
                        value={preferredCurrency}
                        onValueChange={handleCurrencyChange}
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

                    <div className="flex gap-4">
                      <Button
                        variant="destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="bg-red hover:bg-white hover:text-true-black"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="portfolio">
              <Card className="bg-true-black">
                <CardHeader>
                  <CardTitle>Portfolio Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <PortfolioSettingsList />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <Dialog
          open={isAccountDialogOpen}
          onOpenChange={setIsAccountDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Account Details</DialogTitle>
            </DialogHeader>
            <ChangeEmailForm onClose={() => setIsAccountDialogOpen(false)} />
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
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                This action cannot be undone. All data related to your account,
                including portfolios, transactions, reports, and watchlists,
                will be permanently deleted. Please enter your password to
                confirm.
              </DialogDescription>
            </DialogHeader>
            <DeleteAccountForm onClose={() => setIsDeleteDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  );
}
