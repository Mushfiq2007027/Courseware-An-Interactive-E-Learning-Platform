import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";

// Middleware to authenticate the user
export const isAuthenticated = CatchAsyncError(
	async (req: Request, res: Response, next: NextFunction) => {
		// Ensure cookies are parsed
		const access_token = req.cookies?.access_token;

		if (!access_token) {
			return next(
				new ErrorHandler("Please login to access this resource", 400)
			);
		}

		try {
			const decoded = jwt.verify(
				access_token,
				process.env.ACCESS_TOKEN as string
			) as JwtPayload;

			const user = await redis.get(decoded.id);

			if (!user) {
				return next(new ErrorHandler("User not found", 400));
			}

			// Attach the user information to the request object
			req.user = JSON.parse(user);
			next();
		} catch (error) {
			return next(new ErrorHandler("Invalid or expired token", 400));
		}
	}
);


// validate user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandler(
          `Role: ${req.user?.role} is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};
