const express = require("express");
const app = express();

//passport 라이브러리 셋팅
const passport = require("passport");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const MongoStore = require("connect-mongo");
const connectDB = require("./database");
const bcrypt = require("bcrypt");

app.use(passport.session());
app.use(passport.initialize());

app.use(
  session({
    secret: "암호화에 쓸 비번",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      dbName: "forum",
    }),
  })
);

//제출 한 아이디/비번 검사하는 코드
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const client = await connectDB;
      const db = client.db("forum");
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
    let db = await connectDB;
    let user = await db.collection("user").findOne({ _id: new ObjectId(id) });
    delete user.password;
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
