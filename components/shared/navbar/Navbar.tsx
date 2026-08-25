import Image from "next/image";
import Link from "next/link";
import React from "react";
import Theme from "./Theme";
import MobileNav from "./MobileNav";
import GlobalSearch from "../search/GlobalSearch";
import UserMenu from "@/components/auth/UserMenu";

interface NavbarProps {
  userId?: string;
  userImage?: string;
}

const Navbar = ({ userId, userImage }: NavbarProps) => {
  return (
    <nav className="flex-between background-light900_dark200 fixed z-50 w-full gap-5 p-6 shadow-light-300 dark:shadow-none sm:px-12">
      <Link href="/" className="flex items-center gap-1">
        <Image
          src="/assets/images/site-logo.svg"
          width={23}
          height={23}
          alt="CasbahConnect"
        />
        <p className="h2-bold font-spaceGrotesk text-dark-100 dark:text-light-900 max-sm:hidden">
          Casbah <span className="text-primary-500">Connect</span>
        </p>
      </Link>
      <GlobalSearch />
      <div className="flex-between gap-5">
        <Theme />
        {userId && (
          <UserMenu
            imageUrl={userImage || "/assets/images/default-logo.svg"}
            userId={userId}
          />
        )}
        <MobileNav userId={userId} />
      </div>
    </nav>
  );
};

export default Navbar;
