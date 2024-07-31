const mysql = require('mysql2');

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "c237_web_app"
});

var conAvail = false

con.connect(function(err) {
    if (err) {
        throw err;
    } 
    console.log("Connected!");
});

const moment = require('moment'); // for date
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

// ========================================
//                  Login
// ========================================
app.get("/", function (req, res) {
    // Query the database for the username
    const sql = 'SELECT username FROM users WHERE userID = ?';
    con.query(sql, [userId], (err, result) => {
        if (err) { // if error, resort to JSON data as a sample.
            const username = "john_doe";
            res.render("index", { username });

        } else if (result.length === 0) {
            res.status(404).send("User not found");
        } else {
            const username = result[0].username;
            res.render("index", { username });
        }
    });
});


app.post("/", (req, res) => {
    const username = req.body.username;

    // Query the database for the username (READ)
    var sql = `SELECT * FROM users WHERE username = '${username}'`;
    con.query(sql, function (err, result) {
        if (err) throw err;

        if (result.length > 0) {
            // User found, set userId and redirect to notes page 
            userId = result[0].userID;
            res.redirect("/notes");
        } else {
            // User not found, insert new user into the database (CREATE)
            var sqlInsert = `INSERT INTO users (username) VALUES ('${username}')`; // createdAt not used, it's defaulted to current timestamp in MySQL
            con.query(sqlInsert, function (err, result) {
                if (err) throw err;

                // Get the ID of the new user
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
    // Query for notes from current user (READ)
    var sql = `SELECT * FROM notes WHERE userID = ${userId}`;
    con.query(sql, function (err, result) {
        if (err) throw err;

        // Extract data from the query (READ)
        const notesTitles = result.map((note) => note.title);
        const notesCategory = result.map((note) => note.category);
        const notesId = result.map((note) => note.noteID);
        const createdAt = result.map((note) => new Date(note.createdAt).toLocaleString());

        // Render the notes page with the retrieved data
        res.render("notes", { notesTitles, notesCategory, notesId, createdAt });
    });
});

// displaying notes by id
app.get("/notes/:id", (req, res) => {
    const noteId = parseInt(req.params.id);

    // Check if noteId is 0 (new note)
    if (noteId === 0) {
        // Create a new blank note (CREATE)
        const newNote = {
            userID: userId,
            title: "",
            content: "",
            category: ""
        };

        // Insert the new note into the db 
        var sql = `INSERT INTO notes (userID, title, content, category) VALUES (${userId}, '', '', '')`;
        con.query(sql, function (err, result) {
            if (err) throw err;

            // Retrieve ID of the new note (READ)
            const insertedNoteId = result.insertId;

            // Render the new note
            res.render("note", { note: { noteID: insertedNoteId, ...newNote } });
        });
    } else {
        // Query the db for the given noteid (READ)
        var sql = `SELECT * FROM notes WHERE noteID = ${noteId}`;
        con.query(sql, function (err, result) {
            if (err) throw err;

            // If the note is found, render it
            if (result.length > 0) {
                const note = result[0];
                res.render("note", { note });
            } else {
                // Note not found
                res.status(404).send("Note not found");
            }
        });
    }
});

// update notes
app.post("/notes/:id", (req, res) => {
    const noteId = parseInt(req.params.id);
    const { title, content, category } = req.body;

    if (!noteId) {
        res.status(400).send("Invalid note ID");
        return;
    }

    // Update the note in the database
    const sql = 'UPDATE notes SET title = ?, content = ?, category = ? WHERE noteID = ?';
    con.query(sql, [title, content, category, noteId], (err, result) => {
        if (err) throw err;
        console.log("Number of records updated: " + result.affectedRows);
        res.redirect("/notes");
    });
});


// delete notes
app.get("/notes/:id/delete", (req, res) => {
    const noteId = parseInt(req.params.id);
    if (!noteId) {
        res.status(400).send("Invalid note ID");
        return;
    }

    // Delete the note from the database
    const sql = 'DELETE FROM notes WHERE noteID = ?';
    con.query(sql, [noteId], (err, result) => {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows);
        res.redirect("/notes");
    });
});


// ========================================
//                Calendar
// ========================================

// Route for displaying calendar list
app.get("/calendar", (req, res) => {
    // Construct the SQL query to select calendar events for the current user
    var sql = `SELECT * FROM calendar WHERE userID = ${userId}`;
    
    // Execute the SQL query
    con.query(sql, function (err, result) {
        if (err) throw err;
        
        // Extract relevant data
        const eventId = result.map(event => event.calendarID);
        const eventsTitle = result.map(event => event.title);
        const startTime = result.map(event => new Date(event.startDateTime).toLocaleString());
        const endTime = result.map(event => new Date(event.endDateTime).toLocaleString());

        // Render the calendar page
        res.render("calendar", { eventId, eventsTitle, startTime, endTime });
    });
});


// displaying calendar by id
app.get("/events/:id", (req, res) => {
    const eventId = parseInt(req.params.id);

    if (eventId === 0) {
        // Create a new event
        const newEvent = {
            userID: userId,
            title: "",
            description: "",
            startDateTime: null,
            endDateTime: null,
            isAllDay: false,
            location: ""
        };

        // Insert the new event into the database
        con.query('INSERT INTO calendar SET ?', newEvent, (err, result) => {
            if (err) {
                res.status(500).send("Error creating new event");
            } else {
                newEvent.calendarID = result.insertId;
                res.render("event", { event: newEvent });
            }
        });
    } else {
        // Fetch existing event from the database
        con.query('SELECT * FROM calendar WHERE calendarID = ?', eventId, (err, rows) => {
            if (err) {
                res.status(500).send("Error fetching event");
            } else if (rows.length === 0) {
                res.status(404).send("Event not found");
            } else {
                const event = rows[0];


                // VERY TEDIOUS. Basically, datetime from MySQL cannot be read into a datetime-local input.
                event.startDateTime = moment(event.startDateTime); // converts to moment object so i can format it later
                event.endDateTime = moment(event.endDateTime);

                localStart = event.startDateTime.format('YYYY-MM-DDTHH:mm'); // changes the format so datetime-local can work
                localEnd = event.endDateTime.format('YYYY-MM-DDTHH:mm');

                event.startDateTime = localStart;
                event.endDateTime = localEnd;

                res.render("event", { event });
                console.log(event.startDateTime);
            }
        });
    }
});


// update events
app.post("/events/:id", (req, res) => {
    const eventId = parseInt(req.params.id);
    const { title, description, startDateTime, endDateTime, isAllDay, location } = req.body;

    if (!eventId) {
        res.status(400).send("Invalid event ID");
        return;
    }

    // Update the event in the database
    const sql = 'UPDATE calendar SET title = ?, description = ?, startDateTime = ?, endDateTime = ?, isAllDay = ?, location = ? WHERE calendarID = ?';
    const values = [title, description, startDateTime, endDateTime, isAllDay, location, eventId];

    con.query(sql, values, (err, result) => {
        if (err) {
            res.status(500).send("Error updating event");
        } else if (result.affectedRows === 0) {
            res.status(404).send("Event not found");
        } else {
            res.redirect("/calendar");
        }
    });
});


// delete events
app.get("/events/:id/delete", (req, res) => {
    const eventId = parseInt(req.params.id);
    if (!eventId) {
        res.status(400).send("Invalid event ID");
        return;
    }

    // Delete the event from the database
    const sql = 'DELETE FROM calendar WHERE calendarID = ?';
    con.query(sql, [eventId], (err, result) => {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows);
        res.redirect("/calendar");
    });
});



// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// ========================================
//               Functions
// ========================================

// OBSELETE AS OF MYSQL IMPLEMENTATION
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

// OBSELETE AS OF MYSQL IMPLEMENTATION
function generateUniqueId(parsedNotes) {
    // Find the highest existing ID
    const highestId = parsedNotes.reduce((maxId, note) => {
        return note.noteID > maxId ? note.noteID : maxId;
    }, 0);

    // Increment the highest ID by 1 to generate a new unique ID
    return highestId + 1;
}

// OBSELETE AS OF MYSQL IMPLEMENTATION
function generateEventId(parsedEvents) {
    // Find the highest existing calendarID
    const highestId = parsedEvents.reduce((maxId, event) => {
        return event.calendarID > maxId ? event.calendarID : maxId;
    }, 0);

    // Increment the highest ID by 1 to generate a new unique ID
    return highestId + 1;
}

