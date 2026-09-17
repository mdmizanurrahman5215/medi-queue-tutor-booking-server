const express = require("express");
const { ObjectId } = require("mongodb");
const validateToken = require("../../middleware/authMiddleware");
// const validateToken = require("../../middleware/authMiddleware");

const bookingRoutes = (bookingsCollections, tutorsCollections) => {
  const router = express.Router();

router.get("/", validateToken, async (req, res) => {
  try {
  
    const userId = req.user?.id || req.user?._id || req.decoded?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: User ID not found",
      });
    }

   
    const query = { userId: userId }; 

    const bookings = await bookingsCollections.find(query).toArray();

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching user bookings:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});
   
 

// router.get("/:id",validateToken, async (req, res) => {
//   try {
//     const id = req.params.id;
//     console.log({id});
    

   
//     const query = { _id: new ObjectId(id) };
//     const tutor = await tutorsCollections.findOne(query);

    
//     if (!tutor) {
//       return res.status(404).json({
//         success: false,
//         message: "Tutor not found",
//       });
//     }


//     res.status(200).json(tutor);
//   } catch (error) {
//     console.error("Error fetching tutor details:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch tutor details",
//     });
//   }
// });

router.post("/",validateToken, async (req, res) => {
  try {
    const bookingData = req?.body;

    const requiredFields = [
      "studentName",
      "phone",
      "studentEmail",
      "tutorId",
      "tutorName",
      "subject",
      "hourlyFee",
    ];

    for (const field of requiredFields) {
      if (!bookingData?.[field]) {
        return res?.status(400)?.json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
    }

    // ২. টিউটরের এভেলেবল স্লট আছে কিনা তা চেক করা
    const tutorObjectId = new ObjectId(bookingData?.tutorId);
    const tutor = await tutorsCollections.findOne({ _id: tutorObjectId });

    if (!tutor) {
      return res?.status(404)?.json({
        success: false,
        message: "Tutor profile not found",
      });
    }

    if (Number(tutor?.totalSlot ?? 0) <= 0) {
      return res?.status(400)?.json({
        success: false,
        message: "No available slots left for this tutor!",
      });
    }

    // ৩. অবজেক্ট স্ট্রাকচার
    const totalHours = Number(bookingData?.totalHours ?? 1);
    const hourlyFee = Number(bookingData?.hourlyFee ?? tutor?.hourlyFee ?? 0);

    const newBooking = {
      // ইউজার ও স্টুডেন্ট ইনফরমেশন
      userId: bookingData?.userId || null,
      studentName: bookingData?.studentName,
      studentEmail: bookingData?.studentEmail,
      phone: bookingData?.phone,
      studentImage: bookingData?.studentImage || "",

      // টিউটর স্ন্যাপশট
      tutorId: tutorObjectId,
      tutorName: bookingData?.tutorName || tutor?.tutorName,
      tutorEmail: bookingData?.tutorEmail || tutor?.createdByEmail || "",
      tutorImage: bookingData?.tutorImage || tutor?.image || "",
      subject: bookingData?.subject || tutor?.subject,
      hourlyFee: hourlyFee,
      teachingMode: bookingData?.teachingMode || tutor?.teachingMode || "Online",

      // সেশন স্কেজুয়েল
      bookingDate: bookingData?.bookingDate || new Date().toISOString(),
      preferredTimeSlot: bookingData?.preferredTimeSlot || tutor?.availableTimeSlot || "",
      totalHours: totalHours,

      // স্ট্যাটাস ও পেমেন্ট
      status: "Pending",
      cancellationReason: null,

      paymentDetails: {
        amount: hourlyFee * totalHours,
        currency: "BDT",
        paymentStatus: "Unpaid",
        paymentMethod: null,
        transactionId: null,
        paidAt: null,
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // ৪. ডাটাবেজে সেভ করা
    const result = await bookingsCollections?.insertOne(newBooking);

    // ৫. টিউটরের স্লট ১ কমানো
    await tutorsCollections?.updateOne(
      { _id: tutorObjectId },
      { $inc: { totalSlot: -1 } }
    );

    return res?.status(201)?.json({
      success: true,
      message: "Session booked successfully!",
      insertedId: result?.insertedId,
      data: { _id: result?.insertedId, ...newBooking },
    });

  } catch (error) {
    console.error("Error creating booking:", error);

    return res?.status(500)?.json({
      success: false,
      message: error?.message || "Failed to create booking",
    });
  }
});



  return router;
};


module.exports = bookingRoutes;
