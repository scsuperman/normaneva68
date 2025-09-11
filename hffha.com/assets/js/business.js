import {
  getIdForString,
  getTopLevelDomain,
  getAllRootColorKeyWords,
} from "./tools.js";
function colorInit() {
  getAllRootColorKeyWords().then((keyWords) => {
    document.documentElement.setAttribute(
      keyWords[getIdForString(getTopLevelDomain(), keyWords.length)],
      ""
    );
  });
}
colorInit();
let allGamesList = {}
let categoryGamesList = {}
async function loadJson(){
  const baseUrl = "/assets/js/games.json"; // 指向本地文件路径
  let result = await fetch(baseUrl, {
    method: "GET",
  });
  categoryGamesList = await result.json()
  if (Array.isArray(categoryGamesList)) {
    allGamesList = categoryGamesList.flat(); // 正常使用 flat()
  } else {
    // 如果 allGamesList 不是数组，可能是对象，需要特殊处理
    allGamesList = Object.values(categoryGamesList).flat();
  }

}
await loadJson();
async function getGamesList() {
  let result = await fetch("./freegames.json", { method: "GET" });
  return await result.json();
}

async function getGamesListApi(params) {
  let category = params.category
  if(category){
    return categoryGamesList[category]
  }
  if (params.name){
    for (let item of allGamesList) {
      // console.log("查找:", item.title, " item=",item);
      if (item.id === params.name) {
        // console.log("返回了:", params.name, " result=",item);
        return [item]; // 返回匹配的结果
      } else if(item.title == params.name){
        return [item]; // 返回匹配的结果
      }
    }
  }
  return allGamesList;
}

let getGamesListCategory=[
  "IO",
  "2 Player",
  "3D",
  "Adventure", 
  "Arcade",
  "Bejeweled",
  "Boys",
  "Clicker",
  "Cooking",
  "Girls",
  "Hypercasual",
  "Multiplayer",
  "Puzzle",
  "Racing",
  "Shooting",
  "Soccer",
  "Sports",
  "Stickman",
  "Baby Hazel"
]
export { getGamesList, getGamesListApi,getGamesListCategory };
