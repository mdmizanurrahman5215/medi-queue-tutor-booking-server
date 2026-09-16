const express = require("express");
const { ObjectId } = require("mongodb");
const validateToken = require("../../middleware/authMiddleware");

const tutorRoutes = (tutorsCollections) => {
  const router = express.Router();

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
   
 

router.get("/:id",validateToken, async (req, res) => {
  try {
    const id = req.params.id;
    console.log({id});
    

   
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
      createdByEmail: tutorData?.createdByEmail,
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

  return router;
};


module.exports = tutorRoutes;
