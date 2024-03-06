let date = new Date();
let year = date.getFullYear();
let month = (date.getMonth() + 1).toString().padStart(2, "0");
let day = date.getDate().toString().padStart(2, "0");
let hours = date.getHours();
let minutes = date.getMinutes();

let format = year + "." + month + "." + day;
let time = hours + ":" + minutes;

module.exports = {
  format: format,
  time: time,
};
