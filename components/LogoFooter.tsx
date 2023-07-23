import Link from "next/link";

export default function LogoFooter() {
    return <h1 className="py-8 bottom-0">
        <hr className="bg-neutral-500" />
        <Link href="/" className="text-sm font-semibold"><span className="text-neutral-500">powered by</span> typo <span className="text-blue-500">blue</span></Link>
    </h1>
}
