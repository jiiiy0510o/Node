const express = require("express");
const app = express();
const passport = require("../passport");

const router = express.Router();

app.use(passport.session());
app.use(passport.initialize());

router.post(
  "/login",
  function gapChk(req, res, next) {
    if (req.body.username == "" || req.body.password == "") {
      res.send("빈칸입니다");
    } else {
      next();
    }
  },
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

module.exports = router;
