export interface IUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: "STUDENT" | "DRIVER" | "ADMIN";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
