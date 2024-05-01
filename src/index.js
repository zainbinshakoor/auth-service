const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const UserModel = require("./model/user");
const UserLogs = require("./model/userLogs");
const uploadImages = require("./helper/Cloudinary");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
  const { username, password, latitude, longitude, img } = req.body;

  try {
    // Check if the user already exists
    let user = await UserModel.findOne({ username });

    if (user) {
      res.status(400).send({ message: "User already exists" });
      return;
    }
    let user_img;
    if (img?.length > 0) {
      await uploadImages(img)
        .then((uploadedUrls) => {
          user_img = JSON.stringify(uploadedUrls);
        })
        .catch((error) => {
          console.error("Error uploading images:", error.message);
        });
    }

    // Create a new user with registration details
    user = new UserModel({
      username,
      password,
      img: user_img,
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

let mongodbConnection =
  "mongodb+srv://admin:admin@authnode.luyqfyf.mongodb.net/auth?retryWrites=true&w=majority";
mongoose
  .connect(mongodbConnection)
  .then(() => {
    console.log(`Connected to Database`);
    app.listen(port, () => {
      console.log(`Server is listening at http://localhost:${port}`);
    });
  })
  .catch((err) => console.log("DB ERROR", err));
