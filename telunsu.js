/*
特仑苏牧场
微信搜索特仑苏名仕会小程序,进入一次特仑苏牧场,在抓包记录里搜 /shenghuo/telunsuUser/queryUserMilkAndGlass ,在body中找到请求参数

docker环境变量名:
tlsOpenids 多账号@隔开
body中 {"query":{"openid":"xxxxxxxxxxxxxx"}} openid 为 tlsOpenids

[task_local]
19 10 * * * telunsu.js
*/

const $ = new Env('特仑苏牧场');
const notify = $.isNode() ? require('./sendNotify') : '';
const tlsopenid = $.isNode() ? process.env.tlsOpenids : '';

let openidsArr = [], openid = '';
let allMessage = '';
let headers = {
    "Host": "mc.telunsu.net",
    "Accept": "*/*",
    "Accept-Language": "zh-cn",
    "Accept-Encoding": "gzip, deflate, br",
    "token": "",
    "Content-Type": "application/json",
    "Origin": "https://mc.telunsu.net",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.16(0x18001033) NetType/WIFI Language/zh_CN miniProgram",
    "Connection": "keep-alive",
    "Referer": "https://mc.telunsu.net/html/web/index.html?dmcode=&si=&Scene=min&UserID=&SceneValue=2003&v=&sharetype=&fromUserId=&fromGrowthid=&lotteryID=&hmsr=",
    "Content-Length": "85"
}
$.shareCodeList = [];

