// Create simple express app running port 3000 with EJS view engine

const express = require("express");
const app = express();
const port = 3000;
const path = require("path");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
    res.render("index");
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
})

/*
https://uiverse.io/Alanav29/tough-ape-65 (Username Input)

*/