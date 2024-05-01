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
});

// Create a model from the schema
const UserDetailSchema = mongoose.model("Users", userSchema);

module.exports = UserDetailSchema;
