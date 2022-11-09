import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Joi from "joi";
import dayjs from "dayjs";
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

// Remoção automática de usuários inativos
setInterval(async () => {
    try {
        const documents = await participants.find().toArray();
        documents.forEach(e => {
            const timeDiff = Date.now() - e.lastStatus;
            if (timeDiff >= 10000) {
                const message = {
                    from: e.name,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: dayjs().format("HH:mm:ss")
                };
                messages.insertOne(message).catch(err => console.log('A Error: ', err));
                participants.deleteOne(e).catch(err => console.log('B Error: ', err));
            }
        });
    } catch (err) {
        console.log('Remoção Error: ', err.message);
    }
}, 15000)

// [GET] /participants
app.get("/participants", async (req, res) => {
    try {
        const documents = await participants
        .find({}, {projection:{_id:0}}).toArray();
        res.send(documents);
    } catch (err) {
        console.log('[GET] /participants Error: ', err.message);
        res.sendStatus(500);
    }
});

// [POST] /participants
app.post("/participants", async (req, res) => {
    try {
        const data = req.body;
        const schema = Joi.object({
            name: Joi.string().alphanum().min(1).required()
        });
    
        const {error} = schema.validate(data);
        if (error) { 
            const message = error.details.map(e => e.message).join(',');
            console.log("POST PART Error: " + message); 
            res.status(422).send({error: message});
            return;
        }
    
        const {name} = data;
        const found = await participants.findOne({name});
        if (found) return res.sendStatus(409);
    
        const user = {name, lastStatus: Date.now()};
        await participants.insertOne(user);
        const message = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format("HH:mm:ss")
        };
        await messages.insertOne(message);
        res.sendStatus(201);
    } catch (err) {
        console.log('[POST] /participants Error: ', err.message);
    }
});

// [GET] /messages
app.get("/messages", async (req, res) => {
    try {
        const from = req.header("User");
        if (!from) return res.sendStatus(422);
        else  {
            const found = await messages.findOne({from});
            if (!found) return res.sendStatus(422);
        }
    
        let {limit} = req.query;
        limit = (+limit > 0) ? +limit : 0;

        const documents = await messages
        .find({$or: [{from}, {"type": "message"}, {"to": from}, {"to": "Todos"}]}, {projection:{_id:0}})
        .skip(messages.count() - limit)
        .toArray();
        res.send(documents);
    } catch (e) {
        console.log('[GET] /messages Error: ', e.message);
        res.sendStatus(500);
    }
});

// [POST] /messages
app.post("/messages", async (req, res) => {
    try {
        const data = req.body;
        const schema = Joi.object({
            to: Joi.string().alphanum().min(1).required(),
            text: Joi.string().min(1).required(),
            type: Joi.string().alphanum().min(1).valid("message", "private_message").required()
        });
    
        const {error} = schema.validate(data);
        if (error) { 
            const message = error.details.map(e => e.message).join(',');
            console.log("POST MES Error: " + message); 
            res.status(422).send(message);
            return;
        }
    
        const from = req.header("User");
        if (!from) return res.sendStatus(422);
        else  {
            const found = await messages.findOne({from});
            if (!found) return res.sendStatus(422);
        }
    
        const {to, text, type} = data;
        const obj = {from, to, text, type, time: dayjs().format("HH:mm:ss")};
        await messages.insertOne(obj);
        res.sendStatus(201);
    } catch (err) {
        console.log('[POST] /messages Error: ', err.message);
    }
});


// [POST] /status
app.post("/status", async (req, res) => {
    try {
        const name = req.header("User");
        if (!name) return res.sendStatus(422);
    
        const user = await participants.findOne({name});
        if (!user) return res.sendStatus(404);
    
        await participants.updateOne(user, {$set: {lastStatus: Date.now()}});
        res.sendStatus(200);
    } catch (e) {
        console.log('[POST] /status Error: ', e.message);
        res.sendStatus(500);
    }
});


app.listen(port, () => {
    console.log("Server running at port " + port);
});
