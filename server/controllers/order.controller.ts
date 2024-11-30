import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import OrderModel, { IOrder } from "../models/order.model";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMails";
import NotificationModel from "../models/notification.Model";
import { getAllOrdersService, newOrder } from "../services/order.service";

export const createOrder = CatchAsyncError(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { courseId, payment_info } = req.body as IOrder;

			// Fetch the user by ID
			const user = await userModel.findById(req.user?._id).exec();

			if (!user) {
				return next(new ErrorHandler("User not found", 404));
			}

			// Check if the course already exists in the user's enrolled courses
			const courseExistInUser = user.courses.some(
				(course: any) => course?.courseId?.toString() === courseId
			);

			if (courseExistInUser) {
				return next(
					new ErrorHandler("You have already purchased this course", 400)
				);
			}

			// Fetch the course by ID
			const course = await CourseModel.findById(courseId);

			if (!course) {
				return next(new ErrorHandler("Course not found", 404));
			}

			const data: any = {
				courseId: course._id,
				userId: user._id,
				payment_info,
			};

			const courseIdStr = course._id ? course._id.toString() : "";

			const mailData = {
				order: {
					_id: courseIdStr.slice(0, 6),
					name: course.name,
					price: course.price,
					date: new Date().toLocaleDateString("en-US", {
						year: "numeric",
						month: "long",
						day: "numeric",
					}),
				},
			};

			// Render and send email
			const html = await ejs.renderFile(
				path.join(__dirname, "../mails/order-confirmation.ejs"),
				{ order: mailData }
			);

			try {
				await sendMail({
					email: user.email,
					subject: "Order Confirmation",
					template: "order-confirmation.ejs",
					data: mailData,
				});
			} catch (error: any) {
				return next(new ErrorHandler(error.message, 500));
			}

			// Update user's enrolled courses
			user.courses.push({ courseId: courseIdStr });

			
			await NotificationModel.create({
				user: user._id,
				title: "New Order",
				message: `You have a new order for the course: ${course.name}`,
			});

			// Increment course purchase count
			course.purchased = (course.purchased || 0) + 1;
			await course.save();

			// Create the order
			await newOrder(data, res, next);
		} catch (error: any) {
			return next(new ErrorHandler(error.message, 500));
		}
	}
);

// get All orders --- only for admin
export const getAllOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);