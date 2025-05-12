// @ts-nocheck
'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Menu, Coins, Leaf, Search, Bell, User, ChevronDown, LogIn, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useUser, SignOutButton } from "@clerk/nextjs"

import { syncUserToDB } from "@/utils/syncUser";

interface HeaderProps {
  onMenuClick: () => void;
  totalEarnings: number;
}

export default function Header({ onMenuClick, totalEarnings }: HeaderProps) {
  const { isSignedIn, user, isLoaded } = useUser();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [balance, setBalance] = useState(0);
  const isMobile = useMediaQuery("(max-width: 768px)");

useEffect(() => {
  const syncUser = async () => {
    if (user?.primaryEmailAddress?.emailAddress && user?.fullName) {
      await syncUserToDB(user.primaryEmailAddress.emailAddress, user.fullName);
    }
  };

  syncUser();
}, [user]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const email = user?.emailAddresses[0]?.emailAddress;
      if (!email) return;

      // Use email directly to fetch notifications from your DB
      const res = await fetch(`/api/notifications?email=${email}`);

      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data); // ✅ Update the notification badge
      }

      console.log("Notifications:", data);
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const fetchBalance = async () => {
      const email = user?.emailAddresses[0]?.emailAddress;
      if (!email) return;

      try {
        const res = await fetch(`/api/balance?email=${email}`);
        if (!res.ok) throw new Error("Failed to fetch balance");
        const data = await res.json();
        if (data?.balance !== undefined) {
          setBalance(data.balance);
        }
      } catch (err) {
        console.error("Error fetching balance:", err);
      }      

      const res = await fetch(`/api/balance?email=${email}`);

      const data = await res.json();
      if (data?.balance !== undefined) {
        setBalance(data.balance); // ✅ This updates the balance UI
      }

      console.log("Balance:", data);
    };

    fetchBalance();

    const handleBalanceUpdate = (event: CustomEvent) => {
      setBalance(event.detail);
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
    };
  }, [user]);

  const handleNotificationClick = async (notificationId: number) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  if (!isLoaded) return <div>Loading user...</div>;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2 md:mr-4" onClick={onMenuClick}>
            <Menu className="h-6 w-6" />
          </Button>
          <Link href="/" className="flex items-center">
            <Leaf className="h-6 w-6 md:h-8 md:w-8 text-green-500 mr-1 md:mr-2" />
            <div className="flex flex-col">
              <span className="font-bold text-base md:text-lg text-gray-800">Waste Tracking App</span>
            </div>
          </Link>
        </div>
        {!isMobile && (
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        )}
        <div className="flex items-center">
          {isMobile && (
            <Button variant="ghost" size="icon" className="mr-2">
              <Search className="h-5 w-5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <DropdownMenuItem key={n.id} onClick={() => handleNotificationClick(n.id)}>
                    <div className="flex flex-col">
                      <span className="font-medium">{n.type}</span>
                      <span className="text-sm text-gray-500">{n.message}</span>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem>No new notifications</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="mr-2 md:mr-4 flex items-center bg-gray-100 rounded-full px-2 md:px-3 py-1">
            <Coins className="h-4 w-4 md:h-5 md:w-5 mr-1 text-green-500" />
            <span className="font-semibold text-sm md:text-base text-gray-800">
              {balance.toFixed(2)}
            </span>
          </div>
          {!isSignedIn ? (
            <Link href="/sign-in">
              <Button className="bg-green-600 hover:bg-green-700 text-white text-sm md:text-base">
                Login
                <LogIn className="ml-1 md:ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex items-center">
                  <User className="h-5 w-5 mr-1" />
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  {user?.fullName || "Unknown User"}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SignOutButton>
                    <button className="flex items-center gap-2 text-red-600 w-full">
                      Sign Out
                      <LogOut className="h-4 w-4" />
                    </button>
                  </SignOutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
