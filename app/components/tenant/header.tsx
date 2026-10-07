"use client";

import { UserButton } from "@clerk/nextjs";
import { useState } from "react";

export default function Header({
  tenantName,
}: {
  tenantName: string;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="flex items-center justify-between bg-white px-4 py-2 shadow max-[480px]: max-[480px]:gap-2">
      <span className="block text-lg font-semibold text-gray-900">
        Nexus Thrive
      </span>

      <div className="flex items-center gap-1.5 max-[480px]:hidden">
        <label className="rounded border border-green-500 bg-green-300 px-2 py-1 text-green-800 max-sm:text-sm">
          {tenantName}
        </label>

        <UserButton />
      </div>

      <div
        className="hidden cursor-pointer max-[480px]:block max-[480px]:flex max-[480px]:flex-col max-[480px]:gap-1.5 absolute right-4 top-2 z-50"
        onClick={handleMenuClick}
      >
        <div className="h-1 w-6 rounded bg-black" />
        <div className="h-1 w-6 rounded bg-black" />
        <div className="h-1 w-6 rounded bg-black" />
      </div>
      <div className="hidden max-[480px]:block">
        {isMenuOpen && (
          <div className="absolute w-full right-0 top-12 z-50 flex gap-2 rounded border border-gray-300 bg-white p-2 shadow">
            <label className="rounded w-full text-center border border-green-500 bg-green-300 px-2 py-1 text-green-800 max-sm:text-sm">
              {tenantName}
            </label>

            <UserButton />
          </div>
        )}
      </div>
    </header>
  );
}
