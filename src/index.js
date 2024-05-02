const express = require("express");
const app = express();
const cors = require("cors");

const faceapi = require("face-api.js");
const { Canvas, Image } = require("canvas");
const canvas = require("canvas");
const fileUpload = require("express-fileupload");
faceapi.env.monkeyPatch({ Canvas, Image });
const formidable = require("formidable");
const bodyParser = require("body-parser");
const multer = require("multer");
const FaceModel = require("./model/face");

const mongoose = require("mongoose");
const UserModel = require("./model/user");
const UserLogs = require("./model/userLogs");
app.use(cors());
const upload = multer({ dest: "uploads/" }); // Specify upload directory

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
const port = process.env.PORT || 9002;

app.get("/", (req, res) => {
  res.send(`Server is up and running `);
});
app.get("/health-check", (req, res) => {
  res.send(
    `Server is up and running & listening on port ${port} at Datetime ${new Date()} `
  );
});

app.post("/login", async (req, res) => {
  const { username, password, latitude, longitude } = req.body;
  const user = await UserModel.findOne({ username });
  if (user && user.password == password) {
    // Log the user's initial login in the logs collection
    const loginLog = new UserLogs({
      userId: user._id,
      action: "login",
      timestamp: new Date(),
      latitude,
      longitude,
    });
    await loginLog.save();
    delete user.password;
    res.send({
      message: "user login successful",
      data: { name: username },
    });
  } else {
    res.status(404).send({ message: "user not found" });
  }
});

app.post("/logout", async (req, res) => {
  const { userId, latitude, longitude } = req.body;

  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Log the user's logout in the logs collection
    const logoutLog = new UserLogs({
      userId: user._id,
      action: "logout",
      timestamp: new Date(),
      latitude,
      longitude,
    });
    await logoutLog.save();
    res.send({ message: "Logout successful" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.post("/entry", async (req, res) => {
  // Extract necessary data from the request body
  const { username, password, latitude, longitude } = req.body;

  try {
    // Check if the user already exists
    let user = await UserModel.findOne({ username });

    if (user) {
      res.status(400).send({ message: "User already exists" });
      return;
    }

    // Create a new user with registration details
    user = new UserModel({
      username,
      password,
    });

    await user.save();

    // Log the user's registration in the logs collection
    const registrationLog = new UserLogs({
      userId: user._id,
      action: "registration",
      timestamp: new Date(),
      latitude,
      longitude,
    });
    await registrationLog.save();

    // Log the user's initial login in the logs collection
    const loginLog = new UserLogs({
      userId: user._id,
      action: "login",
      timestamp: new Date(),
      latitude,
      longitude,
    });
    await loginLog.save();

    // Send a response indicating successful registration and login
    res.status(201).send({
      message: "User registered and logged in successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error during registration and login:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.get("/logs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const logs = await UserLogs.find({ userId: id });
    res.status(200).send(logs);
  } catch (error) {
    console.error("Error retrieving logs:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

let mongodbConnection = "mongodb://localhost:27017/auth";
// "mongodb+srv://admin:admin@authnode.luyqfyf.mongodb.net/auth?retryWrites=true&w=majority";
mongoose
  .connect(mongodbConnection)
  .then(() => {
    console.log(`Connected to Database`);
    app.listen(port, () => {
      console.log(`Server is listening at http://localhost:${port}`);
    });
  })
  .catch((err) => console.log("DB ERROR", err));

async function LoadModels() {
  // Load the models
  // __dirname gives the root directory of the server
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/../models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/../models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/../models");
}
LoadModels();

async function uploadLabeledImages(image, data) {
  const { username, password } = data;
  try {
    const img = await canvas.loadImage(image);
    // Read each face and save the face descriptions in the descriptions array
    const detections = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    const description = detections.descriptor;

    const createFace = new UserModel({
      username,
      password,
      imgDesc: description,
    });

    await createFace.save();
    return true;
  } catch (error) {
    console.log(error);
    return error;
  }
}

app.post("/post-face", upload.single("File"), async (req, res) => {
  const data = req.body;
  const File = req.file.path;

  let result = await uploadLabeledImages(File, data);
  if (result) {
    res.json({ message: "Face data stored successfully" });
  } else {
    res.json({ message: "Something went wrong, please try again." });
  }
});

async function getDescriptorsFromDB(image) {
  // Get all the face data from mongodb and loop through each of them to read the data
  let faces = await UserModel.find();
  for (i = 0; i < faces.length; i++) {
    // Change the face data descriptors from Objects to Float32Array type
    for (j = 0; j < faces[i].imgDesc.length; j++) {
      faces[i].imgDesc[j] = new Float32Array(
        Object.values(faces[i].imgDesc[j])
      );
    }
    // Turn the DB face docs to
    faces[i] = new faceapi.LabeledFaceDescriptors(
      faces[i]._id.toString(),
      faces[i].imgDesc
    );
  }

  // Load face matcher to find the matching face
  const faceMatcher = new faceapi.FaceMatcher(faces, 0.6);

  // Read the image using canvas or other method
  const img = await canvas.loadImage(image);
  let temp = faceapi.createCanvasFromMedia(img);
  // Process the image for the model
  const displaySize = { width: img.width, height: img.height };
  faceapi.matchDimensions(temp, displaySize);

  // Find matching faces
  const detections = await faceapi
    .detectAllFaces(img)
    .withFaceLandmarks()
    .withFaceDescriptors();
  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  const results = resizedDetections.map((d) =>
    faceMatcher.findBestMatch(d.descriptor)
  );
  if (results.length > 0) {
    const data = { ...results[0] };
    const user = await UserModel.findOne({ _id: data._label });
    return { ...data, ...user.toJSON() };
  }
  return null;
}

app.post("/check-face", upload.single("File"), async (req, res) => {
  const File = req.file.path;
  let result = await getDescriptorsFromDB(File);
  if (result) {
    res.json({ result });
  } else {
    res.status(404).send({ message: "usr not found" });
  }
});
