var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('company/company_add', { title: '添加公司' });
});

module.exports = router;
