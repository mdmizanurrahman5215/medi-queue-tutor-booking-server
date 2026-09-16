const express = require("express");
const { ObjectId } = require("mongodb");

const authRoutes = (authCollections) => {
  const router = express.Router();

  // POST /api/user - Register/Create User or Tutor Profile
  router.post("/", async (req, res) => {
    try {
      const userData = req?.body;

      // Required fields list
      const requiredFields = [
        "name",
        "email",
      ];

      // Validation check
      for (const field of requiredFields) {
        if (!userData?.[field]) {
          return res?.status(400)?.json({
            success: false,
            message: `Missing required field: ${field}`,
          });
        }
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

      // Construct New User Object
      const newUser = {
        name: userData?.name,
        email: userData?.email,
        image: userData?.image || "",
        role: userData?.role || "user", // Default role
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