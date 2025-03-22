"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { status } = useSession();
  const pathname = usePathname();
  const isLoggedIn = status === "authenticated";
  const isHomePage = pathname === "/";
  const isAuthPage =
    pathname === "/auth/login" ||
    pathname === "/auth/register" ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/reset-password";

  useEffect(() => {
    console.log("Pathname updated to:", pathname);
  }, [pathname]);

  const isActiveLink = (href: string): boolean => {
    if (href === "/" && pathname === "/") {
      return false;
    }
    return pathname === href;
  };

  return (
    <nav className="flex justify-between items-center p-2">
      {/* Left Section: Portman Logo and Home Button (only when logged in) */}
      <div className="flex items-center space-x-2">
        <Link href="/" className="text-lg font-bold">
          <span
            className={cn(
              "relative",
              isActiveLink("/") && "text-red font-bold",
            )}
          >
            Portman
            {isActiveLink("/") && (
              <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 border-b-2 border-red" />
            )}
          </span>
        </Link>
        {isLoggedIn && !isHomePage && !isAuthPage && (
          <Button
            variant="ghost"
            className={cn(
              "hover:bg-red hover:text-white transition-colors data-[active]:bg-transparent",
              isActiveLink("/") && "text-red font-bold",
            )}
          >
            <Link href="/" legacyBehavior passHref>
              Home
            </Link>
          </Button>
        )}
      </div>

      {/* Middle Section: Navigation Tabs */}
      <NavigationMenu className="flex-grow mx-auto">
        <NavigationMenuList className="flex space-x-6">
          {isLoggedIn && !isAuthPage ? (
            <>
              <NavigationMenuItem>
                <Link href="/dashboard" legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "relative data-[active]:bg-transparent",
                      isActiveLink("/dashboard") && "text-red font-bold",
                    )}
                  >
                    Dashboard
                    {isActiveLink("/dashboard") && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 border-b-2 border-red" />
                    )}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/portfolio" legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "relative data-[active]:bg-transparent",
                      isActiveLink("/portfolio") && "text-red font-bold",
                    )}
                  >
                    Portfolio
                    {isActiveLink("/portfolio") && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 border-b-2 border-red" />
                    )}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/market" legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "relative data-[active]:bg-transparent",
                      isActiveLink("/market") && "text-red font-bold",
                    )}
                  >
                    Market
                    {isActiveLink("/market") && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 border-b-2 border-red" />
                    )}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/reports" legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "relative data-[active]:bg-transparent",
                      isActiveLink("/reports") && "text-red font-bold",
                    )}
                  >
                    Reports
                    {isActiveLink("/reports") && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 border-b-2 border-red" />
                    )}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/settings" legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "relative data-[active]:bg-transparent",
                      isActiveLink("/settings") && "text-red font-bold",
                    )}
                  >
                    Settings
                    {isActiveLink("/settings") && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 border-b-2 border-red" />
                    )}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </>
          ) : null}
        </NavigationMenuList>
      </NavigationMenu>

      {/* Right Section: Sign In/Out and Register */}
      <div className="flex space-x-4">
        {isLoggedIn ? (
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/" })}
            className={cn(
              "relative text-base hover:bg-red hover:text-white transition-colors border-2 border-red",
              isActiveLink("/") && "text-red font-bold",
            )}
          >
            Sign Out
            {isActiveLink("/") && (
              <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 border-b-2 border-red" />
            )}
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              className={cn(
                "hover:bg-red hover:text-white transition-colors border-2 border-red",
                isActiveLink("/auth/login") && "text-red font-bold",
              )}
            >
              <Link href="/auth/login" legacyBehavior passHref>
                Sign In
              </Link>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "hover:bg-red hover:text-white transition-colors border-2 border-red",
                isActiveLink("/auth/register") && "text-red font-bold",
              )}
            >
              <Link href="/auth/register" legacyBehavior passHref>
                Register
              </Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
