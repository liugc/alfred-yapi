const http = require("http");
const https = require("https");
const querystring = require("querystring");
const path = require("path");
const fs = require("fs");
const db = path.resolve(__dirname, "db.json");

class Flow {
  constructor() {
    this.headers = {};
    let obj = {};
    process.argv.forEach((item, i) => {
      if (item.indexOf("--") === 0) {
        item = item.substring(2);
        if (item.indexOf("=") > -1) {
          let arr = item.split("=");
          let key = arr[0];
          let value = arr[1];
          obj[key] = value;
        } else {
          obj[item] = true;
        }
      } else if (i > 1) {
        this.input = process.argv[i];
      }
    });
    this.argv = obj;
  }
  log(items) {
    if (typeof items === "string") {
      console.log(JSON.stringify({items: [{
        title: items
      }]}));
    } else {
      console.log(JSON.stringify({items}));
    }
  }
  icon(img) {
    return {
      path: path.resolve(__dirname, img)
    };
  }
  setHeader(headers) {
    this.headers = headers;
  }
  request(url, data = {}, opt = {}) {
    return new Promise((resolve, reject) => {
      let protocol = http;
      if (url.indexOf("https") > -1) {
        protocol = https;
      }
      opt = Object.assign({headers: this.headers}, opt);
      console.error(opt);
      let req = protocol.request(url, opt, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          res.data = rawData;
          resolve(res);
        });
      }).on('error', (err) => {
        reject(err);
      });
      req.write(JSON.stringify(data));
      req.end();
    });
  }
  get(url, data = {}, opt = {}) {
    data = querystring.stringify(data);
    url = data ? url + "?" + data : url;
    opt.method = "GET";
    return this.request(url, {}, opt);
  }
  post(url, data = {}, opt = {}) {
    Object.assign(opt, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
      }
    });
    return this.request(url, data, opt);
  }
  getItem(key) {
    return new Promise((resolve, reject) => {
      fs.stat(db, (err, stats) => {
        if (!err) {
          let str = fs.readFileSync(db).toString();
          try {
            let data = JSON.parse(str);
            resolve(data[key]);
          } catch(e) {
            resolve();
          }
        } else {
          resolve();
        }
      });
    })
  }
  setItem(key, value) {
    return new Promise((resolve, reject) => {
      let data = {};
      fs.stat(db, (err, stats) => {
        if (!err) {
          let str = fs.readFileSync(db);
          try {
            data = JSON.parse(str);
          } catch(e) {
          }
        }
        data[key] = value;
        data = JSON.stringify(data, null, "\t");
        fs.writeFile(db, data, (err) => {
          console.error(err);
          if (err) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    });
  }
}

module.exports = Flow;