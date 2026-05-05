const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/analyticsController');

router.post('/track',    controller.trackEvent);
router.get('/analytics', controller.getAnalytics);
router.get('/sessions',  controller.getSessions);
router.delete('/reset',  controller.resetData);

module.exports = router;