
import express from "express";
import "dotenv/config";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();

app.use(express.json());
app.use(cors());

const port = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();

    console.log("You successfully connected to MongoDB!");

    return client;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("volunteer_hub");

const opportunityCollection = db.collection("opportunities");
const joinedEventsCollection = db.collection("joinedEvents");

// Prevent duplicate registrations
await joinedEventsCollection.createIndex(
  { email: 1, eventId: 1 },
  { unique: true },
);

// Home route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Get all opportunities
app.get("/opportunities", async (req, res) => {
  try {
    const opportunities = await opportunityCollection.find({}).toArray();

    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single opportunity
app.get("/opportunities/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const opportunity = await opportunityCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!opportunity) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    res.json(opportunity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create event
app.post("/opportunities", async (req, res) => {
  try {
    const event = req.body;

    if (!event.title) {
      return res.status(400).json({
        success: false,
        message: "Event title is required",
      });
    }

    const result = await opportunityCollection.insertOne({
      ...event,
      participants: 0,
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get events created by user
app.get("/manage-events/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const result = await opportunityCollection
      .find({ email })
      .toArray();

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
});

// Delete event created by user
app.delete("/manage-events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const result = await opportunityCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    await joinedEventsCollection.deleteMany({
      eventId: id,
    });

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
});

// Join an event
app.post("/joined-events", async (req, res) => {
  try {
    const { eventId, name, email } = req.body;

    if (!eventId || !email) {
      return res.status(400).json({
        success: false,
        message: "Event ID and email are required",
      });
    }

    if (!ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    // Check event exists
    const opportunity = await opportunityCollection.findOne({
      _id: new ObjectId(eventId),
    });

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check duplicate join
    const alreadyJoined = await joinedEventsCollection.findOne({
      email,
      eventId,
    });

    if (alreadyJoined) {
      return res.status(409).json({
        success: false,
        message: "You already joined this event",
      });
    }

    // Save joined event
    const result = await joinedEventsCollection.insertOne({
      eventId,
      email,
      name: name || "",
      title: opportunity.title,
      image: opportunity.image || "",
      location: opportunity.location || "",
      category: opportunity.category || "",
      date: opportunity.date || "",
      joinedAt: new Date(),
    });

    // Update participant count
    await opportunityCollection.updateOne(
      { _id: new ObjectId(eventId) },
      { $inc: { participants: 1 } },
    );

    res.status(201).json({
      success: true,
      message: "Event joined successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You already joined this event",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get events joined by user
app.get("/joined-events/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const result = await joinedEventsCollection
      .find({ email })
      .sort({ joinedAt: -1 })
      .toArray();

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
});

// Local development only
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
