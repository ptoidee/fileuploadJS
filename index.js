if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}

const express = require("express");
const path = require("path");
const ejsMate = require("ejs-mate");
const mongoose = require("mongoose");
const multer = require("multer");
const { cloudinary, storage } = require("./cloudinary");
const upload = multer({ storage });

const File = require("./model");

mongoose.connect("mongodb://localhost:27017/transfiler", {
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
	console.log("Database connected");
});

const app = express();

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

const checkExpire = async (req, res, next) => {
	const id = req.params.id;
	const file = await File.findById(id);
	if (file) {
		if (Date.now() > file.expire) {
			//Expired

			await File.findByIdAndRemove(file._id);
			await cloudinary.uploader.destroy(file.file[0].filename);
		}
	}
	next();
};

app.get("/", (req, res) => {
	res.render("index");
});

app.get("/upload", (req, res) => {
	res.render("upload");
});
app.get("/detail/:id", checkExpire, async (req, res) => {
	const file = await File.findById(req.params.id);
	res.render("details", { file });
});

app.post("/upload", upload.array("filename"), async (req, res) => {
	const file = new File(req.body);
	file.file = req.files.map((f) => ({
		url: f.path,
		filename: f.filename,
	}));
	file.date = Date.now();
	file.expire = file.date + file.expire * 60 * 1000;
	await file.save();
	res.redirect(`/detail/${file._id}`);
});
app.get("/retrieve", (req, res) => {
	res.render("retrieve");
});
app.post("/retrieve", (req, res) => {
	res.redirect(`/detail/${req.body.file}`);
});

app.listen("3000", () => {
	console.log("listening at port 3000");
});
