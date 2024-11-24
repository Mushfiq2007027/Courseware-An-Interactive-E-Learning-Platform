class ErrorHandler extends Error {
	statusCode: Number;

	constructor(message: any, statusCode: Number) {
		super(message);
		this.statusCode = statusCode;

		//Error.captureStackTrace(this, this.constructor);
		// Type assertion to bypass TypeScript error
		(Error as any).captureStackTrace?.(this, this.constructor);
	}
}

export default ErrorHandler;
