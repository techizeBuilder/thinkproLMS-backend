import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export const checkRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Role checking logic
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    console.log("✅ Role check passed for role:", role);
    next();
  };
};
