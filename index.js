import express from "express";
import "dotenv/config";
import cors from "cors";
import { MongoClient } from "mongodb";
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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
