const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

//passport 라이브러리 셋팅
const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");

let db;
const connectDB = require("./database");

connectDB
  .then((client) => {
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

//제출 한 아이디/비번 검사하는 코드
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await db.collection("user").findOne({ username: username });
      if (!user) {
        return done(null, false, { message: "아이디 DB에 없음" });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return done(null, false, { message: "비번불일치" });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  //내부코드를 비동기적으로 처리해줌
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  });
});

//유저가 보낸 쿠키분석
passport.deserializeUser(async (id, done) => {
  try {
    let user = await db.collection("user").findOne({ _id: new ObjectId(id) });
    delete user.password;
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
