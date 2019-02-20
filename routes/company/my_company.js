var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('company/my_company', { title: '我的公司' });
});

module.exports = router;
