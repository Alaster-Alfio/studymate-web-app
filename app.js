var mysql = require('mysql');

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "c237_web_app"
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

const express = require("express");
const app = express();
const port = 3000;
const path = require("path");
const fs = require("fs");

// Set up middleware for parsing JSON bodies
app.use(express.json());

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

// Set up views directory for EJS templates
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Variables
let userId = 1;
let note = null;

// Define routes
app.get("/", (req, res) => {
    res.render("index");
});

// ========================================
//           Accessing Database
// ========================================

// Route for fetching all users
app.get("/usersdb", (req, res) => {
    const users = readOrWriteFile('read', null, "data/users.json");
    res.json(JSON.parse(users));
});

// Route for fetching all notes
app.get("/notesdb", (req, res) => {
    const notes = readOrWriteFile('read', null, "data/notes.json");
    res.json(JSON.parse(notes));
});

// Route for creating a new user
app.post("/usersdb", (req, res) => {
    const newUser = req.body;
    const users = readOrWriteFile('read', null, "data/users.json");
    const parsedUsers = JSON.parse(users);

    parsedUsers.push(newUser);
    readOrWriteFile('write', JSON.stringify(parsedUsers), "data/users.json");
    res.status(201).send("User created successfully");
});

// ========================================
//                  Login
// ========================================
app.post("/login", (req, res) => {
    const username = req.body.username;

    // Query the database for the username
    var sql = `SELECT * FROM users WHERE username = '${username}'`;
    con.query(sql, function (err, result) {
        if (err) throw err;

        if (result.length > 0) {
            // User found, set userId and redirect to notes page
            userId = result[0].userID;
            res.redirect("/notes");
        } else {
            // User not found, insert new user into the database
            var sqlInsert = `INSERT INTO users (username) VALUES ('${username}')`; // createdAt not used, it's defaulted to current timestamp in MySQL
            con.query(sqlInsert, function (err, result) {
                if (err) throw err;

                // Get the ID of the newly inserted user
                var sqlSelect = `SELECT LAST_INSERT_ID() AS userID`;
                con.query(sqlSelect, function (err, result) {
                    if (err) throw err;

                    // Set userId and redirect to notes page
                    userId = result[0].userID;
                    res.redirect("/notes");
                });
            });
        }
    });
});

// ========================================
//                  Notes
// ========================================

// Route for displaying notes
app.get("/notes", (req, res) => {
    const notes = readOrWriteFile('read', null, "data/notes.json");
    const parsedNotes = JSON.parse(notes);

    const userNotes = parsedNotes.filter(note => note.userID === userId);

    const notesTitles = userNotes.map(note => note.title);
    const notesCategory = userNotes.map(note => note.category);
    const notesId = userNotes.map(note => note.noteID);

    res.render("notes", { notesTitles, notesCategory, notesId });
})

// displaying notes by id
app.get("/notes/:id", (req, res) => {
    const noteId = parseInt(req.params.id);

    // Check if noteId is 0 (new note)
    if (noteId === 0) {

        const notes = readOrWriteFile('read', null, "data/notes.json");
        const parsedNotes = JSON.parse(notes);

        // Create a new blank note
        const newNote = {
            noteID: generateUniqueId(parsedNotes),
            userID: userId,
            title: "",
            content: "",
            category: ""
        };

        // Save the new note to the database
        parsedNotes.push(newNote);
        readOrWriteFile('write', JSON.stringify(parsedNotes), "data/notes.json");

        // Render the new note
        res.render("note", { note: newNote });
    } else {
        const notes = readOrWriteFile('read', null, "data/notes.json");
        const parsedNotes = JSON.parse(notes);
        const note = parsedNotes.find(note => note.noteID === noteId);

        // Render the existing note
        res.render("note", { note });
    }
});


// update notes
app.post("/notes/:id", (req, res) => {
    const noteId = parseInt(req.params.id);
    const updatedNote = req.body;
    const notes = readOrWriteFile('read', null, "data/notes.json");
    let parsedNotes = JSON.parse(notes);
    
    // Find the index of the note to be updated
    const noteIndex = parsedNotes.findIndex(note => note.noteID === noteId);
    if (noteIndex !== -1) {
        // Update the note with the new data
        parsedNotes[noteIndex] = { ...parsedNotes[noteIndex], ...updatedNote };
        readOrWriteFile('write', JSON.stringify(parsedNotes), "data/notes.json");
        
        // if it worked
        res.redirect("/notes");
    } else {
        res.status(404).send("Note not found");
    }
});

