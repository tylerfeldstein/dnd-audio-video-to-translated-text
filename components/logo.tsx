import Link from "next/link"

export function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2">
      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-sky-500 to-blue-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M17.5 22h.5c.5 0 1-.2 1.4-.6.4-.4.6-.9.6-1.4V7.5L14.5 2H6c-.5 0-1 .2-1.4.6C4.2 3 4 3.5 4 4v3" />
          <path d="M14 2v6h6"/>
          <path d="M9 18h1"/>
          <path d="M13 18h2"/>
          <path d="M3 18h1"/>
          <path d="M5 22v-4"/>
          <path d="M9 22v-4"/>
          <path d="M13 22v-4"/>
          <path d="M17 22v-4"/>
        </svg>
      </div>
      <div className="font-bold text-xl">
        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">Trans</span>
        <span>scribe</span>
      </div>
    </Link>
  )
} 