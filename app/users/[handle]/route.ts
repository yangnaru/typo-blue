import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest, { params }: { params: { username: string }}) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/${params.username}`);
}
