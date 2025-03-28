"use client"

import Link from "next/link"
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Logo } from "@/components/logo"
import { FileText, Headphones, Languages, MessageSquare } from "lucide-react"

export function NavBar() {
  const { isSignedIn } = useUser()

  return (
    <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <Logo />
        <NavigationMenu className="mx-6 hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Features</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-2">
                  <li className="row-span-3">
                    <NavigationMenuLink asChild>
                      <Link
                        className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-br from-blue-600 via-sky-500 to-blue-400 p-6 no-underline outline-none focus:shadow-md"
                        href="/transcribe"
                      >
                        <div className="text-lg font-medium text-white">
                          Start Using Transscribe
                        </div>
                        <p className="text-sm text-white/80">
                          Jump right in and start transcribing your audio and video content with our advanced AI tools.
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <Link
                      href="/transcribe"
                      className="block select-none space-y-1 rounded-md p-3 no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <Headphones className="h-4 w-4 text-blue-500" />
                        <div className="text-sm font-medium">Transcription</div>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        Convert speech to text with unmatched accuracy.
                      </p>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/"
                      className="block select-none space-y-1 rounded-md p-3 no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <Languages className="h-4 w-4 text-indigo-500" />
                        <div className="text-sm font-medium">Translation</div>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        Break language barriers with AI-powered translation.
                      </p>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/"
                      className="block select-none space-y-1 rounded-md p-3 no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-sky-500" />
                        <div className="text-sm font-medium">AI Enhancement</div>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        Polish content with grammar correction and style improvements.
                      </p>
                    </Link>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/pdf" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>PDF Tools</span>
                  </div>
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/transcribe" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <div className="flex items-center gap-1">
                    <Headphones className="h-4 w-4" />
                    <span>Transcribe</span>
                  </div>
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>About</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4">
                  <li className="row-span-3">
                    <NavigationMenuLink asChild>
                      <Link
                        className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                        href="/"
                      >
                        <div className="mb-2 mt-4 text-lg font-medium">
                          About Transscribe
                        </div>
                        <p className="text-sm leading-tight text-muted-foreground">
                          An advanced AI-powered platform for transcribing, translating, and enhancing audio and video content.
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-4">
          {!isSignedIn && (
            <div className="hidden sm:flex items-center gap-2">
              <SignInButton mode="modal">
                <Button variant="ghost" className="text-sm font-medium">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-full px-4">
                  Sign Up Free
                </Button>
              </SignUpButton>
            </div>
          )}
          
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <SignInButton mode="modal">
                      <button className="w-full text-left">Sign In</button>
                    </SignInButton>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <SignUpButton mode="modal">
                      <button className="w-full text-left">Sign Up</button>
                    </SignUpButton>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 