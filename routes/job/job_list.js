var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('job/job_list', { title: '全部职位' });
});

module.exports = router;
