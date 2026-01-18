const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/signup', authController.signup)
      .post('/login', authController.login);

router.get('/me', protect, authController.getMe); 
router.put('/me', protect, authController.updateMe);

module.exports = router;
