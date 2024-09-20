import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Questions } from "./item.model";
import { Upvotes } from "./upvotes.model";
import { Pool } from "pg";

var dbconfig = {
    user: 'rippling',
    database: 'interview',
    password: '',
    host: 'sakthi-rippling.cbbcaivvunhx.us-east-1.rds.amazonaws.com',
    post: 5432,
    max: 10,
    ssl: {
        require: true,
        rejectUnauthorized: false
    },
    idleTimeoutMillis: 30000
}

let items: Questions[] = [];

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/questions", async (req, res) => {
    await queryTable();
    res.status(200).send(items)
});

app.get("/questions/:id", async (req, res) => {
    await queryTable();
    const id = parseInt(req.params.id);
    for(let i of items) {
        if(i.id === id) {
           return res.status(200).send(i);
        }
    }
    res.status(404).send("item not found"); 
});

app.post("/questions", (req, res) => {
    if(!req.body) {
        return res.status(400).send("No body provided");
    }
    const item: Questions = req.body;

    if(!item.id) {
        item.id = Math.floor(Math.random() * 10000000);
    }

    items.push(item);
    insertRow(item.id, item.title, item.content, item.creator, 0);

    res.status(200).send(items);
});

app.post("/upvote/:id/:user", (req, res) => {
    let user = req.params.user;
    let id = req.params.id;

    let upvoteId = Math.floor(Math.random() * 10000000);
    queryUpvotesTable(upvoteId, parseInt(id), user);

});

app.get("/createTable", async (req, res) => {
    await createTable();
    
    res.status(200).send("Table Created");
});

app.get("/createUpvotesTable", async (req, res) => {
    await createUpvotesTable();
    
    res.status(200).send("Table Created");
});

app.get("/emptyTable", async (req, res) => {
    await emptyTable();
    
    res.status(200).send("Table Emptied");
});

app.get("/queryTable", async (req, res) => {
    await queryTable();
    
    res.status(200).send("Querying Table");
});

app.listen(3000, () => {
    console.log("Express service started on port 3000");
});

async function createTable(){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });
    pool.query('CREATE TABLE IF NOT EXISTS Questions (id INTEGER PRIMARY KEY, title VARCHAR(255), content VARCHAR(255), creator VARCHAR(255), upvotes INTEGER)', function(err, res) {
        if(err) {
            return console.error('error running create table query', err);
        }
    });
}

async function createUpvotesTable(){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });
    pool.query('CREATE TABLE IF NOT EXISTS Upvotes (id INTEGER PRIMARY KEY, questionId INTEGER, creator VARCHAR(255))', function(err, res) {
        if(err) {
            return console.error('error running create table query', err);
        }
    });
}

async function emptyTable(){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });
    pool.query('TRUNCATE Questions', function(err, res) {
        if(err) {
            return console.error('error running truncate query', err);
        }
    });
}

async function insertRow(id: number, title: string, content: string, creator: string, upvotes: number){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });
    await pool.query(`INSERT INTO Questions (id, title, content, creator, upvotes) VALUES ('${id}','${title}','${content}','${creator}', '${upvotes}')`, function(err, res) {
        if(err) {
            return console.error('error running insert query', err);
        }
    });
}

async function insertUpvoteRow(id: number, questionId: number, creator: string){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });
    await pool.query(`INSERT INTO upvotes (id, questionId, creator) VALUES ('${id}','${questionId}','${creator}')`, function(err, res) {
        if(err) {
            return console.error('error running insert query', err);
        }
    });
}

async function upsertRow(id: number, upvotes: number){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });
    pool.query(`UPDATE questions SET upvotes = ${upvotes} WHERE id = ${id}`, function(err, res) {
        if(err) {
            return console.error('error running insert query', err);
        }
    });
}

async function queryTable(){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });

    const test2 = await pool.query(`SELECT * FROM Questions`);
    items = test2.rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        creator: row.creator,
        upvotes: row.upvotes
      }));

    console.log(items);
}

async function queryUpvotesTable(upvoteid: number, id: number, creator: string){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });
    let upvotes: Upvotes []= [];

    const test2 = await pool.query(`SELECT * FROM upvotes WHERE (questionId = ${id} AND creator = '${creator}')`);
    upvotes = test2.rows.map(row => ({
        id: row.id,
        questionId: row.questionId,
        creator: row.creator,
      }));

    if(upvotes.length === 0){
        const test3 = await pool.query(`SELECT * FROM questions WHERE id = ${id}`);
        let res = test2.rows.map(row => ({
            id: row.id,
            title: row.title,
            content: row.content,
            creator: row.creator,
            upvotes: row.upvotes
          })); 
        
        if(res.length !== 0){
            await upsertRow(id, res[0].upvotes+1);
            await insertUpvoteRow(upvoteid, id, creator);
        }
    }
}
/*
async function queryPage(itemsPerPage: number, offset: number): Promise<ToDoItem[]>{
    let pagedItems: ToDoItem[] = []

    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });

    const test2 = await pool.query(`SELECT * FROM ToDoItems LIMIT ${itemsPerPage} OFFSET ${offset}`);
    pagedItems = test2.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        completed: row.completed
      }));

    console.log(pagedItems);
    return pagedItems;
}
    */
/*
async function deleteRow(id: number){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });

    const test2 = await pool.query(`DELETE FROM ToDoItems WHERE id = ${id}`);
}
*/
