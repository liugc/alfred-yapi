const Flow = require("./workflow");
const flow = new Flow();

const getProject = (url, id) => {
  return new Promise(async (resolve, reject) => {
    let body = await flow.get(`${url}/api/project/list`, {
      group_id: id,
      page: 1,
      limit: 1000
    })
    body = JSON.parse(body);
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
    body = JSON.parse(body);
    let list = body.data.list;
    setTimeout(() => {
      resolve(list);
    }, 20);
  });
}

const getGroup = (url) => {
  return new Promise(async (resolve, reject) => {
    let body = await flow.get(`${url}/api/group/list`);
    body = JSON.parse(body);
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
    let Cookie = await flow.getItem("cookie");
    if (!Cookie) {
      flow.log([{
        title: "暂无数据：缺少cookie",
        icon: flow.icon("error.png")
      }]);
      return;
    }
    flow.setHeader({ Cookie });
    try {
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
  if (flow.argv.cookie || flow.argv.url) {
    flow.log([{
      title: flow.input,
      arg: flow.input
    }]);
  }
  if (flow.argv.addCookie) {
    flow.setItem("cookie", flow.input);
  }
  if (flow.argv.addUrl) {
    flow.setItem("url", flow.input);
  }
  if (flow.argv.update) {
    fetchList();
  }
}

run();