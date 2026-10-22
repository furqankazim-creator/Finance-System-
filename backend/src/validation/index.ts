import { body, param } from "express-validator";

const optionalString = (field: string, max: number) =>
  body(field)
    .optional({ values: "falsy" })
    .isString()
    .withMessage(`${field} must be a string`)
    .trim()
    .isLength({ max })
    .withMessage(`${field} cannot exceed ${max} characters`);

const optionalMongoId = (field: string, label: string) =>
  body(field)
    .optional({ values: "falsy", nullable: true })
    .isMongoId()
    .withMessage(`${label} must be a valid ID`);

export const validateObjectIdParam = (field = "id", label = "Resource ID") => [
  param(field).isMongoId().withMessage(`${label} must be a valid ID`),
];

export const authSignUpValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ max: 100 })
    .withMessage("Full name cannot exceed 100 characters"),
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters"),
];

export const authSignInValidation = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidation = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
];

export const resetPasswordValidation = [
  param("token")
    .trim()
    .isLength({ min: 32, max: 128 })
    .withMessage("Reset token is invalid"),
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters"),
];

export const organizationCreateValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Organization name is required")
    .isLength({ max: 100 })
    .withMessage("Organization name cannot exceed 100 characters"),
  body("currency")
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-letter code")
    .isAlpha()
    .withMessage("Currency must contain only letters"),
  body("fiscalYearStart")
    .isInt({ min: 1, max: 12 })
    .withMessage("Fiscal year start must be a month between 1 and 12"),
];

export const organizationUpdateValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Organization name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Organization name cannot exceed 100 characters"),
  body("currency")
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-letter code")
    .isAlpha()
    .withMessage("Currency must contain only letters"),
  body("fiscalYearStart")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Fiscal year start must be a month between 1 and 12"),
];

export const clientCreateValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Client name is required")
    .isLength({ max: 100 })
    .withMessage("Client name cannot exceed 100 characters"),
  body("email").optional({ values: "falsy" }).isEmail().withMessage("Email must be valid").normalizeEmail(),
  optionalString("phone", 30),
  optionalString("address", 500),
  optionalString("company", 100),
  optionalString("notes", 1000),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
];

export const clientUpdateValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Client name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Client name cannot exceed 100 characters"),
  body("email").optional({ values: "falsy" }).isEmail().withMessage("Email must be valid").normalizeEmail(),
  optionalString("phone", 30),
  optionalString("address", 500),
  optionalString("company", 100),
  optionalString("notes", 1000),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
];

export const categoryCreateValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 100 })
    .withMessage("Category name cannot exceed 100 characters"),
  body("type")
    .isIn(["fixed", "variable", "cogs", "opex", "revenue"])
    .withMessage("Category type is invalid"),
  body("color")
    .optional()
    .trim()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Color must be a valid hex code"),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
  optionalMongoId("parentCategoryId", "Parent category"),
];

export const categoryUpdateValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Category name cannot exceed 100 characters"),
  body("type")
    .optional()
    .isIn(["fixed", "variable", "cogs", "opex", "revenue"])
    .withMessage("Category type is invalid"),
  body("color")
    .optional()
    .trim()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Color must be a valid hex code"),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
  optionalMongoId("parentCategoryId", "Parent category"),
];

