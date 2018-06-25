const path = require("path");

module.exports = {
  entry: "./src/Main.js",
  output: {
    filename: "Mainy.js",
    path: path.resolve(__dirname, "dist")
  },
  optimization: {
    minimize: false
  }
};