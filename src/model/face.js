const mongoose = require("mongoose");

const faceSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: Array,
    required: true,
  },
});

const FaceModel = mongoose.model("Face", faceSchema);

module.exports = FaceModel;
