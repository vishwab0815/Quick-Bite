/**
 * Cloudinary Configuration
 * For image upload and storage in the cloud
 *
 * Free Tier:
 * - 25GB storage
 * - 25GB bandwidth per month
 * - Image transformations
 *
 * Sign up: https://cloudinary.com/users/register/free
 * Get credentials from: https://console.cloudinary.com/settings
 */

const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer to use memory storage (store files in RAM temporarily)
const storage = multer.memoryStorage();

// Create multer instance with memory storage
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024  // 5MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'), false);
        }
    }
});

/**
 * Upload image buffer to Cloudinary
 * @param {Buffer} fileBuffer - The image file buffer from multer
 * @param {string} folder - Folder in Cloudinary (default: 'quickbite/food-items')
 */
const uploadToCloudinary = (fileBuffer, folder = 'quickbite/food-items') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                transformation: [
                    {
                        width: 800,
                        height: 800,
                        crop: 'limit',
                        quality: 'auto:good'
                    }
                ]
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        // Pipe the buffer to the upload stream
        uploadStream.end(fileBuffer);
    });
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 */
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`✅ Image deleted from Cloudinary: ${publicId}`);
        return result;
    } catch (error) {
        console.error('❌ Error deleting image from Cloudinary:', error);
        throw error;
    }
};

module.exports = {
    cloudinary,
    upload,
    uploadToCloudinary,
    deleteImage
};
