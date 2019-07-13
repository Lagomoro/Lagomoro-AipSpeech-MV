/*:
 * @plugindesc Lagomoro_AipSpeech Robot V1.0.0
 * @author Lagomoro
 * 
 * @param 百度语音识别账户
 * @type text
 * @desc 填写你注册的百度语音识别账户信息。
 * @default
 * 
 * @param 百度语音识别账户 App ID
 * @parent 百度语音识别账户
 * @type number
 * @desc 填写百度语音识别账户的 App ID。
 * @default 0
 *
 * @param 百度语音识别账户 Api Key
 * @parent 百度语音识别账户
 * @type text
 * @desc 填写百度语音识别账户的 Api Key。
 * @default 
 * 
 * @param 百度语音识别账户 Secret Key
 * @parent 百度语音识别账户
 * @type text
 * @desc 填写百度语音识别账户的 Secret Key。
 * @default 
 * 
 * @param 录音质量设置（请勿轻易更改）
 * @type text
 * @desc 不同API的录音质量不一定，请参照你的API进行调整。
 * @default
 * 
 * @param 比特率
 * @parent 录音质量设置
 * @type number
 * @desc 录音的比特率(bits)。
 * @default 16
 * 
 * @param 采样率
 * @parent 录音质量设置
 * @type number
 * @desc 录音的采样率(rate)。
 * @default 16000
 * 
 * @param 声道数
 * @parent 录音质量设置
 * @type number
 * @desc 录音的声道数(channel)。
 * @default 1
 * 
 * @param 自动采样设置
 * @type text
 * @desc 自动唤醒时的一些设置。
 * @default
 * 
 * @param 唤醒等级
 * @parent 自动采样设置
 * @type number
 * @desc 唤醒录音的强度等级。
 * @default 10
 *
 * @param 采样延迟
 * @parent 自动采样设置
 * @type number
 * @desc 停止说话后延迟终止录音的采样次数。
 * @default 30
 * 
 * @param 语音合成设置
 * @type text
 * @desc 语音合成的一些设置。
 * @default
 * 
 * @param 语速
 * @parent 语音合成设置
 * @type number
 * @desc 语速，取值0-9，默认为5中语速。
 * @default 5
 * @max 9
 * @min 0
 *
 * @param 人物
 * @parent 语音合成设置
 * @type number
 * @desc 发音人选择, 0为女声，1为男声，3为情感合成-度逍遥，4为情感合成-度丫丫
 * @default 4
 * @max 4
 * @min 0
 */

// ======================================================================
// * 注册变量
// ----------------------------------------------------------------------
var Lagomoro = Lagomoro || {};
Lagomoro.AipSpeech = Lagomoro.AipSpeech || {};
Lagomoro.AipSpeech.Parameters = PluginManager.parameters('Lagomoro_AipSpeech');
// ----------------------------------------------------------------------
Lagomoro.AipSpeech.APP_ID     = Number(Lagomoro.AipSpeech.Parameters['百度语音识别账户 App ID']     || 0);
Lagomoro.AipSpeech.API_KEY    = String(Lagomoro.AipSpeech.Parameters['百度语音识别账户 Api Key']    || "");
Lagomoro.AipSpeech.SECRET_KEY = String(Lagomoro.AipSpeech.Parameters['百度语音识别账户 Secret Key'] || "");
Lagomoro.AipSpeech.SAMPLE_BITS    = Number(Lagomoro.AipSpeech.Parameters['比特率'] || 16);
Lagomoro.AipSpeech.SAMPLE_RATE    = Number(Lagomoro.AipSpeech.Parameters['采样率'] || 16000);
Lagomoro.AipSpeech.SAMPLE_CHANNEL = Number(Lagomoro.AipSpeech.Parameters['声道数'] || 1);
Lagomoro.AipSpeech.LEVEL = Number(Lagomoro.AipSpeech.Parameters['唤醒等级'] || 10);
Lagomoro.AipSpeech.DELAY = Number(Lagomoro.AipSpeech.Parameters['采样延迟'] || 30);
Lagomoro.AipSpeech.SPEED = Number(Lagomoro.AipSpeech.Parameters['语速'] || 5);
Lagomoro.AipSpeech.HUMAN = Number(Lagomoro.AipSpeech.Parameters['人物'] || 4);
// ======================================================================

