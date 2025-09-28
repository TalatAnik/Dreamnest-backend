const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.params.category || 'property';
    const uploadPath = path.join('uploads', category);
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    
    // Sanitize filename
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${sanitizedBaseName}_${uniqueSuffix}${extension}`;
    
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types based on category
  const category = req.params.category || 'property';
  
  let allowedTypes = [];
  let allowedExtensions = [];
  
  switch (category) {
    case 'avatar':
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
      break;
    case 'property':
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
      break;
    case 'document':
      allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      allowedExtensions = ['.pdf', '.doc', '.docx'];
      break;
    case 'portfolio':
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
      break;
    default:
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  }
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    const error = new Error(`File type not allowed for category '${category}'. Allowed types: ${allowedExtensions.join(', ')}`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          status: 'error',
          message: 'File size too large. Maximum size is 10MB per file.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          status: 'error',
          message: 'Too many files. Maximum 10 files per request.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          status: 'error',
          message: 'Unexpected file field.'
        });
      default:
        return res.status(400).json({
          status: 'error',
          message: 'File upload error: ' + error.message
        });
    }
  }
  
  if (error && error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
  
  next(error);
};

// Middleware functions for different upload scenarios
const uploadSingle = (fieldName, category = 'property') => {
  return [
    (req, res, next) => {
      req.params.category = category;
      next();
    },
    upload.single(fieldName),
    handleMulterError
  ];
};

const uploadMultiple = (fieldName, maxCount = 10, category = 'property') => {
  return [
    (req, res, next) => {
      req.params.category = category;
      next();
    },
    upload.array(fieldName, maxCount),
    handleMulterError
  ];
};

const uploadFields = (fields, category = 'property') => {
  return [
    (req, res, next) => {
      req.params.category = category;
      next();
    },
    upload.fields(fields),
    handleMulterError
  ];
};

// Utility function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Utility function to get file URL
const getFileUrl = (req, filePath) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/${filePath.replace(/\\/g, '/')}`;
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleMulterError,
  deleteFile,
  getFileUrl
};