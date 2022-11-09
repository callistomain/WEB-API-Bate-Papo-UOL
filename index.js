import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
dotenv.config();

const port = 5000;
const app = express();
app.use(express.json());
app.use(cors());

const client = new MongoClient("mongodb://localhost:27017");
let db;

client.connect().then(() => {
	db = client.db("db-name");
});

app.listen(port, () => {
    console.log("Server running at port " + port);
});
