
// const dns = require("node:dns");
// dns.setServer(["8.8.8", "8.8.4.4"])

const express = require('express');
const app = express();
const cors = require('cors');
const { configDotenv } = require('dotenv');
const { MongoClient, ServerApiVersion } = require('mongodb');
const tutorRoutes = require('./routes/tutorRoutes/tutorRoutes');



configDotenv();
app.use(cors());
app.use(express.json());
const port = 5000;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("mediQueTutorBooking")
    const tutorsCollections = db.collection("tutors")
    const bookingsCollections = db.collection("bookings")

        app.use("/api/tutors", tutorRoutes(tutorsCollections));

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});