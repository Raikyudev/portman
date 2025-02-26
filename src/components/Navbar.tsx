import Link from "next/link";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className={"flex justify-between items-center p-2"}>
      <Link href="/" className="text-lg font-bold">
        Portman
      </Link>

      <NavigationMenu className={"hidden md:flex"}>
        <NavigationMenuList className={"flex space-x-6"}>
          <NavigationMenuItem>
            <Link href={"/"} legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                How this works
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href={"/"} legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                How this works
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href={"/"} legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                About
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <div className={"flex space-x-4"}>
        <Button variant={"ghost"}>
          <Link
            href={"/"}
            legacyBehavior
            passHref
            className={
              "border border-white text-white px-4 py-2 rounded-md hover:bg-gray-700"
            }
          >
            Sign in
          </Link>
        </Button>

        <Button variant={"ghost"}>
          <Link href={"/auth/register"} legacyBehavior passHref>
            Register
          </Link>
        </Button>
      </div>
    </nav>
  );
}
