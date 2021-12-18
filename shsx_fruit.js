/*
食行农场
登录食行生鲜App,进入一次食行果园,在抓包记录里搜 /sz/garden/user/getUserInfo ,在请求头里找url后的一串数字

docker环境变量名:
shsxCookies 多账号@隔开
url中 /sz/garden/user/getUserInfo?custguid=xxxx&sourcetype=xxx 问号后面的 custguid= 为 shsxCookies
关键参数 custguid、sourcetype、accesstoken、customerguid、stationId、channelID

[task_local]
48 9,14,19 * * * shsx_fruit.js
*/

// 每天6点、12点，18点都能来领水滴

const $ = new Env('食行农场');
const notify = $.isNode() ? require('./sendNotify') : '';
const shsxcookie = $.isNode() ? process.env.shsxCookies : '';

let cookiesArr = [], cookie = '', cookieInfo = '';
let allMessage = '';
let headers = {
    "Host": "api1.34580.com",
    "Origin": "https://wechatx.34580.com",
    "Connection": "keep-alive",
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 SHIHANG_APP_V6.0.6 /sa-sdk-ios/sensors-verify/sensorsadmin.34580.cn?production",
    "Accept-Language": "zh-cn",
    "Referer": "https://wechatx.34580.com/wechatgw/frontend-gamification/index.html",
    "Accept-Encoding": "gzip, deflate, br"
}

