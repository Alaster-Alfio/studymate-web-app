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

// User ID (Example)
let userId = 1;

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
    const users = readOrWriteFile('read', null, "data/users.json");
    const parsedUsers = JSON.parse(users);
    const user = parsedUsers.find(user => user.username === username);
    console.log(req.body.username)
    
    if (user) {
        userId = user.userID;
        res.redirect("/notes");
    } else {
        // User not found, send back an error message
        res.status(404).send("User not found");
    }
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

/*
https://uiverse.io/Alanav29/tough-ape-65 (Username Input)

*/