var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('company/company_info', { title: '公司详情' });
});

module.exports = router;
