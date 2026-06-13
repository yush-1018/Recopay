/**
 * Generic Zod validation middleware factory.
 * Usage: router.post("/", protect, validate(mySchema), controller)
 *
 * On failure returns 400 with a structured errors array:
 *   { message: "Validation failed", errors: [{ field, message }] }
 */
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
        }));
        return res.status(400).json({ message: "Validation failed", errors });
    }
    // Replace req.body with the parsed (and coerced) data
    req.body = result.data;
    next();
};

export default validate;
