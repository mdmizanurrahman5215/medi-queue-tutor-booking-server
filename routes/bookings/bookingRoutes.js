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

   
    const totalHours = Number(bookingData?.totalHours ?? 1);
    const hourlyFee = Number(bookingData?.hourlyFee ?? tutor?.hourlyFee ?? 0);

    const newBooking = {
      
      userId: bookingData?.userId || null,
      studentName: bookingData?.studentName,
      studentEmail: bookingData?.studentEmail,
      phone: bookingData?.phone,
      studentImage: bookingData?.studentImage || "",

      tutorId: tutorObjectId,
      tutorName: bookingData?.tutorName || tutor?.tutorName,
      tutorEmail: bookingData?.tutorEmail || tutor?.createdByEmail || "",
      tutorImage: bookingData?.tutorImage || tutor?.image || "",
      subject: bookingData?.subject || tutor?.subject,
      hourlyFee: hourlyFee,
      teachingMode: bookingData?.teachingMode || tutor?.teachingMode || "Online",

     
      bookingDate: bookingData?.bookingDate || new Date().toISOString(),
      preferredTimeSlot: bookingData?.preferredTimeSlot || tutor?.availableTimeSlot || "",
      totalHours: totalHours,

      status: "Confirmed",
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

  
    const result = await bookingsCollections?.insertOne(newBooking);

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


router.delete("/:id", validateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;

    if (!ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const booking = await bookingsCollections.findOne({
      _id: new ObjectId(bookingId),
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const result = await bookingsCollections.deleteOne({
      _id: new ObjectId(bookingId),
    });

    if (result.deletedCount > 0) {
      if (booking?.tutorId && ObjectId.isValid(booking.tutorId)) {
        await tutorsCollections?.updateOne(
          { _id: new ObjectId(booking.tutorId) },
          { $inc: { totalSlot: 1 } } 
        );
      }

      return res.status(200).json({
        success: true,
        message: "Booking removed and slot updated successfully",
      });
    }

    res.status(400).json({ success: false, message: "Failed to delete booking" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ success: false, message: "Failed to delete booking" });
  }
});

router.patch("/:id", validateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { studentName, phone, bookingDate, teachingMode, notes } = req.body;

    // ১. ObjectId ভ্যালিডেশন
    if (!ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid Booking ID" });
    }

    const filter = { _id: new ObjectId(bookingId) };

    // ২. বুকিং এক্সিস্ট করে কি না চেক করা
    const booking = await bookingsCollections.findOne(filter);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // ৩. যেসব ফিল্ড ক্লায়েন্ট থেকে পাঠানো হয়েছে সেগুলো এক্সট্র্যাক্ট করা
    const updatedFields = {};
    if (studentName) updatedFields.studentName = studentName.trim();
    if (phone) updatedFields.phone = phone.trim();
    if (bookingDate) updatedFields.bookingDate = new Date(bookingDate);
    if (teachingMode) updatedFields.teachingMode = teachingMode;
    if (notes !== undefined) updatedFields.notes = notes;

    // আপডেট করার মতো কোনো ডাটা না থাকলে এরর দেওয়া
    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ success: false, message: "No fields provided to update" });
    }

    // ৪. ডাটাবেজে আপডেট সম্পাদন করা
    const updateDoc = {
      $set: {
        ...updatedFields,
        updatedAt: new Date(),
      },
    };

    const result = await bookingsCollections.updateOne(filter, updateDoc);

    if (result.modifiedCount > 0) {
      return res.status(200).json({
        success: true,
        message: "Booking updated successfully",
      });
    }

    return res.status(400).json({
      success: false,
      message: "No changes were made to the booking",
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    return res.status(500).json({ success: false, message: "Failed to update booking" });
  }
});



  return router;
};


module.exports = bookingRoutes;
