/*
叮咚每日签到积分
登录叮咚买菜App,进入一次鱼塘,在抓包记录里搜 /api/v2/user/randomlist ,在请求头里找属性 cookie、和url后的一串数字

docker环境变量名:
ddxpCookies、ddxpHeaders 多账号@隔开
url中 /api/v2/user/randomlist?api_version=9.1.0&app_client_id=1&xxxx 问号后面的 api_version= 为 ddxpHeaders
关键参数 station_id、stationId、uid、latitude、longitude、lat、lng

[task_local]
10 8 * * * ddxp_sign.js
*/

const $ = new Env('叮咚每日签到积分');
const notify = $.isNode() ? require('./sendNotify') : '';
const ddxpcookie = $.isNode() ? process.env.ddxpCookies : '';
const ddxpheader = $.isNode() ? process.env.ddxpHeaders : '';

let cookiesArr = [], cookie = '';
let headersArr = [], headerInfo = '';
let allMessage = '';

let cityNumber = '1001';

!(async () => {
    if (ddxpcookie && ddxpheader) {
        if (ddxpcookie.indexOf("@") != -1) {
            console.log(`您的cookie选择的是用@隔开\n`)
            ddxpcookie.split("@").forEach((item) => {
                cookiesArr.push(item);
            });
        } else if (ddxpcookie.indexOf("\n") != -1) {
            console.log(`您的cookie选择的是用换行隔开\n`)
            ddxpcookie.split("\n").forEach((item) => {
                cookiesArr.push(item);
            });
        } else {
            cookiesArr.push(ddxpcookie);
        }

        if (ddxpheader.indexOf("@") != -1) {
            console.log(`您的header选择的是用@隔开\n`)
            ddxpheader.split("@").forEach((item) => {
                headersArr.push(item);
            });
        } else if (ddxpheader.indexOf("\n") != -1) {
            console.log(`您的header选择的是用换行隔开\n`)
            ddxpheader.split("\n").forEach((item) => {
                headersArr.push(item);
            });
        } else {
            headersArr.push(ddxpheader);
        }
        console.log(`------------- 共${cookiesArr.length}个账号 -------------\n`)
    } else {
        $.msg($.name, '【提示】请先获取账号一cookie或header');
        return;
    }

    console.log(
        `============= 脚本执行 - 北京时间(UTC+8):${new Date(
            new Date().getTime() +
            new Date().getTimezoneOffset() * 60 * 1000 +
            8 * 60 * 60 * 1000
        ).toLocaleString()} =============\n`);
    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            await getUrl(headersArr[i]);
            $.index = i + 1;
            $.isLogin = true;
            $.userName = '';
            await userInfo();
            console.log(`****** 开始【账号${$.index}】${$.userName} ******\n`);
            if (!$.isLogin) {
                $.msg($.name, '', `【账号${$.index}】cookie已失效\n请重新登录获取\n\n`);
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}`, `【账号${$.index}】cookie已失效\n请重新登录获取\n\n`);
                }
                continue
            }
            await main();
        }
    }
    if (allMessage) {
        if ($.isNode()) await notify.sendNotify(`${$.name}`, `${allMessage}`);
        $.msg($.name, '', allMessage);
    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())

async function main() {
    await cityCode();
    await $.wait(2000);
    await onSignin();
}

// 参数处理
function getUrl(ddxpurl) {
    let url = ddxpurl.split("?")
    let ddxpurls = url[url.length - 1].split("&")
    let sendInfo = {}
    for (const val of ddxpurls) {
        let vals = val.split("&")
        for (const val1 of vals) {
            let kv = val1.split("=")
            sendInfo[kv[0]] = kv[1]
        }
    }
    headerInfo = sendInfo
}

// 基本信息
function userInfo() {
    return new Promise((resove) => {
        let options = {
            url: `https://maicai.api.ddxq.mobi/user/info?api_version=9.7.3&app_version=1.0.0&app_client_id=3&station_id=${headerInfo.station_id}&native_version=9.41.0&city_number=${cityNumber}&latitude=${headerInfo.latitude}&longitude=${headerInfo.longitude}`,
            headers: {
                "accept": "*/*",
                "origin": "https://activity.m.ddxq.mobi",
                "cookie": cookie,
                "accept-encoding": "gzip, deflate, br",
                "user-agent": `Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 xzone/9.41.0 station_id/${headerInfo.station_id}`,
                "accept-language": "zh-cn",
                "referer": "https://activity.m.ddxq.mobi/"
            }
        }

        $.get(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    if (data.success) {
                        $.userName = data.data.name
                        console.log('登录成功，欢迎账号', `${data.data.name}\n`)
                    } else {
                        console.log(data.msg)
                        $.isLogin = false; // cookie过期
                        return
                    }
                }
            } catch (e) {
                $.logErr('失败', e)
            } finally {
                resove()
            }
        })
    })
}

