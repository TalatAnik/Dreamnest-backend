const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const {
  uploadFile,
  uploadAvatar,
  getPublicProfile,
  deleteUploadedFile
} = require('../controllers/uploadController');
const { fileIdSchema, userIdSchema } = require('../validators/uploadValidators');

const router = express.Router();

// Public routes
router.get('/profile/:userId', getPublicProfile);

// Protected routes (require authentication)
router.use(authenticateToken);

// General file upload
router.post('/', uploadSingle('file'), uploadFile);

// Avatar upload
router.post('/avatar', uploadSingle('avatar', 'avatar'), uploadAvatar);

// Delete file
router.delete('/:fileId', deleteUploadedFile);

module.exports = router;