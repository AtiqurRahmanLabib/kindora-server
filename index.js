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
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("volunteer_hub");
const opportunityCollection = db.collection("opportunities");
const eventsCollection = db.collection("events");

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/opportunities", async (req, res) => {
  const opportunities = await opportunityCollection.find({}).toArray();
  res.json(opportunities);
});

app.get("/opportunities/:id", async (req, res) => {
  const { id } = req.params;
  const opportunity = await opportunityCollection.findOne({
    _id: new ObjectId(id),
  });
  res.json(opportunity);
});

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
app.post("/manage-events", async (req, res) => {
  try {
    const event = req.body;

    const result = await eventsCollection.insertOne({
      ...event,
      registeredAt: new Date(),
    });

    res.status(201).send({
      ok: true,
      message: "Event joined successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);

    res.send({
      ok: false,
      message: "Failed to join event",
    });
  }
});

app.get("/manage-events/:email", async (req, res) => {
  const { email } = req.params;
  const result = await eventsCollection.find({ email: email }).toArray();
  res.send(result);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