// 获取定位城市
function cityCode() {
    return new Promise((resove) => {
        let url = `https://sunquan.api.ddxq.mobi/api/v2/user/location/city/?api_version=9.1.0&app_client_id=1&station_id=${headerInfo.station_id}&stationId=${headerInfo.station_id}&native_version=&app_version=9.41.0&uid=${headerInfo.uid}&latitude=${headerInfo.latitude}&longitude=${headerInfo.longitude}&lat=${headerInfo.lat}&lng=${headerInfo.lng}`
        let options = {
            url: url,
            headers: {
                "accept": "*/*",
                "origin": "https://orchard-m.ddxq.mobi",
                "cookie": cookie,
                "accept-encoding": "gzip, deflate, br",
                "user-agent": `Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 xzone/9.41.0 station_id/${headerInfo.station_id}`,
                "accept-language": "zh-cn",
                "referer": "https://orchard-m.ddxq.mobi/?is_nav_hide=true&isResetAudio=true&s=mine_orchard",
            }
        }

        $.get(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    // console.log(`当前城市\n`, data.data)
                    if (data.success) {
                        cityNumber = data.data.locate_city.city_number;
                        console.log('当前城市:', `${data.data.locate_city.city_name}\n`);
                    } else {
                        console.log(data.msg)
                    }
                }
            } catch (e) {
                $.logErr('失败', e)
            } finally {
                resove()
            }
        })
    })
}

// 签到
function onSignin() {
    return new Promise((resove) => {
        let options = {
            url: `https://sunquan.api.ddxq.mobi/api/v2/user/signin/`,
            headers: {
                "accept": "*/*",
                "content-type": "application/x-www-form-urlencoded",
                "origin": "https://activity.m.ddxq.mobi",
                "cookie": cookie,
                "content-length": "166",
                "accept-language": "zh-cn",
                "user-agent": `Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 xzone/9.41.0 station_id/${headerInfo.station_id}`,
                "referer": "https://activity.m.ddxq.mobi/",
                "accept-encoding": "gzip, deflate, br"
            },
            body: `api_version=9.7.3&app_version=1.0.0&app_client_id=3&station_id=${headerInfo.station_id}&native_version=9.41.0&city_number=${cityNumber}&latitude=${headerInfo.latitude}&longitude=${headerInfo.longitude}`,
        }
        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${$.name} API请求失败，请检查网路重试 ‼️‼️`)
                    $.logErr(error);
                } else {
                    data = JSON.parse(data)
                    console.log('签到成功\n', data)
                    if (data.success) {
                        $.log(`恭喜你获得${data.data.point}积分，已连续签到${data.data.new_sign_series}天\n\n`)
                        allMessage += `【账号${$.index}】${$.userName}\n【任务状态】签到成功，恭喜你获得${data.data.point}积分，已连续签到${data.data.new_sign_series}天\n\n`
                    } else {
                        console.log(data.msg)
                    }
                }
            } catch (e) {
                $.logErr('失败', e)
            } finally {
                resove()
            }
        })
    })
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
