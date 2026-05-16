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
    allGamesList = shuffleArray(allGamesList)
  }
  // console.log("AllGamesList:", allGamesList)
  // console.log("categoryGamesList:", categoryGamesList)
  // Fisher-Yates 洗牌算法（打乱数组）

}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

await loadJson();
async function getGamesList() {
  let result = await fetch("./freegames.json", { method: "GET" });
  return await result.json();
}
async function getGamesListApi(params) {
  // console.log("158======params:", JSON.stringify(params, null, 2));
  let category = params.category
  if(category){
    return categoryGamesList[category]
  }

  // allGamesList[]
  // console.log("158======params:", params.name, " result=",result);
  if (params.name){
    for (let item of allGamesList) {
      // console.log("查找:", item.title, " item=",item);
      if (item.title === params.name) {
        // console.log("返回了:", params.name, " result=",item);
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
