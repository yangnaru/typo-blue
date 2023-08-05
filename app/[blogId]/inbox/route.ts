import { NextRequest } from "next/server";

export function POST(request: NextRequest) {
    console.log('user inbox');
    console.log(request.headers);
    console.log(request.json());
}
