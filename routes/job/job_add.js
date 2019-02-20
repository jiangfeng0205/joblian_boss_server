var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('job/job_add', { title: '添加职位' });
});

module.exports = router;
