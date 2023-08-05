import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    console.log('server inbox');
    console.log(request.headers);
    console.log(await request.json());
}
