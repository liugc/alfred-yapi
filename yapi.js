const Flow = require("./workflow");
const flow = new Flow();

const login = () => {
  return new Promise(async (resolve, reject) => {
    let email = await flow.getItem('email');
    let password = await flow.getItem('password');
    if (!email) {
      reject(new Error("请先输入email"));
      return;
    }
    if (!password) {
      reject(new Error("请先输入password"));
      return;
    }
    let url = await flow.getItem('url');
    flow.post(`${url}/api/user/login_by_ldap`, {
      email,
      password
    }).then((res) => {
      let cookies = res.headers['set-cookie'];
      let arr = [];
      if (cookies && cookies.length > 0) {
        cookies.forEach((item) => {
          arr.push(item.split(";")[0]);
        });
        let Cookie = arr.join("; ");
        flow.setHeader({ Cookie });
        resolve();
      }
    }).catch((err) => {
      reject(err);
    });
  });
}

const getProject = (url, id) => {
  return new Promise(async (resolve, reject) => {
    let body = await flow.get(`${url}/api/project/list`, {
      group_id: id,
      page: 1,
      limit: 1000
    });
    body = JSON.parse(body.data);
    let list = body.data.list;
    list = list.filter(item => item.add_time);
    resolve(list);
  });
}

const getInterface = (url, project_id) => {
  return new Promise(async (resolve, reject) => {
    let body = await flow.get(`${url}/api/interface/list`, {
      page: 1,
      limit: 1000,
      project_id: project_id
    });
    body = JSON.parse(body.data);
    let list = body.data.list;
    setTimeout(() => {
      resolve(list);
    }, 20);
  });
}

const getGroup = (url) => {
  return new Promise(async (resolve, reject) => {
    let body = await flow.get(`${url}/api/group/list`);
    body = JSON.parse(body.data);
    if (body.errcode === 0) {
      let projects = body.data;
      let promiseArr = [];
      projects.forEach((item) => {
        promiseArr.push(getProject(url, item._id));
      });
      Promise.all(promiseArr).then((data) => {
        let arr = [];
        data.forEach((item) => {
          item.forEach((it) => {
            arr.push(it);
          });
        });
        resolve(arr);
      });
    } else {
      reject(new Error(body.errmsg));
    }
  });
}

const getAllInterface = (url) => {
  return new Promise(async (resolve, reject) => {
    let list = await getGroup(url);
    let data = [];
    for (var i=4; i<list.length; i++) {
      data.push(await getInterface(url, list[i]._id));
    }
    let arr = [];
    data.forEach((item) => {
      item.forEach((it) => {
        arr.push(it);
      });
    });
    lists = arr.map((item) => {
      return {
        title: item.path,
        subtitle: item.title,
        arg: `${url}/project/${item.project_id}/interface/api/${item._id}`
      };
    });
    resolve(lists);
  });
}

const filterLists = (lists) => {
  let query = flow.input || "";
  query = query.toLowerCase();
  lists = lists.filter((list) => {
    let title = list.title.toLowerCase();
    let subtitle = list.subtitle.toLowerCase();
    return title.indexOf(query) > -1 || subtitle.indexOf(query) > -1;
  });
  lists = lists.map((list) => {
    list.icon = flow.icon("url.png");
    return list;
  });
  if (lists.length === 0) {
    lists = [{
      title: '暂无数据',
      icon: flow.icon("tip.png")
    }];
  }
  if (!query) {
    lists = lists.splice(0, 10);
  }
  return lists;
}

const fetchList = async () => {
  let url = await flow.getItem("url");
    if (!url) {
      flow.log([{
        title: "暂无数据：缺少项目地址",
        icon: flow.icon("error.png")
      }]);
      return;
    }
    let email = await flow.getItem("email");
    if (!email) {
      flow.log([{
        title: "暂无数据：缺少email",
        icon: flow.icon("error.png")
      }]);
      return;
    }
    let password = await flow.getItem("password");
    if (!password) {
      flow.log([{
        title: "暂无数据：缺少password",
        icon: flow.icon("error.png")
      }]);
      return;
    }
    try {
      try {
        await login();
      } catch(err) {
        console.error(err);
      }
      let lists = await getAllInterface(url);
      flow.log(filterLists(lists));
      flow.setItem("lists", lists);
    } catch(err) {
      flow.log([{
        title: err.message
      }]);
    }
}

const showList = async () => {
  let lists = await flow.getItem("lists");
  if (lists) {
    flow.log(filterLists(lists));
  } else {
    fetchList();
  }
}

const run = () => {
  if (flow.argv.list) {
    showList();
  }
  if (flow.argv.email || flow.argv.password || flow.argv.url) {
    flow.log([{
      title: flow.input,
      arg: flow.input
    }]);
  }
  if (flow.argv.addEmail) {
    flow.setItem("email", flow.input);
  }
  if (flow.argv.addPassword) {
    flow.setItem("password", flow.input);
  }
  if (flow.argv.addUrl) {
    flow.setItem("url", flow.input);
  }
  if (flow.argv.update) {
    fetchList();
  }
}

run();