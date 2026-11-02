import express from "express";
import "dotenv/config";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
const app = express();
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

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/opportunities", async (req, res) => {
  const opportunities = await opportunityCollection.find({}).toArray();
  res.json(opportunities);
});

app.get("/opportunities/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Backend ID:", id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid ID",
      });
    }

    const opportunity = await opportunityCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!opportunity) {
      return res.status(404).json({
        message: "Opportunity not found",
      });
    }

    res.json(opportunity);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
