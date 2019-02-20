var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('job/contact_job_list', { title: '我的沟通职位' });
});

module.exports = router;
