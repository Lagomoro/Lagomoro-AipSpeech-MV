/*:
 * @plugindesc Lagomoro_AipSpeech IntentPack [Base]
 * @author Lagomoro
 */

var saveSlotIntent = {
    slots: [[/(\d+)号/,/(\d+)，/,/(\d+)好/,/([一二三四五六七八九十])号/,/([一二三四五六七八九十])好/,/(\d+)/,/([一二三四五六七八九十])/]],
    callback: function(slotdata){
        var saveslot = "一二三四五六七八九十".search(slotdata[0]);
        if(saveslot > -1){
            saveslot += 1;
        }else if(parseInt(slotdata[0]).toString() !== "NaN"){
            saveslot = parseInt(slotdata[0]);
        }
        if(saveslot > DataManager.maxSavefiles()){
            this.speak(saveslot + "太贪心了啦，上限是" + DataManager.maxSavefiles() + "号哦。");
            this.retry();
        }else if(saveslot > -1){
            if(StorageManager.exists(saveslot)){
                this.speak("该档位已经存在，需要覆盖么？");
                this.temp = saveslot;
                this.setReplyIntent(haveSlotIntent);
            }else{
                $gameSystem.onBeforeSave();
                DataManager.saveGame(saveslot);
                this.speak("好的，已经存储到" + saveslot + "号档位。");
                this.finish();
            }
        }else{
            this.speak("没有听清您的档位呢。");
            this.retry();
        }
    },
    untreated: function(){
        this.retry();
    }
}
var haveSlotIntent = [{
    keywords: ["取消", "不"],
    callback: function(slotdata){
        this.speak("好的，那么要存到几号档位呢？");
        this.setReplyIntent(saveSlotIntent);
    }},{
    keywords: ["好的", "可以", "需要", "覆盖"],
    callback: function(slotdata){
        $gameSystem.onBeforeSave();
        DataManager.saveGame(this.temp);
        this.speak("好的，已经覆盖到" + this.temp + "号档位。");
        this.finish();
    }},{
        keywords: ["挑", "选择"],
        callback: function(slotdata){
            for(var i = 0; i < DataManager.maxSavefiles(); i++){
                if(!StorageManager.exists(i+1)){
                    $gameSystem.onBeforeSave();
                    DataManager.saveGame(i+1);
                    this.speak("好的，自动存储到" + (i+1) + "号档位。");
                    break;
                }
            }
            this.finish();
        }},{
    keywords: ["打开"],
    callback: function(slotdata){
        SceneManager.push(Scene_Save);
        this.speak("好的，请您手动操作。");
        this.finish();
    },
    untreated: function(){
        this.speak("没有听明白呢，需要覆盖么？");
        this.retry();
    }
}];
Lagomoro_AipSpeech_Skill.addIntent({
    keywords: ["存储", "存档", "存挡", "存到", "存的", "冲的", "冲到"],
    slots: [[/(\d+)号/,/(\d+)，/,/(\d+)好/,/([一二三四五六七八九十])号/,/([一二三四五六七八九十])好/]],
    callback: function(slotdata){
        var saveslot = "一二三四五六七八九十".search(slotdata[0]);
        if(saveslot > -1){
            saveslot += 1;
        }else if(parseInt(slotdata[0]).toString() !== "NaN"){
            saveslot = parseInt(slotdata[0]);
        }
        if(saveslot > DataManager.maxSavefiles()){
            this.speak(saveslot + "太贪心了啦，上限是" + DataManager.maxSavefiles() + "号哦。");
            this.setReplyIntent(saveSlotIntent);
        }else if(saveslot > -1){
            if(StorageManager.exists(saveslot)){
                this.speak("该档位已经存在，需要覆盖么？");
                this.temp = saveslot;
                this.setReplyIntent(haveSlotIntent);
            }else{
                $gameSystem.onBeforeSave();
                DataManager.saveGame(saveslot);
                this.speak("好的，已经存储到" + saveslot + "号档位。");
                this.finish();
            }
        }else{
            this.speak("好的，那么要存到几号档位呢？");
            this.setReplyIntent(saveSlotIntent);
        }
    }
});