!(async () => {
    if (shsxcookie) {
        if (shsxcookie.indexOf("@") != -1) {
            console.log(`您的cookie选择的是用@隔开\n`)
            shsxcookie.split("@").forEach((item) => {
                cookiesArr.push(item);
            });
        } else if (shsxcookie.indexOf("\n") != -1) {
            console.log(`您的cookie选择的是用换行隔开\n`)
            shsxcookie.split("\n").forEach((item) => {
                cookiesArr.push(item);
            });
        } else {
            cookiesArr.push(shsxcookie);
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
            await getUrl(cookiesArr[i]);
            $.index = i + 1;
            $.isLogin = true;
            $.plantId = '';
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
    await taskList();
    await $.wait(2000);
    await smashEggs();
    await $.wait(2000);
    await getUnReceiveAwardList();
    await $.wait(2000);
    await getKettleWater();
    await $.wait(2000);
    await treeInfo();
}

// 参数处理
function getUrl(shsxurl) {
    let url = shsxurl.split("?")
    let shsxurls = url[url.length - 1].split("&")
    let sendInfo = {}
    for (const val of shsxurls) {
        let vals = val.split("&")
        for (const val1 of vals) {
            let kv = val1.split("=")
            sendInfo[kv[0]] = kv[1]
        }
    }
    cookieInfo = sendInfo
}

// 基本信息
function userInfo() {
    return new Promise((resove) => {
        let options = {
            url: `https://api1.34580.com/sz/garden/user/getUserInfo?${cookie}`,
            headers: headers
        }

        $.get(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    if (data.Error == 0) {
                        $.plantId = data.Data.plantId
                        $.userName = data.Data.nickName?data.Data.nickName:data.Data.custPhone
                        console.log(`登录成功，欢迎账号:`, $.userName)
                        console.log(`当前剩余的水滴数量:`, data.Data.totalRemainWeight)
                        console.log(`共计使用水滴的数量:`, `${data.Data.totalReceiveWeight}\n`)
                    } else {
                        console.log(data.Message)
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

// 果树信息
function treeInfo() {
    return new Promise((resove) => {
        let options = {
            url: `https://api1.34580.com/sz/garden/plant/getTreeGrowInfo?plantId=${$.plantId}&${cookie}`,
            headers: headers
        }

        $.get(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    if (data.Error == 0) {
                        console.log(`当前种植的果树:`, data.Data.treeName)
                        console.log(`果树的成长级别:`, data.Data.curPhaseType)
                        console.log(`果树的成长状态:`, data.Data.curPhaseName)
                        allMessage += `【账号${$.index}】${$.userName}\n【水果名称】${data.Data.treeName}\n【当前进度】${data.Data.curPhaseName} Lv${data.Data.curPhaseType}\n【任务状态】共需要浇水 ${data.Data.targetWateringTimes} 次，已经浇水 ${data.Data.curWateringTimes} 次，还需要浇水 ${data.Data.needWateringTimes} 次\n\n`
                    } else {
                        console.log(data.Message)
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

// 获取领水滴任务列表
function taskList() {
    return new Promise((resove) => {
        let options = {
            url: `https://api1.34580.com/sz/garden/task/list?sourcetype=${cookieInfo.sourcetype}&accesstoken=${cookieInfo.accesstoken}&customerguid=${cookieInfo.customerguid}&stationId=${cookieInfo.stationId}&channelID=${cookieInfo.channelID}`,
            headers: headers
        }

        $.get(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    if (data.Error == 0) {
                        console.log('获取领水滴的任务列表成功\n', data.Data)
                        let task_list = data.Data
                        for (let i=0; i < task_list.length; i++) {
                            const task = task_list[i]
                            if (task['taskStatus'] == 0) {
                                console.log(`领水滴任务: ${task['taskName']} 未领取，去领取`)
                                await $.wait(1000)
                                await taskReceive(task['taskName'], task['taskId'])
                            } else if (task['taskStatus'] == 1) {
                                if (task['taskId'] == 87) {
                                    // 下单满29元赠水滴
                                    console.log(`领水滴任务: ${task['taskName']} 需要手动完成\n`)
                                } else {
                                    // 完成每日分享赠水滴
                                    console.log(`领水滴任务: ${task['taskName']} 进行中，去完成`)
                                    await $.wait(1000)
                                    await taskComplete(task['taskName'])
                                }
                            } else if (task['taskStatus'] == 2) {
                                console.log(`领水滴任务: ${task['taskName']} 已完成\n`)
                            } else if (task['taskStatus'] == 3) {
                                if (task['taskId'] == 89) {
                                    // 每日登录3次领水滴
                                    console.log(`领水滴任务: ${task['taskName']} 进行中，去完成`)
                                    await $.wait(1000)
                                    await everydayLogin(task['taskName'])
                                } else {
                                    console.log(`领水滴任务: ${task['taskName']} 需要手动完成\n`)
                                }
                            } else if (task['taskStatus'] == 4) {
                                console.log(`领水滴任务: ${task['taskName']}，时间未到 ${task['taskDesc']}`)
                                console.log(`下一场领取的时间: ${task['canReceiveTime']}\n`)
                            } else if (task['taskStatus'] == 5) {
                                console.log(`领水滴任务: ${task['taskName']}，已完成 ${task['taskDesc']}，明日可领取\n`)
                            } else {
                                console.log(`领水滴任务: ${task['taskName']}，错误 ${task['taskDesc']}\n`)
                            }
                        }
                    } else {
                        console.log(data.Message)
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

// 领取每日分享赠水滴、下单满29元赠水滴任务
function taskReceive(taskName, taskId) {
    return new Promise((resove) => {
        if (taskId) {
            headers['Content-Type'] = "application/json;charset=utf-8"
            headers['Content-Length'] = "67"
            let options = {
                url: `https://api1.34580.com/sz/garden/task/receive?sourcetype=${cookieInfo.sourcetype}&accesstoken=${cookieInfo.accesstoken}&customerguid=${cookieInfo.customerguid}&stationId=${cookieInfo.stationId}&channelID=${cookieInfo.channelID}`,
                headers: headers,
                body: `{"taskId":"${taskId}","customerguid":"${cookieInfo.customerguid}"}`
            }

            $.post(options, async (error, response, data) => {
                try {
                    if (error) {
                        console.log(`${JSON.stringify(error)}`)
                        console.log(`${$.name} API请求失败，请检查网路重试`)
                    } else {
                        data = JSON.parse(data)
                        if (data.Error == 0) {
                            console.log(`${taskName}领取:`, `${data.Data}\n`)
                        } else {
                            console.log(data.Message)
                        }
                    }
                } catch (e) {
                    $.logErr('失败', e)
                } finally {
                    resove()
                }
            })
        } else {
            $.log('任务异常')
            resove()
        }
    })
}

// 完成每日分享赠水滴
function taskComplete(taskName) {
    return new Promise((resove) => {
        if (taskName) {
            headers['Content-Type'] = "application/json;charset=utf-8"
            headers['Content-Length'] = "71"
            let options = {
                url: `https://api1.34580.com/sz/garden/share/saveShareRecord?sourcetype=${cookieInfo.sourcetype}&accesstoken=${cookieInfo.accesstoken}&customerguid=${cookieInfo.customerguid}&stationId=${cookieInfo.stationId}&channelID=${cookieInfo.channelID}`,
                headers: headers,
                body: `{"plantId":"${$.plantId}","customerguid":"${cookieInfo.customerguid}"}`
            }

            $.post(options, async (error, response, data) => {
                try {
                    if (error) {
                        console.log(`${JSON.stringify(error)}`)
                        console.log(`${$.name} API请求失败，请检查网路重试`)
                    } else {
                        data = JSON.parse(data)
                        if (data.Error == 0) {
                            console.log(`${taskName}获得水滴数量:`, `${data.Data.prizeValue}\n`)
                        } else {
                            console.log(data.Message)
                        }
                    }
                } catch (e) {
                    $.logErr('失败', e)
                } finally {
                    resove()
                }
            })
        } else {
            $.log('任务异常')
            resove()
        }
    })
}

// 完成每日登录3次领水滴
function everydayLogin(taskName) {
    return new Promise((resove) => {
        if (taskName) {
            headers['Content-Type'] = "application/json;charset=utf-8"
            headers['Content-Length'] = "55"
            let options = {
                url: `https://api1.34580.com/sz/garden/luckyBag/receiveMyself?_rcPlatform=1200&_rcDeviceId=202008101727570d142bc8fb95530e031ed4d20ec2926301714dc3cf3fbcf6&_rcBizCode=4050&sourcetype=${cookieInfo.sourcetype}&accesstoken=${cookieInfo.accesstoken}&customerguid=${cookieInfo.customerguid}&stationId=${cookieInfo.stationId}&channelID=${cookieInfo.channelID}`,
                headers: headers,
                body: `{"customerguid":"${cookieInfo.customerguid}"}`
            }

            $.post(options, async (error, response, data) => {
                try {
                    if (error) {
                        console.log(`${JSON.stringify(error)}`)
                        console.log(`${$.name} API请求失败，请检查网路重试`)
                    } else {
                        data = JSON.parse(data)
                        if (data.Error == 0) {
                            console.log(`${taskName}获得水滴数量:`, `${data.Data.prizeValue}\n`)
                        } else {
                            console.log(data.Message)
                        }
                    }
                } catch (e) {
                    $.logErr('失败', e)
                } finally {
                    resove()
                }
            })
        } else {
            $.log('任务异常')
            resove()
        }
    })
}

// 玩砸蛋游戏
function smashEggs() {
    return new Promise((resove) => {
        headers['Content-Type'] = "application/json;charset=utf-8"
        headers['Content-Length'] = "71"
        let options = {
            url: `https://api1.34580.com/sz/garden/waterGame/smashEggs?sourcetype=${cookieInfo.sourcetype}&accesstoken=${cookieInfo.accesstoken}&customerguid=${cookieInfo.customerguid}&stationId=${cookieInfo.stationId}&channelID=${cookieInfo.channelID}`,
            headers: headers,
            body: `{"plantId":"${$.plantId}","customerguid":"${cookieInfo.customerguid}"}`
        }

        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    if (data.Error == 0) {
                        console.log(`玩砸蛋游戏获得水滴数量:`, `${data.Data.prizeValue}`)
                        console.log(`剩余次数:`, `${data.Data.remainPlayTimes}\n`)
                        if (data.Data.remainPlayTimes > 0) {
                            console.log('继续砸蛋');
                            await $.wait(2000);
                            await smashEggs();
                        } else {
                            $.log('今日砸蛋次数已用完，明日再来吧~\n');
                        }
                    } else {
                        console.log(`${data.Message}\n`)
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

// 获取未领取的水滴
function getUnReceiveAwardList() {
    return new Promise((resove) => {
        let options = {
            url: `https://api1.34580.com/sz/garden/award/getUnReceiveAwardList?sourcetype=${cookieInfo.sourcetype}&accesstoken=${cookieInfo.accesstoken}&customerguid=${cookieInfo.customerguid}&stationId=${cookieInfo.stationId}&channelID=${cookieInfo.channelID}`,
            headers: headers
        }

        $.get(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    if (data.Error == 0) {
                        console.log('获取未领取的水滴列表成功\n', data.Data)
                        let task_list = data.Data
                        for (let i=0; i < task_list.length; i++) {
                            const task = task_list[i]
                            if (task['canReceive'] == true) {
                                $.log(`${task['rewardName']} 未领取，去领取`)
                                await $.wait(2000)
                                await getReceiveAward(task['rewardName'], task['receiveId'], task['rewardType'])
                            } else if (task['canReceive'] == false) {
                                if (task['canReceiveTime']) {
                                    $.log(`${task['rewardName']} 暂时不能领取，领取时间为${task['canReceiveTime']}\n`)
                                } else {
                                    $.log(`${task['rewardName']} 暂时不能领取\n`)
                                }
                            }
                        }
                    } else {
                        console.log(data.Message)
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

// 领取任务获得的水滴
function getReceiveAward(rewardName, receiveId, rewardType) {
    return new Promise((resove) => {
        if (receiveId && rewardType) {
            headers['Content-Type'] = "application/json;charset=utf-8"
            headers['Content-Length'] = "67"
            let options = {
                url: `https://api1.34580.com/sz/garden/award/receiveAward?_rcPlatform=1200&_rcDeviceId=202008101727570d142bc8fb95530e031ed4d20ec2926301714dc3cf3fbcf6&_rcBizCode=4050&sourcetype=${cookieInfo.sourcetype}&accesstoken=${cookieInfo.accesstoken}&customerguid=${cookieInfo.customerguid}&stationId=${cookieInfo.stationId}&channelID=${cookieInfo.channelID}`,
                headers: headers,
                body: `{"receiveId":"${receiveId}","rewardType":"${rewardType}","customerguid":"${cookieInfo.customerguid}"}`
            }

            $.post(options, async (error, response, data) => {
                try {
                    if (error) {
                        console.log(`${JSON.stringify(error)}`)
                        console.log(`${$.name} API请求失败，请检查网路重试`)
                    } else {
                        data = JSON.parse(data)
                        if (data.Error == 0) {
                            console.log(`${rewardName} 领取水滴数量:`, `${data.Data.prizeValue}\n`)
                        } else {
                            console.log(data.Message)
                        }
                    }
                } catch (e) {
                    $.logErr('失败', e)
                } finally {
                    resove()
                }
            })
        } else {
            $.log('任务异常')
            resove()
        }
    })
}

// 获取可浇水的水滴数量
function getKettleWater() {
    return new Promise((resove) => {
        let options = {
            url: `https://api1.34580.com/sz/garden/user/getKettleWater?sourcetype=${cookieInfo.sourcetype}&accesstoken=${cookieInfo.accesstoken}&customerguid=${cookieInfo.customerguid}&stationId=${cookieInfo.stationId}&channelID=${cookieInfo.channelID}`,
            headers: headers
        }

        $.get(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    if (data.Error == 0) {
                        console.log('可浇的水滴数量', `${data.Data.waterWeight}\n`)
                        // 去浇水
                        if (data.Data.waterWeight >= 10) {
                            $.log('去果园浇水');
                            await $.wait(2000);
                            await doWater();
                        } else {
                            $.log('水滴余额不足~\n');
                        }
                    } else {
                        console.log(data.Message)
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

// 去浇水
function doWater() {
    return new Promise((resove) => {
        headers['Content-Type'] = "application/json;charset=utf-8"
        headers['Content-Length'] = "71"
        let options = {
            url: `https://api1.34580.com/sz/garden/plant/wateringTree?_rcPlatform=1200&_rcDeviceId=202008101727570d142bc8fb95530e031ed4d20ec2926301714dc3cf3fbcf6&_rcBizCode=4050&sourcetype=${cookieInfo.sourcetype}&accesstoken=${cookieInfo.accesstoken}&customerguid=${cookieInfo.customerguid}&stationId=${cookieInfo.stationId}&channelID=${cookieInfo.channelID}`,
            headers: headers,
            body: `{"plantId":"${$.plantId}","customerguid":"${cookieInfo.customerguid}"}`
        }

        $.post(options, async (error, response, data) => {
            try {
                if (error) {
                    console.log(`${JSON.stringify(error)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data)
                    if (data.Error == 0) {
                        console.log(`浇水成功，剩余水滴数量:`, `${data.Data.waterWeight}\n`)
                        // 出现惊喜小礼物
                        if (data.Data.wateringReward) {
                            $.log(`悄悄送你一份小礼物，快拆开看看`)
                            $.log(`意外获取水滴: ${data.Data.wateringReward.prizeValue}\n`)
                            // 获取未领取的水滴
                            await $.wait(2000)
                            await getUnReceiveAwardList()
                        }
                        // 出现升级奖励
                        if (data.Data.isAddLevel && data.Data.upgradeReward) {
                            $.log(`果树等级从 Lv${data.Data.beforePhaseType} 升级到 Lv${data.Data.curPhaseType}`)
                            $.log(`意外获取水滴: ${data.Data.upgradeReward.prizeValue}\n`)
                            // 获取未领取的水滴
                            await $.wait(2000)
                            await getUnReceiveAwardList()
                        }
                        if (data.Data.waterWeight >= 10) {
                            $.log('去果园浇水');
                            await $.wait(2000);
                            await doWater();
                        } else {
                            $.log('水滴余额不足~\n');
                        }
                    } else {
                        console.log(data.Message)
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
