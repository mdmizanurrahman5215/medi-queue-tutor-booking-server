const express = require("express");
const { ObjectId } = require("mongodb");
const validateToken = require("../../middleware/authMiddleware");

const tutorRoutes = (tutorsCollections,bookingsCollections) => {
  const router = express.Router();

  // 1. Get All Tutors
  router.get("/", async (req, res) => {
    try {
      const tutors = await tutorsCollections.find().toArray();
      res.status(200).json(tutors);
    } catch (error) {
      console.error("Error fetching tutors:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tutors",
      });
    }
  });

  // 2. Get My Tutors (Specific Routes MUST come before Dynamic Param Routes like /:id)
  router.get("/my-tutors", validateToken, async (req, res) => {
    try {
      // টোকেন ডিকোড অথবা কোয়েরি পারামস থেকে আইডি এবং ইমেইল নেওয়া
      const userId = req.user?.id || req.user?._id || req.query.userId;
      const userEmail = req.user?.email || req.query.email;

      if (!userId && !userEmail) {
        return res.status(400).json({
          success: false,
          message: "User ID or Email is required to fetch tutors",
        });
      }

      // userId অথবা createdByEmail / userEmail দিয়ে ডাটা খোঁজা
      const query = {
        $or: [
          ...(userId ? [{ userId: userId }] : []),
          ...(userEmail ? [{ createdByEmail: userEmail }, { userEmail: userEmail }] : []),
        ],
      };

      const myTutors = await tutorsCollections
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        data: myTutors,
      });
    } catch (error) {
      console.error("Error fetching my tutors:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch your tutor list",
      });
    }
  });

  // 3. Get Tutor By ID (Dynamic Route)
  router.get("/:id", validateToken, async (req, res) => {
    try {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Tutor ID",
        });
      }

      const query = { _id: new ObjectId(id) };
      const tutor = await tutorsCollections.findOne(query);

      if (!tutor) {
        return res.status(404).json({
          success: false,
          message: "Tutor not found",
        });
      }

      res.status(200).json(tutor);
    } catch (error) {
      console.error("Error fetching tutor details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tutor details",
      });
    }
  });

  // 4. Create Tutor
  router.post("/", async (req, res) => {
    try {
      const tutorData = req?.body;

      const requiredFields = [
        "tutorName", 
        "image", 
        "subject", 
        "bio", 
        "hourlyFee", 
        "totalSlot", 
        "sessionStartDate", 
        "institution", 
        "experience", 
        "location", 
        "teachingMode", 
        "createdByEmail"
      ];

      for (const field of requiredFields) {
        if (!tutorData?.[field]) {
          return res?.status(400)?.json({
            success: false,
            message: `Missing required field: ${field}`,
          });
        }
      }

      const newTutor = {
        tutorName: tutorData?.tutorName,
        image: tutorData?.image,
        subject: tutorData?.subject,
        bio: tutorData?.bio,
        qualification: tutorData?.qualification ?? "",
        availableDays: tutorData?.availableDays ?? "Sun - Thu",
        availableTimeSlot: tutorData?.availableTimeSlot ?? "05:00 PM - 08:00 PM",
        hourlyFee: Number(tutorData?.hourlyFee ?? 0),
        totalSlot: Number(tutorData?.totalSlot ?? 0),
        sessionStartDate: tutorData?.sessionStartDate ? new Date(tutorData?.sessionStartDate)?.toISOString() : new Date()?.toISOString(),
        institution: tutorData?.institution,
        experience: tutorData?.experience,
        location: tutorData?.location,
        teachingMode: tutorData?.teachingMode,
        rating: 5.0,
        reviewCount: 0,
        languages: Array.isArray(tutorData?.languages) ? tutorData?.languages : [],
        skills: Array.isArray(tutorData?.skills) ? tutorData?.skills : [],
        
        // 🔑 User Identity Fields (userId সহ সেভ করা)
        userId: tutorData?.userId || "",
        createdByEmail: tutorData?.createdByEmail,
        createdByName: tutorData?.createdByName || "",
        createdAt: new Date()?.toISOString(),
      };

      const result = await tutorsCollections?.insertOne(newTutor);

      return res?.status(201)?.json({
        success: true,
        message: "Tutor profile created successfully",
        insertedId: result?.insertedId,
        data: { _id: result?.insertedId, ...newTutor },
      });

    } catch (error) {
      console.error("Error creating tutor:", error);
      return res?.status(500)?.json({
        success: false,
        message: "Failed to create tutor profile",
      });
    }
  });


router.put("/:id", async (req, res) => {
  try {
    const { id } = req?.params;
    const tutorData = req?.body;


    if (!id || !ObjectId.isValid(id)) {
      return res?.status(400)?.json({
        success: false,
        message: "Invalid or missing Tutor ID",
      });
    }

   
    const protectedFields = [
      "_id",
      "userId",
      "createdByEmail",
      "createdByName",
      "createdAt",
      "rating",
      "reviewCount",
    ];

  
    const updatedFields = Object.entries(tutorData || {}).reduce(
      (acc, [key, value]) => {
     
        if (!protectedFields.includes(key) && value !== undefined) {
          
       
          if (key === "hourlyFee" || key === "totalSlot") {
            acc[key] = Number(value ?? 0);
          } else if (key === "sessionStartDate" && value) {
            acc[key] = new Date(value).toISOString();
          } else {
            acc[key] = value;
          }
        }
        return acc;
      },
      {}
    );

  
    if (Object.keys(updatedFields).length === 0) {
      return res?.status(400)?.json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    updatedFields.updatedAt = new Date().toISOString();

    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: updatedFields };

    const result = await tutorsCollections?.updateOne(filter, updateDoc);

    if (result?.matchedCount === 0) {
      return res?.status(404)?.json({
        success: false,
        message: "Tutor profile not found",
      });
    }

    return res?.status(200)?.json({
      success: true,
      message: "Tutor profile updated successfully",
      modifiedCount: result?.modifiedCount,
      data: { _id: id, ...updatedFields },
    });

  } catch (error) {
    console.error("Error updating tutor:", error);
    return res?.status(500)?.json({
      success: false,
      message: "Failed to update tutor profile",
    });
  }
});

 router.delete("/:id", validateToken, async (req, res) => {
  try {
    const tutorId = req.params.id;

    if (!ObjectId.isValid(tutorId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid Tutor ID format" 
      });
    }

    const filter = { _id: new ObjectId(tutorId) };

    
    const tutor = await tutorsCollections.findOne(filter);

    if (!tutor) {
      return res.status(404).json({ 
        success: false, 
        message: "Tutor not found" 
      });
    }

   
    const result = await tutorsCollections.deleteOne(filter);

    if (result.deletedCount > 0) {

     
      const bookingDeleteResult = await bookingsCollections.deleteMany({
        $or: [
          { tutorId: tutorId },                
          { tutorId: new ObjectId(tutorId) }    
        ]
      });

      return res.status(200).json({
        success: true,
        message: "Tutor and associated bookings deleted successfully",
        deletedTutorId: tutorId,
        deletedBookingsCount: bookingDeleteResult.deletedCount 
      });
    }

    return res.status(400).json({ 
      success: false, 
      message: "Failed to delete tutor" 
    });

  } catch (error) {
    console.error("Error deleting tutor and bookings:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error while deleting tutor" 
    });
  }
});
  return router;
};

module.exports = tutorRoutes;