import { prisma } from "./src/db";

async function main() {
    console.log("Seeding initial admin user...");

    const adminEmail = "admin@zenku.local";
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (existing) {
        console.log("Admin user already exists.");
        return;
    }

    const hashedPassword = await Bun.password.hash("Admin123");
    const admin = await prisma.user.create({
        data: {
            email: adminEmail,
            name: "System Admin",
            password: hashedPassword,
            role: "ADMIN",
        },
    });

    console.log(`Admin user created: ${admin.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
