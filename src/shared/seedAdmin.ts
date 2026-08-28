// src/shared/seedAdmin.ts
import { EnvVars } from "../app/config/env";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

/**
 * Seeds the initial admin user into the database on server start.
 * Uses ADMIN_PHONE and ADMIN_PASSWORD from environment variables.
 * If an admin already exists, this function is a no-op.
 */
export const seedAdmin = async (): Promise<void> => {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      console.log("Admin user already exists. Skipping seeding.");
      return;
    }

    const hashedPassword = await bcrypt.hash(EnvVars.ADMIN_PASSWORD, 10);

    const adminUser = await prisma.user.create({
      data: {
        name: "Admin",
        phone: EnvVars.ADMIN_PHONE as string,
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
    });

    console.log("Admin user seeded successfully:", adminUser.phone);
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
};
