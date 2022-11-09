import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
dotenv.config();

const port = 5000;
const app = express();
app.use(express.json());
app.use(cors());

const client = new MongoClient(process.env.MONGO_URI);
let db, participants, messages, status;

client.connect().then(() => {
	db = client.db("batePapoTest");
    participants = db.collection("participants");
    messages = db.collection("messages");
    status = db.collection("status");
});

app.get("/participants", async (req, res) => {
    try {
        const documents = await participants.find().toArray();
        res.send(documents);
    } catch (e) {
        console.log('Error: ', e.message);
        res.sendStatus(500);
    }
});

app.post("/participants", async (req, res) => {
    try {
        const result = await participants.insertOne(req.body);
        res.send(result);
    } catch (e) {
        console.log('Error: ', e.message);
        res.sendStatus(500);
    }
});

app.post("/participantss", async (req, res) => {
    try {
        const result = await participants.updateOne({name:"wut"}, { $set: {"name": "waaat"} });
        res.send(result);
    } catch (e) {
        console.log('Error: ', e.message);
        res.sendStatus(500);
    }
});

app.listen(port, () => {
    console.log("Server running at port " + port);
});
