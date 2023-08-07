import { prisma } from '@/lib/db';
import crypto, { webcrypto }from 'crypto' 


async function main() {
    const blogs = await prisma.blog.findMany()

    console.log(blogs);

    for (const blog of blogs) {
        const keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        })
        


        await prisma.blog.update({
            where: {
                id: blog.id
            },
            data: {
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey,
                updatedAt: blog.updatedAt,
            }
        })
    }
}

main()
