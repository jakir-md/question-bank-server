import { IUser } from "./user.interface";
import bcrypt from "bcryptjs";
import ApiError from "../../error/ApiError";
import { prisma } from "../../../shared/prisma";
import { Prisma } from "@prisma/client";

// CREATE USER
const createUserIntoDB = async (payload: Partial<IUser>) => {
  try {
    const { name, email, password, phone, role } = payload;

    if (!name || !email) {
      throw new ApiError(400, "Name and Email are required");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(400, "User with this email already exists");
    }

    let hashedPassword: string | undefined = undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const result = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || "STUDENT",
      },
    });

    return result;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Internal Server Error: " + error.message);
  }
};

// GET ALL USERS (PAGINATION + SEARCH)
const getAllUsersFromDB = async (
  page: number = 1,
  limit: number = 10,
  search: string = "",
) => {
  try {
    const skip = (page - 1) * limit;
    const whereCondition: Prisma.UserWhereInput = {
      isActive: true,
    };
    if (search) {
      whereCondition.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.user.count({ where: whereCondition });

    const users = await prisma.user.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    throw new ApiError(500, "Failed to fetch users: " + error.message);
  }
};

const getUserByIdFromDB = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) throw new ApiError(404, "User not found");

    return user;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Database error: " + error.message);
  }
};

export const updateUserIntoDB = async (
  id: string,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
  },
) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");

    const updateData: Prisma.UserUpdateInput = {};

    if (payload.name && payload.name !== user.name) {
      updateData.name = payload.name;
    }
    if (payload.phone && payload.phone !== user.phone) {
      const isPhoneTaken = await prisma.user.findUnique({
        where: { phone: payload.phone },
      });
      if (isPhoneTaken) {
        throw new ApiError(
          400,
          "This phone number is already in use by another account",
        );
      }
      updateData.phone = payload.phone;
    }

    if (payload.email && payload.email !== user.email) {
      const isEmailTaken = await prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (isEmailTaken) {
        throw new ApiError(
          400,
          "This email is already in use by another account",
        );
      }

      updateData.email = payload.email;
    }

    if (Object.keys(updateData).length === 0) {
      return user;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to update user: " + error.message);
  }
};

export const deleteUserFromDB = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");

    if (!user.isActive) {
      throw new ApiError(400, "User is already inactive");
    }

    const deletedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    return deletedUser;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to delete user: " + error.message);
  }
};

export const UserServices = {
  createUserIntoDB,
  getAllUsersFromDB,
  getUserByIdFromDB,
  updateUserIntoDB,
  deleteUserFromDB,
};
