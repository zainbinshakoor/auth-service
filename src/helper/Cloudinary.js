// Configure Cloudinary
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dgcj0tnd9",
  api_key: "961717875977285",
  api_secret: "GYYWomMu44wCH3j9i6BkwE1U8zo",
});
const uploadImages = (imageUrls) => {
  return Promise.all(
    imageUrls.map((imageUrl, index) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(imageUrl?.dataURL, (error, result) => {
          if (error) {
            console.error(`Error uploading image ${index + 1}:`, error);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        });
      });
    })
  );
};

module.exports.uploadImages = uploadImages;
