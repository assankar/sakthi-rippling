import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { ToDoItem } from "./item.model";
import { Pool } from "pg";

var dbconfig = {
    user: 'rippling',
    database: 'interview',
    password: 'sakthi-rippling',
    host: 'sakthi-rippling.cbbcaivvunhx.us-east-1.rds.amazonaws.com',
    post: 5432,
    max: 10,
    ssl: {
        require: true,
        rejectUnauthorized: false
    },
    idleTimeoutMillis: 30000
}


let items: ToDoItem[] = [
    {
        title: "Item 1",
        description: "Do Item 1",
        completed: false,
        id: 3948234,
    },
    {
        title: "Item 2",
        description: "Do Item 2",
        completed: false,
        id: 41248899,
    },
    {
        title: "Item 3",
        description: "Do Item 3",
        completed: true,
        id: 67892301,
    }
];

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/items", async (req, res) => {
    await queryTable();
    res.status(200).send(items)
});

app.get("/items/page/:pageItems/:pageId", async (req, res) => {
    const offset = (parseInt(req.params.pageId)-1) * parseInt(req.params.pageItems);
    let results = await queryPage(parseInt(req.params.pageItems), offset);

    res.status(200).send(results);
});

app.get("/items/:id", async (req, res) => {
    await queryTable();
    const id = parseInt(req.params.id);
    for(let i of items) {
        if(i.id === id) {
           return res.status(200).send(i);
        }
    }
    res.status(404).send("item not found"); 
});

app.put("/items/:id", async (req, res) => {
    await queryTable();
    const id = parseInt(req.params.id);
    let item = items.find((item) => item.id === id);

    if(!item) {
        return res.status(404).send("item not found");
    }
    const updatedItem: ToDoItem = req.body;

    if(!updatedItem) {
        res.status(404).send("no body provided");
    }

    if(updatedItem.title) {
        item.title = updatedItem.title;
    }

    if(updatedItem.description) {
        item.description = updatedItem.description;
    }

    if(updatedItem.completed !== undefined && updatedItem.completed !== null) {
        item.completed = updatedItem.completed;
    }

    upsertRow(item.id, item.title, item.description, item.completed);

    res.status(200).send(items);
});

app.post("/items", (req, res) => {
    if(!req.body) {
        return res.status(400).send("No body provided");
    }
    const item: ToDoItem = req.body;

    if(!item.id) {
        item.id = Math.floor(Math.random() * 10000000);
    }

    items.push(item);
    insertRow(item.id, item.title, item.description, item.completed);

    res.status(200).send(items);
});

app.delete("/items/:id/:val", async (req, res) => {
    await queryTable();
    const id = parseInt(req.params.id);
    const val = req.params.val;
    let itemIndex = -1;

    for(let i=0; i < items.length; i++) {
        if(items[i].id === id){
            itemIndex = i;
        }
    }
    if(itemIndex === -1){
        return res.status(404).send("item not found");
    }
    
    items.splice(itemIndex, 1);
    await deleteRow(id);
    res.status(200).send(items);
});

app.get("/createTable", async (req, res) => {
    await createTable();
    
    res.status(200).send("Table Created");
});

app.get("/emtpyTable", async (req, res) => {
    await emptyTable();
    
    res.status(200).send("Table Emptied");
});

app.get("/insertRow", async (req, res) => {
    await insertRow(12, "title1", "description1", true);
    
    res.status(200).send("Row Inserted");
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
    pool.query('CREATE TABLE IF NOT EXISTS ToDoItems (id INTEGER PRIMARY KEY, title VARCHAR(255), description VARCHAR(255), completed BOOL)', function(err, res) {
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
    pool.query('TRUNCATE ToDoItems', function(err, res) {
        if(err) {
            return console.error('error running truncate query', err);
        }
    });
}

async function insertRow(id: number, title: string, description: string, completed: boolean){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });
    await pool.query(`INSERT INTO ToDoItems (id, title, description, completed) VALUES ('${id}','${title}','${description}','${completed}')`, function(err, res) {
        if(err) {
            return console.error('error running insert query', err);
        }
    });
}

async function upsertRow(id: number, title: string, description: string, completed: boolean){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });
    pool.query(`UPDATE ToDoItems SET id = ${id}, title = '${title}', description = '${description}', completed = ${completed} WHERE id = ${id}`, function(err, res) {
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

    const test2 = await pool.query(`SELECT * FROM ToDoItems`);
    items = test2.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        completed: row.completed
      }));

    console.log(items);
}

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

async function deleteRow(id: number){
    const pool = new Pool(dbconfig);
    pool.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });

    const test2 = await pool.query(`DELETE FROM ToDoItems WHERE id = ${id}`);
}