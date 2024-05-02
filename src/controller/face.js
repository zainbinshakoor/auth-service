const {
  uploadLabeledImages,
  getDescriptorsFromDB,
} = require("../helper/face.js");

const checkFace = async (req, res) => {
  const File = req.file.path;
  let result = await getDescriptorsFromDB(File);
  if (result) {
    res.status(200).json({ result });
  } else {
    res.status(404).send({ message: "user not found" });
  }
};

const uploadFace = async (req, res) => {
  const label = req.body.label;
  const File = req.file.path;
  // const File = req.files.File.tempFilePath;
  let result = await uploadLabeledImages(File, label);
  if (result) {
    res.json({ message: "Face data stored successfully" });
  } else {
    res.json({ message: "Something went wrong, please try again." });
  }
};

module.exports = { checkFace, uploadFace };
