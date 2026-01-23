const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const upload = require('../utils/multer');


router.post(
  '/',
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 },
    { name: 'documents', maxCount: 5 }
  ]), 
  eventController.createEvent
);

// Other routes
router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
