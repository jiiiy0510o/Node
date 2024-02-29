const router = require("express").Router();
const { ObjectId } = require("mongodb");

let db;
let connectDB = require("./../database.js");

connectDB
  .then((client) => {
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

router.put("/edit", async (req, res) => {
  //inc - 증감, mul - 곱, unset - 필드값삭제
  // await db.collection("post").updateOne({ _id: 5 }, { $inc: { like: 1 } });
  await db
    .collection("post")
    .updateOne({ _id: new ObjectId(req.body.id) }, { $set: { title: req.body.title, content: req.body.content } });
  res.redirect("/list");
});

router.get("/edit/:id", async (req, res) => {
  let result = await db.collection("post").findOne({ _id: new ObjectId(req.params.id) });
  res.render("edit.ejs", { result: result });
});

module.exports = router;
