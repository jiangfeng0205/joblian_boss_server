var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('banner', { title: '导航' });
});

module.exports = router;
