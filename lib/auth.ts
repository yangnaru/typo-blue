import EmailProvider from "next-auth/providers/email";
import { prisma } from "./db";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { createTransport } from "nodemailer"

export const authOptions = {
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error'
    },
    adapter: PrismaAdapter(prisma),
    providers: [
        EmailProvider({
            server: {
                host: process.env.EMAIL_SERVER_HOST,
                port: Number(process.env.EMAIL_SERVER_PORT),
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD,
                },
            },
            from: process.env.EMAIL_FROM,
            async sendVerificationRequest(params) {
                const { identifier, url, provider } = params;

                const transport = createTransport(provider.server);
                const result = await transport.sendMail({
                    to: identifier,
                    from: provider.from,
                    subject: '타이포 블루 로그인 링크',
                    text: text(url),
                })

                const failed = result.rejected.concat(result.pending).filter(Boolean)
                if (failed.length) {
                    throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`)
                }
            },
        })
    ],
};

function text(url: string) {
    return `타이포 블루 로그인 링크:\n\n${url}`
}