// ========================================
//                Calendar
// ========================================

// Route for displaying calendar list
app.get("/calendar", (req, res) => {
    const events = readOrWriteFile('read', null, "data/calendarEvents.json");
    const parsedEvents = JSON.parse(events);
    console.log(events)

    const userEvents = parsedEvents.filter(event => event.userID === userId);

    const eventId = userEvents.map(event => event.calendarID);
    const eventsTitle = userEvents.map(event => event.title);
    const startTime = userEvents.map(event => new Date(event.startDateTime).toLocaleString());
    const endTime = userEvents.map(event => new Date(event.endDateTime).toLocaleString());


    res.render("calendar", { eventId, eventsTitle, startTime, endTime });
});

// displaying calendar by id
app.get("/events/:id", (req, res) => {
    const eventId = parseInt(req.params.id);

    // Check if eventId is 0 (new event)
    if (eventId === 0) {
        const events = readOrWriteFile('read', null, "data/calendarEvents.json");
        const parsedEvents = JSON.parse(events);

        // Create a new blank event
        const newEvent = {
            calendarID: generateEventId(parsedEvents),
            userID: userId,
            title: "",
            description: "",
            startDateTime: "",
            endDateTime: "",
            isAllDay: false,
            location: ""
        };

        // Save the new event to the database
        parsedEvents.push(newEvent);
        readOrWriteFile('write', JSON.stringify(parsedEvents), "data/calendarEvents.json");

        // Render the new event
        res.render("event", { event: newEvent });
    } else {
        const events = readOrWriteFile('read', null, "data/calendarEvents.json");
        const parsedEvents = JSON.parse(events);
        const event = parsedEvents.find(event => event.calendarID === eventId);

        // Render the existing event
        res.render("event", { event });
    }
});


// update events
app.post("/events/:id", (req, res) => {
    const eventId = parseInt(req.params.id);
    const updatedEvent = req.body;
    const events = readOrWriteFile('read', null, "data/calendarEvents.json");
    let parsedEvents = JSON.parse(events);

    // Find the index of the event to be updated
    const eventIndex = parsedEvents.findIndex(event => event.calendarID === eventId);
    if (eventIndex !== -1) { 
        // Update the event with the new data
        parsedEvents[eventIndex] = { ...parsedEvents[eventIndex], ...updatedEvent };
        readOrWriteFile('write', JSON.stringify(parsedEvents), "data/calendarEvents.json");
        
        // if it worked
        res.redirect("/calendar");
    } else {
        res.status(404).send("Event not found");
    }
})

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// ========================================
//                Functions
// ========================================
function readOrWriteFile(syntax, content, filePath) {
    if (syntax === 'read') {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            console.log('File content:', data);
            return data;
        } catch (err) {
            console.error('Error reading file:', err);
            return null;
        }
    } else if (syntax === 'write') {
        try {
            fs.writeFileSync(filePath, content);
            console.log('File written successfully.');
        } catch (err) {
            console.error('Error writing to file:', err);
        }
    } else {
        console.error('Invalid syntax. Please use "read" or "write".');
    }
}

function generateUniqueId(parsedNotes) {
    // Find the highest existing ID
    const highestId = parsedNotes.reduce((maxId, note) => {
        return note.noteID > maxId ? note.noteID : maxId;
    }, 0);

    // Increment the highest ID by 1 to generate a new unique ID
    return highestId + 1;
}

function generateEventId(parsedEvents) {
    // Find the highest existing calendarID
    const highestId = parsedEvents.reduce((maxId, event) => {
        return event.calendarID > maxId ? event.calendarID : maxId;
    }, 0);

    // Increment the highest ID by 1 to generate a new unique ID
    return highestId + 1;
}


/*
https://uiverse.io/Alanav29/tough-ape-65 (Username Input)
https://github.com/iamshaunjp/bootstrap-4-playlist/blob/lesson-9/index.html 
*/