!(async () => {
    if (tlsopenid) {
        if (tlsopenid.indexOf("@") != -1) {
            console.log(`您的openid选择的是用@隔开\n`)
            tlsopenid.split("@").forEach((item) => {
                openidsArr.push(item);
            });
        } else if (tlsopenid.indexOf("\n") != -1) {
            console.log(`您的openid选择的是用换行隔开\n`)
            tlsopenid.split("\n").forEach((item) => {
                openidsArr.push(item);
            });
        } else {
            openidsArr.push(tlsopenid);
        }

        console.log(`------------- 共${openidsArr.length}个账号 -------------\n`)
    } else {
        $.msg($.name, '【提示】请先获取账号一openid');
        return;
    }

    console.log(
        `============= 脚本执行 - 北京时间(UTC+8):${new Date(
            new Date().getTime() +
            new Date().getTimezoneOffset() * 60 * 1000 +
            8 * 60 * 60 * 1000
        ).toLocaleString()} =============\n`);
    for (let i = 0; i < openidsArr.length; i++) {
        if (openidsArr[i]) {
            openid = openidsArr[i];
            $.index = i + 1;
            $.isLogin = true;
            $.userId = '';
            $.userName = '';
            $.userToken = '';
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
    $.shareCodeList = [...new Set([...$.shareCodeList])]
    console.log(`助力码:`, $.shareCodeList)
    // 内部助力
    if (openidsArr.length > 2) {
        console.log(`\n=====开始账号内互助=====\n`)
        for (let i = 0; i < openidsArr.length; i++) {
            if (openidsArr[i]) {
                openid = openidsArr[i];
                for (let y = 0; y < $.shareCodeList.length; y++) {
                    console.log(`账号${$.index} ${$.userName}去助力${$.shareCodeList[y]}`)
                    // await friendHelp(openid, $.shareCoseList[y]);
                    await $.wait(1000);
                }
            }
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
    await $.wait(2000);
    await updateToken();
    await $.wait(2000);
    await onSignin();
    await $.wait(2000);
    await glassInfoSave('收集草种-浏览奖励');
    // await $.wait(2000);
    // await glassInfoSave('收集草种-漫谈会互动');
    await $.wait(2000);
    await takeInteraction('susuMeijia');
    await $.wait(2000);
    await takeInteraction('susuRiguangyu');
    await $.wait(2000);
    await takeInteraction('susuHuli');
    await $.wait(2000);
    await pastureInfo();
}

// 用户基本信息
function userInfo() {
    return new Promise((resove) => {
        let options = {
            url: `https://mall.telunsu.net/wxapi/rest/getUser?openid=${openid}`,
            headers: {
                "Host": "mall.telunsu.net",
                "Origin": "https://mall.telunsu.net",
                "Content-Length": "0",
                "Connection": "keep-alive",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.16(0x1800103f) NetType/WIFI Language/zh_CN miniProgram",
                "Accept-Language": "zh-cn",
                "Referer": `https://mall.telunsu.net/mintelunsu/himilk/user/index.html?timeStamp=${new Date().getTime()}`,
                "Accept-Encoding": "gzip, deflate, br"
            }
        }
        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    console.log('登录成功\n', data)
                    if (data.code == 0) {
                        $.userName = data.data.nickname?data.data.nickname:data.data.mobile;
                        console.log(`登录成功，欢迎 ${data.data.grade} 会员`, `${$.userName}\n`)
                        await $.wait(2000);
                        await userSignIn();
                    } else {
                        console.log(`${data.msg}\n`)
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

// 每日签到领积分
function userSignIn() {
    return new Promise((resove) => {
        let options = {
            url: `https://mall.telunsu.net/wxapi/user/signIn`,
            headers: {
                "Host": "mall.telunsu.net",
                "Content-Type": "application/json;charset=utf-8",
                "Origin": "https://mall.telunsu.net",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.16(0x1800103f) NetType/WIFI Language/zh_CN miniProgram",
                "Referer": "https://mall.telunsu.net/mintelunsu/himilk/vip/vipCommunityOld.html?navType=1",
                "Content-Length": "41",
                "Accept-Language": "zh-cn"
            },
            body: `{"openid":"${openid}"}`
        }
        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    console.log('每日签到\n', data)
                    if (data.code == 0) {
                        // 每日签到可获得2积分和2经验值
                        // 每连续签到30天，获得的积分和经验值翻倍
                        // 中途中断后累计次数清零，需从下一次签到重新计算
                        console.log(`每日签到任务完成:`, `${data.msg}\n`)
                    } else {
                        console.log(`${data.msg}\n`)
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

// 更新牧场token
function updateToken() {
    return new Promise((resove) => {
        let options = {
            url: `https://mc.telunsu.net/shenghuo/telunsuUser/query`,
            headers: headers,
            body: `{"query":{"scene":"min","sceneValue":"2003","openid":"${openid}"}}`
        }
        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    console.log('更新token成功\n', data)
                    if (data.code == 200 && data.data.token) {
                        $.userId = data.data.id;
                        $.userToken = data.data.token;
                        console.log(`当前用户token:`, data.data.token)
                        console.log(`当前用户userId:`, `${data.data.id}\n`)
                        $.shareCodeList.push($.userId)
                    } else {
                        console.log(`${data.errorMsg}\n`)
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

// 签到领牧草
function onSignin() {
    return new Promise((resove) => {
        headers.token = $.userToken
        let options = {
            url: `https://mc.telunsu.net/shenghuo/telunsuSign/insert`,
            headers: headers,
            body: `{"data":{"openid":"${openid}"}}`
        }
        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    console.log('签到领牧草\n', data)
                    if (data.code == 200) {
                        console.log(`签到成功:`, `获得10g草种\n`)
                    } else {
                        console.log(`${data.errorMsg}\n`)
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

// 其他任务 收集草种-浏览商城、收集草种-漫谈会互动
function taskOther(clickInfo) {
    return new Promise((resove) => {
        if (clickInfo) {
            headers.token = $.userToken
            let options = {
                url: `https://mc.telunsu.net/shenghuo/click/other`,
                headers: headers,
                body: `{"data":{"clickInfo":"${clickInfo}","openid":"${openid}"}}`
            }
            $.post(options, async (error, response, data) => {
                try {
                    if (error) {
                        console.log(`${JSON.stringify(error)}`)
                        console.log(`${$.name} API请求失败，请检查网路重试`)
                    } else {
                        data = JSON.parse(data)
                        console.log('收集草种奖励\n', data)
                        if (data.code == 200) {
                            console.log(`获取${clickInfo}任务成功:`, data.data)
                            await $.wait(5000);
                            await glassInfoSave(clickInfo);
                        } else {
                            console.log(`${data.errorMsg}\n`)
                        }
                    }
                } catch (e) {
                    $.logErr('失败', e)
                } finally {
                    resove()
                }
            })
        } else {
            $.log('其他任务异常')
            resove()
        }
    })
}

// 完成任务 浏览奖励
function glassInfoSave(clickInfo) {
    return new Promise((resove) => {
        if (clickInfo) {
            headers.token = $.userToken
            let options = {
                url: `https://mall.telunsu.net/wxapi/xwsh/glassInfo/save`,
                headers: {
                    "Host": "mall.telunsu.net",
                    "Content-Type": "application/json;charset=utf-8",
                    "Origin": "https://mall.telunsu.net",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Connection": "keep-alive",
                    "Accept": "application/json, text/plain, */*",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.16(0x1800103f) NetType/WIFI Language/zh_CN miniProgram",
                    "Referer": "https://mall.telunsu.net/mintelunsu/himilk/product/index.html?actvCome=xwshwxapp&xwsh=1",
                    "Content-Length": "63",
                    "Accept-Language": "zh-cn"
                },
                body: `{"openid":"${openid}","info":"浏览奖励"}`
            }
            $.post(options, async (error, response, data) => {
                try {
                    if (error) {
                        console.log(`${JSON.stringify(error)}`)
                        console.log(`${$.name} API请求失败，请检查网路重试`)
                    } else {
                        data = JSON.parse(data)
                        console.log('收集草种任务完成\n', data)
                        if (data.code == 200) {
                            console.log(`${clickInfo}任务完成:`, `${data.msg}\n`)
                            await $.wait(5000);
                            await browseReward(clickInfo);
                        } else {
                            console.log(`${data.msg}\n`)
                        }
                    }
                } catch (e) {
                    $.logErr('失败', e)
                } finally {
                    resove()
                }
            })
        } else {
            $.log('完成任务异常')
            resove()
        }
    })
}

// 完成任务 漫谈会互动

// 领取收集草种的奖励 浏览商城、漫谈会互动
function browseReward(clickInfo) {
    return new Promise((resove) => {
        if (clickInfo) {
            headers.token = $.userToken
            let url
            if (clickInfo == '收集草种-浏览奖励') {
                url = `https://mc.telunsu.net/shenghuo/getBrowseReward`
            } else if (clickInfo == '收集草种-漫谈会互动') {
                url = `https://mc.telunsu.net/shenghuo/getMthReward`
            }
            let options = {
                url: url,
                headers: headers,
                body: `{"query":{"openid":"${openid}"}}`
            }
            $.post(options, async (error, response, data) => {
                try {
                    if (error) {
                        console.log(`${JSON.stringify(error)}`)
                        console.log(`${$.name} API请求失败，请检查网路重试`)
                    } else {
                        data = JSON.parse(data)
                        console.log('收集草种领取奖励\n', data)
                        if (data.code == 200) {
                            if (clickInfo == '收集草种-浏览奖励') {
                                console.log(`${clickInfo}领取奖励:`, `获得10g草种\n`)
                            } else if (clickInfo == '收集草种-漫谈会互动') {
                                console.log(`${clickInfo}领取奖励:`, `获得30g草种\n`)
                            }
                        } else {
                            console.log(`${data.errorMsg}\n`)
                        }
                    }
                } catch (e) {
                    $.logErr('失败', e)
                } finally {
                    resove()
                }
            })
        } else {
            $.log('领取奖励异常')
            resove()
        }
    })
}

// 苏苏乐园 美甲、听音乐、护理
// susuMeijia、susuRiguangyu、susuHuli
function takeInteraction(info) {
    return new Promise((resove) => {
        if (info) {
            headers.token = $.userToken
            let options = {
                url: `https://mc.telunsu.net/shenghuo/telunsuInteraction/option`,
                headers: headers,
                body: `{"data":{"info":"${info}","openid":"${openid}"}}`
            }
            $.post(options, async (error, response, data) => {
                try {
                    if (error) {
                        console.log(`${JSON.stringify(error)}`)
                        console.log(`${$.name} API请求失败，请检查网路重试`)
                    } else {
                        data = JSON.parse(data)
                        console.log('苏苏乐园互动\n', data)
                        if (data.code == 200) {
                            console.log(`${info}成功:`, `获得1奶滴\n`)
                        } else {
                            console.log(`${data.errorMsg}\n`)
                        }
                    }
                } catch (e) {
                    $.logErr('失败', e)
                } finally {
                    resove()
                }
            })
        } else {
            $.log('苏苏乐园任务异常')
            resove()
        }
    })
}

// 牧场基本信息
function pastureInfo() {
    return new Promise((resove) => {
        headers.token = $.userToken
        let options = {
            url: `https://mc.telunsu.net/shenghuo/telunsuUser/queryUserMilkAndGlass`,
            headers: headers,
            body: `{"query":{"openid":"${openid}"}}`
        }
        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    // console.log('基本信息\n', data)
                    if (data.code == 200) {
                        console.log(`当前剩余奶滴数量:`, data.data.milk)
                        console.log(`当前剩余牧草数量:`, `${data.data.grassSeed}\n`)
                        if (data.data.grassSeed >= 100) {
                            // 去种植草种
                            await plantGrassSeed()
                        } else {
                            console.log(`每次种植至少需要100g草种哦，快去收集草种再来吧\n`)
                            $.log(`当前剩余奶滴${data.data.milk}滴，当前剩余牧草${data.data.grassSeed}棵\n\n`)
                            allMessage += `【账号${$.index}】${$.userName}\n【任务状态】当前剩余奶滴${data.data.milk}滴，当前剩余牧草${data.data.grassSeed}棵\n\n`
                        }
                    } else {
                        console.log(`${data.errorMsg}\n`)
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

// 种植草种
function plantGrassSeed() {
    return new Promise((resove) => {
        headers.token = $.userToken
        let options = {
            url: `https://mc.telunsu.net/shenghuo/plantGrassSeed`,
            headers: headers,
            body: `{"query":{"openid":"${openid}"}}`
        }
        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    // console.log('去种植草种\n', data)
                    if (data.code == 200) {
                        console.log(`种植成功:`, data.data)
                        await $.wait(5000)
                        console.log(`等待5秒去喂养`)
                        // 去喂养
                        await takeMilk()
                    } else {
                        console.log(`${data.errorMsg}\n`)
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

// 去喂养
function takeMilk() {
    return new Promise((resove) => {
        headers.token = $.userToken
        let options = {
            url: `https://mc.telunsu.net/shenghuo/takeMilk`,
            headers: headers,
            body: `{"query":{"openid":"${openid}"}}`
        }
        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    console.log('去喂养\n', data)
                    if (data.code == 200) {
                        console.log(`喂养成功:`, `获得${data.data}奶滴\n`)
                        await $.wait(2000);
                        await pastureInfo();
                    } else {
                        console.log(`${data.errorMsg}\n`)
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

// 好友助力
function friendHelp(openid, shareCode) {
    return new Promise((resove) => {
        headers.token = $.userToken
        headers.Referer = `https://mc.telunsu.net/html/web/index.html?dmcode=&si=&Scene=shareLink&UserID=&SceneValue=2004&v=&sharetype=1&fromUserId=${openid}&fromGrowthid=&lotteryID=&hmsr=`
        let options = {
            url: `https://mc.telunsu.net/shenghuo/telunsuFriend/insert`,
            headers: headers,
            body: `{"query":{"openid":"${openid}","help_openid":"${shareCode}"}}`
        }
        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    console.log('好友助力\n', data)
                    if (data.code == 200) {
                        console.log(`助力成功:`, data.data)
                    } else {
                        console.log(`${data.errorMsg}\n`)
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

// 商城可兑换列表
function canExchange() {
    return new Promise((resove) => {
        headers.token = $.userToken
        let options = {
            url: `https://mc.telunsu.net/shenghuo/telunsuShop/query_list`,
            headers: headers,
            body: `{}`
        }
        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    console.log('可兑换列表\n', data)
                    if (data.code == 200) {
                        let exchange_list = data.data
                        for (let i=0; i < exchange_list.length; i++) {
                            const exchange = exchange_list[i]
                            if (exchange['role'] == 1) {
                                // 普通兑换商品
                                if (exchange['status'] == 1) {
                                    // 可兑换
                                } else if (exchange['status'] == 3) {
                                    // 敬请期待 每月18号12:00限时开启
                                    // console.log(`${exchange['shopName']}`, `需要 ${exchange['needValue']} g奶滴`)
                                }
                            } else if (exchange['role'] == 4) {
                                // 钻石会员 & 金牌会员专区
                            }
                        }
                    } else {
                        console.log(`${data.errorMsg}\n`)
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