// ======================================================================
// * Lagomoro_Recorder
// ======================================================================
function Lagomoro_Recorder() {
    this.initialize.apply(this, arguments);
}
Lagomoro_Recorder.prototype.initialize = function(callback) {
    this.audioInput = null;
    this.recorder = null;
    this.context = null;
    this.setCallback(callback);

    this.ready = false;

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    var that = this;
    if (navigator.getUserMedia) {
        navigator.getUserMedia({audio: true}, function (stream) {
            var audioContext = window.AudioContext || window.webkitAudioContext;
            that.context = new audioContext();
            that.audioInput = that.context.createMediaStreamSource(stream);
            that.recorder = that.context.createScriptProcessor(1024, Lagomoro.AipSpeech.SAMPLE_CHANNEL, Lagomoro.AipSpeech.SAMPLE_CHANNEL);
            
            that.recorder.onaudioprocess = function(e) {
                var dataLine = e.inputBuffer.getChannelData(0);
                var level = 0;
                for(var i = 0;i < dataLine.length; i++){
                    level += dataLine[i];
                }
                if(that.processLevel(level)*20000 > Lagomoro.AipSpeech.LEVEL && !Lagomoro_AipSpeech_Objects.SDKBusy()){
                    that.recordCount = Lagomoro.AipSpeech.DELAY;
                }else{
                    that.recordCount -= 1;
                }
                // console.log(that.processLevel(level)*20000);
                if(that.recordCount > 0) {
                    if(!that.isRecording){
                        that.callback.start.call(that.callback.owner);
                        that.isRecording = true;
                        that.clear();
                    }
                    that.input(dataLine);
                }else if(that.recordCount === 0) {
                    that.callback.finish.call(that.callback.owner, that.encodeWAV());
                    that.isRecording = false;
                }
            }
            that.ready = true;
        }, function (err) {
            switch (err.code || err.name) {
                case 'PERMISSION_DENIED':           case 'PermissionDeniedError':     that.callback.error.call(that.callback.owner, "没有录音权限。");break;
                case 'NOT_SUPPORTED_ERROR':         case 'NotSupportedError':         that.callback.error.call(that.callback.owner, "硬件设备不支持。");break;
                case 'MANDATORY_UNSATISFIED_ERROR': case 'MandatoryUnsatisfiedError': that.callback.error.call(that.callback.owner, "找不到麦克风。");break;
                default:                                                              that.callback.error.call(that.callback.owner, "开启麦克风失败。");break;
            }
        });
    } else {
        this.callback.error.call(this.callback.owner, "录音功能未开启。");
    }

    this.size = 0;
    this.buffer = [];
    this.inputSampleRate = 0;
    this.inputSampleBits = 16;
    this.outputSampleRate = Lagomoro.AipSpeech.SAMPLE_RATE;
    this.outputSampleBits = Lagomoro.AipSpeech.SAMPLE_BITS;
    
    this.recordCount = -1;
    this.isRecording = false;
    this.recordLevel = 100;
    this.recordSpeed = 100;
};
Lagomoro_Recorder.prototype.setCallback = function(callback) {
    this.callback = {};
    this.callback.owner  = callback.owner  || this;
    this.callback.start  = callback.start  || function(){};
    this.callback.finish = callback.finish || function(blobdata){};
    this.callback.error  = callback.error  || function(err){};
}
Lagomoro_Recorder.prototype.isReady = function() {
    return this.ready;
};
Lagomoro_Recorder.prototype.isBusy = function() {
    return this.isRecording;
};
Lagomoro_Recorder.prototype.clear = function(){
    this.buffer = [];
    this.size = 0;
};
Lagomoro_Recorder.prototype.reset = function(){
    this.recordCount = -1;
    this.recordLevel = 100;
    this.recordSpeed = 100;
};
Lagomoro_Recorder.prototype.start = function() {
    this.reset();
    this.audioInput.connect(this.recorder);
    this.recorder.connect(this.context.destination);
};
Lagomoro_Recorder.prototype.stop = function () {
    this.recorder.disconnect();
};
Lagomoro_Recorder.prototype.input = function(data) {
    this.buffer.push(new Float32Array(data));
    this.size += data.length;
};
Lagomoro_Recorder.prototype.processLevel = function(level) {
    this.recordSpeed = this.recordSpeed + (this.recordLevel - (level / this.recordLevel))/10;
    this.recordLevel = this.recordLevel + (level - this.recordLevel)/10;
    return Math.abs(level / this.recordSpeed);
}
Lagomoro_Recorder.prototype.processData = function () {
    this.inputSampleRate = this.context.sampleRate;
    this.inputSampleBits = 16;
    this.outputSampleRate = Lagomoro.AipSpeech.SAMPLE_RATE;
    this.outputSampleBits = Lagomoro.AipSpeech.SAMPLE_BITS;
}
Lagomoro_Recorder.prototype.compress = function () {
    //合并
    var data = new Float32Array(this.size);
    var offset = 0;
    for (var i = 0; i < this.buffer.length; i++) {
        data.set(this.buffer[i], offset);
        offset += this.buffer[i].length;
    }
    //压缩
    var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
    var length = data.length / compression;
    var result = new Float32Array(length);
    var index = 0, j = 0;
    while (index < length) {
        result[index] = data[j];
        j += compression;
        index++;
    }
    return result;
};
Lagomoro_Recorder.prototype.encodeWAV = function () {
    this.processData();

    var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
    var sampleBits = Math.min(this.inputSampleBits, this.outputSampleBits);
    var bytes = this.compress();
    var dataLength = bytes.length * (sampleBits / 8);
    var buffer = new ArrayBuffer(44 + dataLength);
    var data = new DataView(buffer);

    var channelCount = 1;//单声道
    var offset = 0;

    var writeString = function (str) {
        for (var i = 0; i < str.length; i++) {
            data.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    writeString('RIFF'); offset += 4;// 资源交换文件标识符
    data.setUint32(offset, 36 + dataLength, true); offset += 4;// 下个地址开始到文件尾总字节数,即文件大小-8
    writeString('WAVE'); offset += 4;// WAV文件标志
    writeString('fmt '); offset += 4;// 波形格式标志
    data.setUint32(offset, 16, true); offset += 4;// 过滤字节,一般为 0x10 = 16
    data.setUint16(offset, 1, true); offset += 2;// 格式类别 (PCM形式采样数据)
    data.setUint16(offset, channelCount, true); offset += 2;// 通道数
    data.setUint32(offset, sampleRate, true); offset += 4;// 采样率,每秒样本数,表示每个通道的播放速度
    data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), true); offset += 4;// 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8
    data.setUint16(offset, channelCount * (sampleBits / 8), true); offset += 2;// 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8
    data.setUint16(offset, sampleBits, true); offset += 2;// 每样本数据位数
    writeString('data'); offset += 4;// 数据标识符
    data.setUint32(offset, dataLength, true); offset += 4;// 采样数据总数,即数据总大小-44
    // 写入采样数据
    if (sampleBits === 8) {
        for (var i = 0; i < bytes.length; i++, offset++) {
            var s = Math.max(-1, Math.min(1, bytes[i]));
            var val = s < 0 ? s * 0x8000 : s * 0x7FFF;
            val = parseInt(255 / (65535 / (val + 32768)));
            data.setInt8(offset, val, true);
        }
    } else {
        for (var i = 0; i < bytes.length; i++, offset += 2) {
            var s = Math.max(-1, Math.min(1, bytes[i]));
            data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    return new Blob([data], {type: 'audio/pcm'});
};
// ======================================================================
// * Lagomoro_Player
// ======================================================================
function Lagomoro_Player() {
    this.initialize.apply(this, arguments);
}
Lagomoro_Player.prototype.initialize = function() {
    window.URL = window.URL || window.webkitURL;
    
    this.player = document.createElement("audio");
    this.player.autoplay = true;
}
Lagomoro_Player.prototype.play = function(blobdata) {
    this.player.src = window.URL.createObjectURL(blobdata);
}
// ======================================================================
// * AipSpeech_SDK
// ======================================================================
function AipSpeech_SDK() {
    this.initialize.apply(this, arguments);
};
AipSpeech_SDK.prototype.initialize = function() {

};
AipSpeech_SDK.prototype.recognize = function(blobdata, callback) {

};
// ======================================================================
// * Baidu_AipSpeech_SDK
// ======================================================================
function Baidu_AipSpeech_SDK() {
    this.initialize.apply(this, arguments);
};
Baidu_AipSpeech_SDK.prototype = Object.create(AipSpeech_SDK.prototype);
Baidu_AipSpeech_SDK.prototype.constructor = Baidu_AipSpeech_SDK;
Baidu_AipSpeech_SDK.prototype.initialize = function() {
    AipSpeech_SDK.prototype.initialize.call(this);
    this.recognizing = false;
    this.transforming = false;

    var aipSpeech = require('baidu-aip-sdk').speech;
    this.client = new aipSpeech(Lagomoro.AipSpeech.APP_ID, Lagomoro.AipSpeech.API_KEY, Lagomoro.AipSpeech.SECRET_KEY);
};
Baidu_AipSpeech_SDK.prototype.isBusy = function() {
    return this.recognizing;// || this.transforming;
};
Baidu_AipSpeech_SDK.prototype.getCallback = function(callback) {
    callback.owner   = callback.owner   || this;
    callback.success = callback.success || function(text){};
    callback.fail    = callback.fail    || function(){};
    callback.error   = callback.error   || function(err){};
    return callback;
};
Baidu_AipSpeech_SDK.prototype.recognize = function(blobdata, callback){
    callback = this.getCallback(callback);
    this.recognizing = true;

    var that = this;
    var fileReader = new FileReader();
    fileReader.onload = function() {
        var voiceBase64 = new Buffer(this.result);
        that.client.recognize(voiceBase64, 'pcm', 16000).then(function(result) {
            that.recognizing = false;
            $gameTemp.status("待机中");
            console.log(JSON.stringify(result));
            var text = result.result ? result.result[0] : result.err_msg;
            text = text.substring(0, text.length -1);
            if(text === "speech quality error" ||text === "recognition error"){
                callback.fail.call(callback.owner);
            } else {
                callback.success.call(callback.owner, text);
            }
        }, function(err) {
            that.recognizing = false;
            callerr.error.call(callback.owner, err);
        });
    };
    fileReader.readAsArrayBuffer(blobdata);
};
Baidu_AipSpeech_SDK.prototype.text2audio = function(text, callback){
    callback = this.getCallback(callback);
    this.transforming = true;

    var that = this;
    this.client.text2audio(text, {
        spd: Lagomoro.AipSpeech.SPEED,
        per: Lagomoro.AipSpeech.HUMAN,
        vol: 10
    }).then(function(result) {
        that.transforming = false;
        if (result.data) {
            callback.success.call(callback.owner, new Blob([result.data], {type: 'audio/mp3'}));
        } else {
            callback.fail.call(callback.owner);
        }
    }, function(err) {
        that.transforming = false;
        callerr.error.call(callback.owner, err);
    });
};
// ======================================================================
// * Lagomoro_AipSpeech_Objects
// ======================================================================
function Lagomoro_AipSpeech_Objects() {
    throw new Error('This is a static class');
}
Lagomoro_AipSpeech_Objects.aipSpeech_sdk = null;
Lagomoro_AipSpeech_Objects.aipSpeech_recorder = null;
Lagomoro_AipSpeech_Objects.aipSpeech_player = null;
Lagomoro_AipSpeech_Objects.aipSpeech_sprite = null;
Lagomoro_AipSpeech_Objects.SDKBusy = function(){
    return Lagomoro_AipSpeech_Objects.aipSpeech_sdk.isBusy();
}
Lagomoro_AipSpeech_Objects.initialize = function(){
    this.aipSpeech_sdk      = this.aipSpeech_sdk      || new Baidu_AipSpeech_SDK();
    this.aipSpeech_recorder = this.aipSpeech_recorder || new Lagomoro_Recorder({});
    this.aipSpeech_player   = this.aipSpeech_player   || new Lagomoro_Player();
    this.aipSpeech_sprite   = this.aipSpeech_sprite   || new Sprite_AipSpeech();
}
// ======================================================================
// * Lagomoro_AipSpeech_Skill
// ======================================================================
function Lagomoro_AipSpeech_Skill() {
    throw new Error('This is a static class');
};
Lagomoro_AipSpeech_Skill.intents = [];
Lagomoro_AipSpeech_Skill.targetIntent = null;
Lagomoro_AipSpeech_Skill.lastIntent = null;
Lagomoro_AipSpeech_Skill.awakeIntent = {
    keywords: ["同学"],
    callback: function(slotdata){
        this.awakeAipSpeech();
        this.speak("在的，请问需要我做什么？");
    },
    untreated: function(){
        this.retry();
    }
};
Lagomoro_AipSpeech_Skill.addIntent = function(intent){
    this.intents.push(intent);
};
Lagomoro_AipSpeech_Skill.getIntent = function(intent){
    intent.owner     = intent.owner     || $gameTemp;
    intent.keywords  = intent.keywords  || [];
    intent.slots     = intent.slots     || [];
    intent.callback  = intent.callback  || function(slotdata){};
    intent.untreated = intent.untreated || function(){};
    return intent;
};
Lagomoro_AipSpeech_Skill.setTargrtIntent = function(intent){
    this.targetIntent = intent;
};
Lagomoro_AipSpeech_Skill.setLastIntent = function(){
    this.targetIntent = this.lastIntent;
};
Lagomoro_AipSpeech_Skill.awake = function(){
    this.setTargrtIntent(null);
};
Lagomoro_AipSpeech_Skill.sleep = function(){
    this.setTargrtIntent(this.awakeIntent); 
};
Lagomoro_AipSpeech_Skill.testSkill = function(text){
    try{
        if(this.targetIntent !== null){
            this.lastIntent = this.targetIntent;
            this.targetIntent = null; 
            var intents = this.lastIntent.length === undefined ? [this.lastIntent] : this.lastIntent;
            for(var i = 0;i < intents.length; i++){
                if(this.testIntent(intents[i], text)) return;
            };
        }else{
            for(var i = 0;i < this.intents.length; i++){
                if(this.testIntent(this.intents[i], text)) return;
            };
            $gameTemp.speak("小优没有听懂哦，请再说一次！");
        }
    }catch(err){
        console.log(err);
    }
};
Lagomoro_AipSpeech_Skill.testIntent = function(tempIntent, text){
    var intent = this.getIntent(tempIntent);
    if(intent.keywords.length === 0){
        this.activeIntent(intent, text);
        return true;
    }
    for(var i = 0;i < intent.keywords.length; i++){
        if(text.search(intent.keywords[i]) > -1){
            this.activeIntent(intent, text);
            return true;
        }
    }
    intent.untreated.call(intent.owner);
    return false;
};
Lagomoro_AipSpeech_Skill.activeIntent = function(intent, text){
    var slotdata = [];
    for(var i = 0;i < intent.slots.length; i++){
        var data = null;
        for(var j = 0;j < intent.slots[i].length; j++){
            data = intent.slots[i][j].exec(text);
            if(data !== null) break;
        }
        slotdata[i] = (data === null ? null : data[1]);
    }
    intent.callback.call(intent.owner, slotdata);
};
// ======================================================================
// * Game_Temp
// ======================================================================
Game_Temp.prototype.Lagomoro_AipSpeech_Map_initialize = Game_Temp.prototype.initialize;
Game_Temp.prototype.initialize = function() {
    this.Lagomoro_AipSpeech_Map_initialize();
    Lagomoro_AipSpeech_Objects.initialize();
    this.aipSpeech_sdk = Lagomoro_AipSpeech_Objects.aipSpeech_sdk;
    this.aipSpeech_recorder = Lagomoro_AipSpeech_Objects.aipSpeech_recorder;
    this.aipSpeech_player = Lagomoro_AipSpeech_Objects.aipSpeech_player;
    this.aipSpeech_sprite = Lagomoro_AipSpeech_Objects.aipSpeech_sprite;
    this.aipSpeech_sprite.setPlace((Graphics.boxWidth - this.aipSpeech_sprite.width)/2, 0 - this.aipSpeech_sprite.height);
    this.aipSpeech_sprite.setOpacity(0);
    
    this.aipSpeech_recorder.setCallback({
        owner: this,
        start: function(){
            this.status("正在聆听");
        },
        finish: function(blobdata){
            this.status("识别中");
            this.aipSpeech_sdk.recognize(blobdata, {
                owner: this,
                success: function(text){
                    this.status(text.length > 15 ? text.substring(0, 15) : text);
                    Lagomoro_AipSpeech_Skill.testSkill(text);
                },
                fail: function(){
                    this.speak("小优没有听清楚哦，请再说一次！");
                }
            })
        }
    });
    this.startRecord();
    Lagomoro_AipSpeech_Skill.sleep();
    this.temp = null;
    this.awake = false;
};
Game_Temp.prototype.awakeAipSpeech = function() {
    this.aipSpeech_sprite.setTargetPlace((Graphics.boxWidth - this.aipSpeech_sprite.width)/2, 0);
    this.aipSpeech_sprite.setTargetOpacity(255);
    this.awake = true;
    this.showAipSpeech();
};
Game_Temp.prototype.finish = function() {
    Lagomoro_AipSpeech_Skill.sleep();
    this.awake = false;
    setTimeout(function(){
        $gameTemp.sleepAipSpeech();
    }, 2000);
};
Game_Temp.prototype.sleepAipSpeech = function() {
    this.aipSpeech_sprite.setTargetPlace((Graphics.boxWidth - this.aipSpeech_sprite.width)/2, 0 - this.aipSpeech_sprite.height);
    this.aipSpeech_sprite.setTargetOpacity(0);
    this.hideAipSpeech();
};
Game_Temp.prototype.startRecord = function() {
    if(this.aipSpeech_recorder.isReady()){
        this.aipSpeech_recorder.start();
    }else{
        setTimeout(function(){
            $gameTemp.startRecord();
        }, 10);
    }
};
Game_Temp.prototype.stopRecord = function() {
    this.aipSpeech_recorder.stop();
};
Game_Temp.prototype.showAipSpeech = function() {
    this.aipSpeech_sprite.active();
};
Game_Temp.prototype.hideAipSpeech = function() {
    // this.aipSpeech_sprite.deactive();
};
Game_Temp.prototype.speak = function(text) {
    this.aipSpeech_sprite.setSpeakText(text);
    if(this.awake){
        this.aipSpeech_sdk.text2audio(text,{
            owner: this,
            success: function(blobdata){
                this.aipSpeech_player.play(blobdata);
            },
        })
    }
};
Game_Temp.prototype.status = function(text) {
    this.aipSpeech_sprite.setStatusText(text);
};
Game_Temp.prototype.setReplyIntent = function(intent){
    Lagomoro_AipSpeech_Skill.setTargrtIntent(intent);
}
Game_Temp.prototype.retry = function(){
    Lagomoro_AipSpeech_Skill.setLastIntent();
}
// ======================================================================
// * Sprite_AipSpeech
// ======================================================================
function Sprite_AipSpeech() {
    this.initialize.apply(this, arguments);
};
Sprite_AipSpeech.prototype = Object.create(Sprite.prototype);
Sprite_AipSpeech.prototype.constructor = Sprite_AipSpeech;
Sprite_AipSpeech.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this, new Bitmap(360, 80));
    this.opacity = 0;
    // this.visible = false;

    this._active = false;
    this.animateTime = 0;
    this.pause = false;
    this.targetOpacity = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.statusText = "";
    this.speakText = "";

    this.speakProcess = 0;
};
Sprite_AipSpeech.prototype.active = function(){
    this._active = true;
    this.visible = true;
    this.refresh();
};
Sprite_AipSpeech.prototype.deactive = function(){
    this._active = false;
    this.visible = false;
    this.bitmap.clear();
};
Sprite_AipSpeech.prototype.resetAnimate = function(){
    this.animateTime = 0;
};
Sprite_AipSpeech.prototype.pauseAnimate = function(){
    this.pause = true;
};
Sprite_AipSpeech.prototype.playAnimate = function(){
    this.pause = false;
};
Sprite_AipSpeech.prototype.setOpacity = function(opacity){
    this.opacity = opacity;
    this.targetOpacity = opacity;
};
Sprite_AipSpeech.prototype.setTargetOpacity = function(opacity){
    this.targetOpacity = opacity;
};
Sprite_AipSpeech.prototype.setPlace = function(x, y){
    this.x = x, this.y = y;
    this.targetX = x, this.targetY = y;
};
Sprite_AipSpeech.prototype.setTargetPlace = function(x, y){
    this.targetX = x, this.targetY = y;
};
Sprite_AipSpeech.prototype.setStatusText = function(text){
    this.statusText = text;
};
Sprite_AipSpeech.prototype.setSpeakText = function(text){
    this.speakText = text;
    this.speakProcess = 0;
};
Sprite_AipSpeech.prototype.old_update = Sprite_AipSpeech.prototype.update;
Sprite_AipSpeech.prototype.update = function(){
    this.old_update();
    if(this._active){
        if(!this.pause){
            this.animateTime ++;
        }
        this.refresh();
    }else{
        this.resetAnimate();
    }
    //target process
    if(this.opacity !== this.targetOpacity){
        var delta = this.targetOpacity - this.opacity;
        this.opacity = Math.abs(delta) < 5 ? this.targetOpacity : this.opacity + delta/Math.abs(delta)*5 ;
    }
    if(this.x !== this.targetX){
        var delta = this.targetX - this.x;
        this.x = Math.abs(delta) < 3 ? this.targetX : this.x + delta/Math.abs(delta)*3;
    }
    if(this.y !== this.targetY){
        var delta = this.targetY - this.y;
        this.y = Math.abs(delta) < 3 ? this.targetY : this.y + delta/Math.abs(delta)*3;
    }
    //speak process
    if(this.speakProcess < this.speakText.length && this.animateTime % 3 === 0){
        this.speakProcess += 1;
    }
};
Sprite_AipSpeech.prototype.refresh = function(){
    var b = this.bitmap, w = b.width, h = b.height, t = this.animateTime;
    //绘制背景
    b.clear();
    b.fillRect(0, 0, w, h, 'rgba(0, 0, 0, 0.4)');
    //绘制圆环
    var max = h/2-5, min = 5, delta = (max - min) / 60 * (t % 60);
    b.drawRing(h/2, h/2, max - delta, max - delta - 5, 0, 360, true, 'rgba(255, 255, 255, 0.4)');
    b.drawRing(h/2, h/2, min + delta, min + delta - 5, 0, 360, true, 'rgba(255, 255, 255, 0.4)');
    //绘制圆点
    var radius = Math.abs((max - min) / 60 * Math.abs(t % 120 - 60) - ((max - min)/2)) + 2.5 + ((max - min)/2);
    var max = Math.PI*2, min = 0, delta = (max - min) / 60 * (t % 60);
    b.drawCircle(h/2 + radius*Math.cos(delta), h/2 + radius*Math.sin(delta), 5, 'rgba(255, 255, 255, 1)');
    //绘制文字
    b.fontSize = 18;
    var text = Math.floor(t % 60 / 12) % 4, temp = "";
    for(var i = 0;i < text; i++){temp += ".";}
    b.fontColor = "rgba(255, 255, 255, 1);"
    b.drawText(this.statusText + temp, h + 5, h/2 - 18 - 6, w - h, 18, 'left');
    b.drawText(this.speakText.substring(0, this.speakProcess), h + 5, h/2 + 6, w - h, 18, 'left');
};
// ======================================================================
// * Bitmap
// ======================================================================
Bitmap.prototype.drawRing = function(x, y, Radius, radius, sAngle, eAngle, counterclockwise, color) {
    var context = this._context;
    context.save();
    context.fillStyle = color;
    context.beginPath();
	context.translate(x, y);
    context.moveTo(0, 0);
    context.arc(0, 0, Radius, (sAngle - 90)/180*Math.PI, (eAngle - 90)/180*Math.PI, counterclockwise);
    context.arc(0, 0, radius, (eAngle - 90)/180*Math.PI, (sAngle - 90)/180*Math.PI, !counterclockwise);
    context.closePath();
    context.fill();
    context.restore();
    this._setDirty();
};
// ======================================================================
// * Scene_Base
// ======================================================================
Scene_Base.prototype.Lagomoro_AipSpeech_create = Scene_Base.prototype.create;
Scene_Base.prototype.create = function() {
	this.Lagomoro_AipSpeech_create();
	this.createAipSpeechSprite();
};
Scene_Base.prototype.createAipSpeechSprite = function() {
    if($gameTemp) this.addChild($gameTemp.aipSpeech_sprite);
};
Scene_Base.prototype.Lagomoro_AipSpeech_update = Scene_Base.prototype.update;
Scene_Base.prototype.update = function() {
    this.Lagomoro_AipSpeech_update();
    if($gameTemp){
        for(var i = 0;i < this.children.length;i++){
            if(this.children[i] === $gameTemp.aipSpeech_sprite && i !== this.children.length - 1){
                var temp = this.children[i + 1];
                this.children[i + 1] = this.children[i];
                this.children[i] = temp;
            }
        }
    }
};
