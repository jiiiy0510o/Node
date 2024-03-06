const express = require("express");
const passport = require("../passport");

const router = express.Router();

router.post(
  "/login",

  function gapChk(req, res, next) {
    if (req.body.username == "" || req.body.password == "") {
      res.send("빈칸입니다");
    } else {
      next();
    }
  },
  passport.authenticate("local"),
  function (req, res) {
    res.redirect("/");
  }
);

module.exports = router;
