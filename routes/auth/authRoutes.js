const express = require("express");
const { ObjectId } = require("mongodb");

const authRoutes = (authCollections) => {
  const router = express.Router();

  // POST /api/user - Register/Create User or Tutor Profile
  router.post("/", async (req, res) => {
    try {
      const userData = req?.body;

      // Required fields list
      const requiredFields = ["name", "email", "password"];

      // Validation check for missing fields
      for (const field of requiredFields) {
        if (!userData?.[field]) {
          return res?.status(400)?.json({
            success: false,
            message: `Missing required field: ${field}`,
          });
        }
      }

      const { password } = userData;

      // Password Criteria Validations
      if (password.length < 6) {
        return res?.status(400)?.json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      if (!/[A-Z]/.test(password)) {
        return res?.status(400)?.json({
          success: false,
          message: "Password must contain at least one uppercase letter",
        });
      }

      if (!/[a-z]/.test(password)) {
        return res?.status(400)?.json({
          success: false,
          message: "Password must contain at least one lowercase letter",
        });
      }

      // 1. Special Character Validation Check
      if (!/[!@#$%^&*(),.?":{}|<>]/?.test(password)) {
        return res?.status(400)?.json({
          success: false,
          message: "Password must contain at least one special character",
        });
      }

      // Check if user already exists
      const existingUser = await authCollections?.findOne({
        email: userData?.email,
      });

      if (existingUser) {
        return res?.status(409)?.json({
          success: false,
          message: "User already exists with this email",
        });
      }

      // 2. Role handling: lowercase conversion
      const normalizedRole = userData?.role ? userData?.role?.toLowerCase() : "user";

      // Construct New User Object
      const newUser = {
        name: userData?.name,
        email: userData?.email,
        image: userData?.image || "",
        role: normalizedRole, 
        createdAt: new Date().toISOString(),
      };

      const result = await authCollections?.insertOne(newUser);

      return res?.status(201)?.json({
        success: true,
        message: "User created successfully",
        insertedId: result?.insertedId,
        data: { _id: result?.insertedId, ...newUser },
      });
    } catch (error) {
      console.error("Error creating user:", error);

      return res?.status(500)?.json({
        success: false,
        message: "Failed to create user profile",
        error: error?.message,
      });
    }
  });

  return router;
};

module.exports = authRoutes;