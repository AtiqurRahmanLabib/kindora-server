
import express from "express";
import "dotenv/config";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(express.json());
app.use(cors());

const port = 5000;

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
    throw err;
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("volunteer_hub");

const opportunityCollection = db.collection("opportunities");
const myEventsCollection = db.collection("myEvents");

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Get all opportunities
app.get("/opportunities", async (req, res) => {
  const opportunities = await opportunityCollection.find({}).toArray();
  res.json(opportunities);
});

// Get single opportunity
app.get("/opportunities/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const opportunity = await opportunityCollection.findOne({
      _id: new ObjectId(id),
    });

    res.json(opportunity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create event
app.post("/opportunities", async (req, res) => {
  try {
    const result = await opportunityCollection.insertOne(req.body);

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Manage Events: Get events created by the user
app.get("/manage-events/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const result = await opportunityCollection
      .find({ email: email })
      .toArray();

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Join an event
app.post("/join-events", async (req, res) => {
  try {
    const event = req.body;

    if (!event.email || !event.eventId) {
      return res.status(400).json({
        ok: false,
        message: "User email and event ID are required",
      });
    }

    // Check if user already joined
    const alreadyJoined = await myEventsCollection.findOne({
      email: event.email,
      eventId: event.eventId,
    });

    if (alreadyJoined) {
      return res.status(400).json({
        ok: false,
        message: "You already joined this event",
      });
    }

    const result = await myEventsCollection.insertOne({
      ...event,
      registeredAt: new Date(),
    });

    res.status(201).json({
      ok: true,
      message: "Event joined successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Failed to join event",
    });
  }
});

// Join Events: Get events joined by the user
app.get("/manage-events/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const result = await myEventsCollection
      .find({ email: email })
      .toArray();

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Delete an event created by the user
app.delete("/manage-events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const result = await opportunityCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    // Remove related joined-event records
    await myEventsCollection.deleteMany({
      eventId: id,
    });

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
