const mongoose = require("mongoose");
// Define the schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  img: {
    type: String,
    required: false,
  },
  imgDesc: {
    type: Array,
    required: true,
  },
});

// Create a model from the schema
const UserDetailSchema = mongoose.model("Users", userSchema);

module.exports = UserDetailSchema;
