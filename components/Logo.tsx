import Link from "next/link";

export default function Logo() {
    return <h1 className="my-4">
        <Link href="/" className="text-xl font-extrabold">typo <span className="text-blue-500">blue</span></Link>
    </h1>
}