export const projectCreateValidation = [
  body("clientId").isMongoId().withMessage("Client is required"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Project name is required")
    .isLength({ max: 200 })
    .withMessage("Project name cannot exceed 200 characters"),
  body("budget").isFloat({ min: 0 }).withMessage("Budget must be 0 or greater"),
  body("status")
    .optional()
    .isIn(["active", "on-hold", "completed", "cancelled"])
    .withMessage("Project status is invalid"),
  optionalString("description", 2000),
  body("startDate").optional({ values: "falsy" }).isISO8601().withMessage("Start date must be valid"),
  body("endDate").optional({ values: "falsy" }).isISO8601().withMessage("End date must be valid"),
];

export const projectUpdateValidation = [
  body("clientId").optional().isMongoId().withMessage("Client must be a valid ID"),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Project name cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Project name cannot exceed 200 characters"),
  body("budget").optional().isFloat({ min: 0 }).withMessage("Budget must be 0 or greater"),
  body("status")
    .optional()
    .isIn(["active", "on-hold", "completed", "cancelled"])
    .withMessage("Project status is invalid"),
  optionalString("description", 2000),
  body("startDate").optional({ values: "falsy" }).isISO8601().withMessage("Start date must be valid"),
  body("endDate").optional({ values: "falsy" }).isISO8601().withMessage("End date must be valid"),
];

export const expenseCreateValidation = [
  body("categoryId").isMongoId().withMessage("Category is required"),
  optionalMongoId("projectId", "Project"),
  body("vendor")
    .trim()
    .notEmpty()
    .withMessage("Vendor is required")
    .isLength({ max: 200 })
    .withMessage("Vendor cannot exceed 200 characters"),
  optionalString("description", 500),
  optionalString("notes", 1000),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  body("date").isISO8601().withMessage("Date is required"),
];

export const expenseUpdateValidation = [
  body("categoryId").optional().isMongoId().withMessage("Category must be a valid ID"),
  optionalMongoId("projectId", "Project"),
  body("vendor")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Vendor cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Vendor cannot exceed 200 characters"),
  optionalString("description", 500),
  optionalString("notes", 1000),
  body("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  body("date").optional().isISO8601().withMessage("Date must be valid"),
];

export const invoiceCreateValidation = [
  body("clientId").isMongoId().withMessage("Client is required"),
  optionalMongoId("projectId", "Project"),
  body("invoiceNumber")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Invoice number cannot exceed 50 characters"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  body("issueDate").isISO8601().withMessage("Issue date is required"),
  body("dueDate").isISO8601().withMessage("Due date is required"),
  body("status")
    .optional()
    .isIn(["draft", "sent", "paid", "overdue", "cancelled"])
    .withMessage("Invoice status is invalid"),
  optionalString("description", 2000),
  optionalString("notes", 1000),
];

export const invoiceUpdateValidation = [
  body("clientId").optional().isMongoId().withMessage("Client must be a valid ID"),
  optionalMongoId("projectId", "Project"),
  body("invoiceNumber")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Invoice number cannot exceed 50 characters"),
  body("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  body("issueDate").optional().isISO8601().withMessage("Issue date must be valid"),
  body("dueDate").optional().isISO8601().withMessage("Due date must be valid"),
  body("status")
    .optional()
    .isIn(["draft", "sent", "paid", "overdue", "cancelled"])
    .withMessage("Invoice status is invalid"),
  optionalString("description", 2000),
  optionalString("notes", 1000),
];

export const invoicePaymentValidation = [
  body("amount").isFloat({ gt: 0 }).withMessage("Payment amount must be greater than 0"),
  body("paidDate").isISO8601().withMessage("Payment date is required"),
  body("method")
    .isIn(["bank_transfer", "credit_card", "cash", "cheque", "other"])
    .withMessage("Payment method is invalid"),
  optionalString("reference", 200),
  optionalString("notes", 1000),
];

export const payrollCreateValidation = [
  body("employeeName")
    .trim()
    .notEmpty()
    .withMessage("Employee name is required")
    .isLength({ max: 100 })
    .withMessage("Employee name cannot exceed 100 characters"),
  body("employeeEmail")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Employee email must be valid")
    .normalizeEmail(),
  optionalString("role", 100),
  body("month").isInt({ min: 1, max: 12 }).withMessage("Month must be between 1 and 12"),
  body("year").isInt({ min: 2000, max: 2100 }).withMessage("Year must be between 2000 and 2100"),
  body("gross").isFloat({ min: 0 }).withMessage("Gross amount must be 0 or greater"),
  body("deductions").optional().isFloat({ min: 0 }).withMessage("Deductions must be 0 or greater"),
  body("status").optional().isIn(["pending", "paid"]).withMessage("Payroll status is invalid"),
  body("paidDate").optional({ values: "falsy" }).isISO8601().withMessage("Paid date must be valid"),
  optionalString("notes", 1000),
];

export const payrollUpdateValidation = [
  body("employeeName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Employee name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Employee name cannot exceed 100 characters"),
  body("employeeEmail")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Employee email must be valid")
    .normalizeEmail(),
  optionalString("role", 100),
  body("month").optional().isInt({ min: 1, max: 12 }).withMessage("Month must be between 1 and 12"),
  body("year").optional().isInt({ min: 2000, max: 2100 }).withMessage("Year must be between 2000 and 2100"),
  body("gross").optional().isFloat({ min: 0 }).withMessage("Gross amount must be 0 or greater"),
  body("deductions").optional().isFloat({ min: 0 }).withMessage("Deductions must be 0 or greater"),
  body("status").optional().isIn(["pending", "paid"]).withMessage("Payroll status is invalid"),
  body("paidDate").optional({ values: "falsy" }).isISO8601().withMessage("Paid date must be valid"),
  optionalString("notes", 1000),
];
