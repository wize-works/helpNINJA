import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import Image from "next/image";

export default function Titlebar() {
    return (
        <header className="navbar h-16 sticky top-0 z-50 bg-base-100/80 supports-[backdrop-filter]:bg-base-100/60 backdrop-blur border-b border-base-200">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex items-center gap-3">
                {/* Left: brand + mobile sidebar toggle */}
                <div className="navbar-start gap-2">
                    {/* Mobile sidebar toggle (works with a DaisyUI drawer if present) */}
                    <label htmlFor="hn-drawer" className="btn btn-ghost btn-square lg:hidden" aria-label="Open menu">
                        <i className="fa-duotone fa-solid fa-bars text-lg" aria-hidden />
                    </label>
                    <Link href="/" className="btn btn-ghost normal-case text-xl">
                        <span className="inline-flex items-center">
                            <Image src="/logo-black.svg" alt="HelpNinja Logo" width={32} height={32} className="mr-2" />
                            <span className="">
                                help
                            </span>
                            <span className="text-primary font-bold">NINJA</span>
                        </span>
                    </Link>
                </div>

                {/* Center: main nav (desktop) */}
                <div className="navbar-center hidden md:flex">
                    <nav className="menu menu-horizontal px-1">
                        <li>
                            <Link href="/dashboard" className="font-medium">
                                <i className="fa-duotone fa-solid fa-gauge-high mr-2" aria-hidden />
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link href="/docs" className="font-medium">
                                <i className="fa-duotone fa-solid fa-book mr-2" aria-hidden />
                                Docs
                            </Link>
                        </li>
                        <li>
                            <Link href="/account" className="font-medium">
                                <i className="fa-duotone fa-solid fa-user mr-2" aria-hidden />
                                Account
                            </Link>
                        </li>
                    </nav>
                </div>

                {/* Right: utilities */}
                <div className="navbar-end ml-auto flex items-center gap-2">
                    <div className="hidden md:block">
                        <label className="input input-bordered input-sm flex items-center gap-2">
                            <i className="fa-duotone fa-solid fa-magnifying-glass" aria-hidden />
                            <input type="text" className="grow" placeholder="Search…" />
                        </label>
                    </div>
                    <button className="btn btn-ghost btn-circle hidden sm:inline-flex" aria-label="Notifications">
                        <i className="fa-duotone fa-solid fa-bell" aria-hidden />
                    </button>
                    <div className="dropdown dropdown-end">
                        <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
                            <div className="bg-neutral text-neutral-content w-8 rounded-full">
                                <span className="text-xs">HN</span>
                            </div>
                        </div>
                        <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                            <li><Link href="/account">Profile</Link></li>
                            <li><Link href="/settings">Settings</Link></li>
                            <li><a>Sign out</a></li>
                        </ul>
                    </div>
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}