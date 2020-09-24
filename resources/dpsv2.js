// ---- utils ----
// public name cache
let _names = {};
// public checkSpecs() cache
let _spec = false;

let AttributeKeys = [
    'atk',
    'attackSpeed',
    'baseAttackTime',
    'baseForceLevel',
    'blockCnt',
    'cost',
    'def',
    'hpRecoveryPerSec',
    'magicResistance',
    'massLevel',
    'maxDeckStackCnt',
    'maxDeployCount',
    'maxHp',
    'moveSpeed',
    'respawnTime',
    'spRecoveryPerSec',
    'tauntLevel',
];

let PotentialAttributeTypeList = {
    0: "maxHp",
    1: "atk",
    2: "def",
    3: "magicResistance",
    4: "cost",
    5: "blockCnt",
    6: "moveSpeed",
    7: "attackSpeed",
    21: "respawnTime",
};

// 获取ID为tag的角色/技能的额外数据，存放在dps_specialtags.json中
// 前一次调用的结果暂存在_spec里(不考虑重入)
function checkSpecs(tag, spec) {
    let specs = AKDATA.Data.dps_specialtags;
    if ((tag in specs) && (spec in specs[tag]))
      _spec = specs[tag][spec];
    else _spec = false;
    return _spec;
}

// 对角色attr属性进行插值并取整。攻击间隔不进行取整
function getAttribute(frames, level, minLevel, attr) {
    var ret = (level - minLevel) / (frames[1].level - frames[0].level) * (frames[1].data[attr] - frames[0].data[attr]) + frames[0].data[attr];
    if (attr != "baseAttackTime")
      return Math.round(ret);
    else return ret;
}

// 将blackboard的"[{k:v}]"格式转为正常字典
function getBlackboard(blackboardArray) {
    let blackboard = {};
    blackboardArray.forEach(kv => blackboard[kv.key] = kv.value);
    return blackboard;
}

class Log {
    constructor() {
        this.log = {};
        this.muted = false;
    }

    write(key, line) {
        if (!this.muted) {
            if (!this.log[key]) this.log[key] = [];
            if (this.log[key].indexOf(line) == -1)  // 同样的语句只出现一次
                this.log[key].push(line);
        }
    }
    writeNote(line) {
        this.write("note", line);
    }

    toString(key=null) {
        if (key)
            return this.log[key].join("\n");
        else {
            var lines=[];
            for (var k in this.log) {
                lines.push(`-- ${k} --`);
                lines.push(this.toString(k));
            }
            return lines.join("\n");
        } 
    }

    toMarkdown(key=null) {
        if (key)
            return this.log[key].join("\n").replace(/_/g, "\\_").replace(/\~/g, "_");
        else {
            var lines=[];
            for (var k in this.log) {
                lines.push(`- ${k}`);
                lines.push(this.toMarkdown(k));
            }
            return lines.join("\n");
        }
    }
}

// ---- 核心模组 ----
// 扩展的char对象，包括原本char的id/技能等级选项等信息，和从DB中提取的技能名字blackboard等信息。
class CharAttribute {
    setChar(char) {
        // 设置人物和技能数据
        this.changeCharId(char.charId);
        this.changeSkillId(char.skillId);
        // 复制原本的char对象内容
        this.phase = char.phase || this.charData.phases.length - 1;
        this.level = char.level || this.charData.phases[this.phase].maxLevel;
        this.favor = char.favor || 200;
        this.potentialRank = char.potentialRank || 5;
        this.options = {...char.options};
        return this;
    }

    // 切换为其他角色，不改变等级等属性
    // 除了setChar以外，处理召唤物时也要用到
    changeCharId(charId) {
        this.charId = charId;
        this.charData = AKDATA.Data.character_table[charId];
        _names[this.charId] ||= this.charData.name;
        return this;
    }

    // 切换为其他技能，不改变其他属性
    changeSkillId(skillId) {
        this.skillId = skillId;
        this.skillData = AKDATA.Data.skill_table[skillId];
        if (!this.skillLevel || this.skillLevel < 0
            || this.skillLevel > this.skillData.levels.length-1)
            this.skillLevel = this.skillData.levels.length-1;
        this.levelData = this.skillData.levels[this.skillLevel];
        this.blackboard = getBlackboard(this.skillData.levels[this.skillLevel].blackboard) || {};
        this.blackboard.id = this.skillId;
        this.skillName = this.levelData.name;
        _names[this.skillId] ||= this.skillName;
    }

    clone() {
        var ret = new CharAttribute();
        ret.setChar(this);
        return ret;
    }

    explain(log) { 
        log.write("CharAttribute", `| 角色 | 等级 | 技能 |`);
        log.write("CharAttribute", `| :--: | :--: | :--: | `);
        log.write("CharAttribute", `| ~${this.charId}~ - **${this.charData.name}**  | 精英 ${this.phase}, 等级 ${this.level},
                                      潜能 ${this.potentialRank+1} | ${this.skillName}, 等级 ${this.skillLevel+1} |`);
    }

    getDamageType(isSkill) {
        // 优先读取spec
        var skillDesc = this.levelData.description;
        if (isSkill) {
            if (checkSpecs(this.skillId, "damage_type"))
                return ~~_spec;
            else if (checkSpecs(this.charId, "damage_type"))
                return ~~_spec;
            else if (this.options.token && checkSpecs(this.charId, "token_damage_type"))
                return ~~_spec;
            else {
                if (["法术伤害", "法术</>伤害", "伤害类型变为"].some(x => skillDesc.includes(x)))
                return 1;
              else if (["治疗", "恢复", "每秒回复"].some(x => skillDesc.includes(x)) && 
                       !this.blackboard["hp_recovery_per_sec_by_max_hp_ratio"])
                return 2;
                }
        } else {
            if (this.options.token && checkSpecs(this.charId, "token_damage_type"))
                return ~~_spec;
            else {
                if (this.charData.profession == "MEDIC")
                    return 2;
                else if (this.charData.description.includes('法术伤害') && !["char_260_durnar", "char_378_asbest"].includes(charId))
                    return 1;
            }
        }
        return 0;
    } // getDamageType

    canResetAttack() {
        return (checkSpecs(this.skillId, "reset_attack") != false || 
            ["base_attack_time", "attack@max_target", "max_target"].some(
                x => this.blackboard[x] != null
            )
        );
    }
}

// BuffFrame 不作为class
function initBuffFrame() {
    return {
      atk_scale: 1,
      def_scale: 1,
      heal_scale:1,
      damage_scale: 1,
      maxTarget: 1,
      times: 1,
      edef:0, // 敌人防御/魔抗
      edef_scale:1,
      edef_pene:0,
      edef_pene_scale:0,
      emr_pene:0, // 无视魔抗
      emr:0,
      emr_scale:1,
      atk:0,
      def:0,
      attackSpeed:0,
      maxHp: 0,
      baseAttackTime:0,
      spRecoveryPerSec:0,
      applied:{}
    };
}

function cloneBuffFrame(frame) {
    var ret = {...frame};
    ret.applied = {...frame.applied};
    return ret;
}

class DpsState {
    constructor() {
        this.isSkill = false;
        this.isCrit = false;
        this.isToken = false;
        this.isEnemyDecided = false;    // 某些buff需要在给定敌人后再计算
        this.buffList = {};
        this.buffFrame = initBuffFrame();
        this.log = new Log();
        // other entries will be created on use
    }

    // 0. char -> setChar() -> CharAttribute
    setChar(char) {
        this.char = new CharAttribute();
        this.char.setChar(char);
        this.buffList["skill"] = this.char.blackboard;
        this.char.explain(this.log);
        this.skillId = char.skillId;
    }

    setEnemy(enemy=null) {
        this.enemy = enemy || { def: 0, magicResistance: 0, count: 1};
    }

    setRaidBuff(rb=null) {
        this.raidBuff = rb || { atk: 0, atkpct: 0, ats: 0, cdr: 0, 
                                base_atk: 0, damage_scale: 0};
        // 把raidBuff处理成blackboard的格式
        this.raidBlackboard = {
            atk: this.raidBuff.atkpct / 100,
            atk_override: this.raidBuff.atk,
            attack_speed: this.raidBuff.ats,
            sp_recovery_per_sec: this.raidBuff.cdr / 100,
            base_atk: this.raidBuff.base_atk / 100,
            damage_scale: 1 + this.raidBuff.damage_scale / 100
        };
        _names["raidBuff"] = "团辅";
    }
    
    // 1. CharAttribute -> basic AttributeFrame
    calcBasicFrame() {
        var charData = this.char.charData;
        var phaseData = charData.phases[this.char.phase];
        var basicFrame = {};
        var buffList = {skill: this.char.blackboard};

        // 计算基础属性插值，包括等级和信赖
        if (this.char.level == phaseData.maxLevel) {
            basicFrame = Object.assign(basicFrame, phaseData.attributesKeyFrames[1].data);
        } else {
            AttributeKeys.forEach(key => {
                // 等级范围: 1-90(不包含0)
                basicFrame[key] = getAttribute(phaseData.attributesKeyFrames, this.char.level, 1, key);
            });
        }
        if (charData.favorKeyFrames) {
            let favorLevel = Math.floor(Math.min(this.char.favor, 100) / 2);
            AttributeKeys.forEach(key => {
                // 信赖范围: 0-200(包含0)
                basicFrame[key] += getAttribute(charData.favorKeyFrames, favorLevel, 0, key);
            });
        }
        // 计算潜能
        if (charData.potentialRanks && charData.potentialRanks.length > 0) {
            for (let i = 0; i < this.char.potentialRank; i++) {
                let potentialData = charData.potentialRanks[i];
                if (potentialData.buff) {
                    let y = potentialData.buff.attributes.attributeModifiers[0];
                    let key = PotentialAttributeTypeList[y.attributeType];
                    basicFrame[key] += y.value;
                }
            }
        }
        // 计算团辅的原本攻击力部分
        if (this.raidBlackboard.base_atk != 0) {
            let delta = basicFrame.atk * this.raidBlackboard.base_atk;
            let prefix = (delta > 0 ? "+" : "");
            basicFrame.atk = Math.round(basicFrame.atk + delta);
            this.log.write("CharAttribute", `[团辅] 原本攻击力变为 ${basicFrame.atk} (${prefix}${delta.toFixed(1)})`);         
        }

        return basicFrame;
    }

    // 根据不同的buffs frame 计算最终属性
    calcFinalFrame(buffs) {
        let final = {...this.basicFrame};
        AttributeKeys.forEach(key => {
            if (buffs[key]) final[key] += buffs[key];
        });
        final.atk *= buffs.atk_scale;
        return final;
    }

    // 2. basicFrame (with potential) -> addTalents() 将天赋与特性添加至Buff表
    addTalents() {
        var talents = [...this.char.charData.talents]; // shallow copy
        if (this.char.charData.trait) talents.unshift(this.char.charData.trait);

        talents.forEach(ta => {
            for (var i=ta.candidates.length-1; i>=0; i--) {
                // 倒序查找可用的天赋等级
                let cd = ta.candidates[i];
                if (!cd.prefabKey) { 
                    cd.prefabKey = "trait"; cd.name = "特性";
                }
                if (this.char.phase >= cd.unlockCondition.phase &&
                    this.char.level >= cd.unlockCondition.level &&
                    this.char.potentialRank >= cd.requiredPotentialRank) {
                        var prefabKey = `tachr_${this.char.charId.slice(5)}_${cd.prefabKey}`;
                        _names[prefabKey] = cd.name;
                        this.buffList[prefabKey] = getBlackboard(cd.blackboard);
                        break;
                    }
            }
        });
    }

    test() {
        if (checkSpecs(this.char.charId, "note"))
            this.log.writeNote(_spec);
        
        console.log(this.buffList);
        // 普攻
        for (var b in this.buffList)
            applyBuff(this, this.buffFrame, b, this.buffList[b]);
        console.log("normal", this.buffFrame);

        var skillBuffFrame = initBuffFrame();
        this.isSkill = true;
        // 技能
        for (var b in this.buffList)
            applyBuff(this, skillBuffFrame, b, this.buffList[b]);
        console.log("skill", skillBuffFrame);
        console.log("damageType", this.char.getDamageType(true));
    }
}

// 判断指定buff是否生效。返回true/false
function checkBuff(state, currBuffFrame, buffKey) {
    if (currBuffFrame.applied[buffKey])
        return false;   // 防止重算  
    else if (buffKey == "skill" && !state.isSkill)
        return false;   // 非技能时，skill buff不生效
    else if (checkSpecs(buffKey, "enemy") && !state.isEnemyDecided)
        return false;   // 有enemy标签的buff需要在敌人属性给定后才能计算
    else if (buffKey == "raidBuff" && !state.options.buff)
        return false;   // 未选择计算团辅时 raidBuff不生效
    else if (checkSpecs(buffKey, "cond") && !state.options.cond) {
        // cond不满足时，cond buff不生效
        // 特判: W技能眩晕必定有天赋加成
        if (buffKey == "tachr_113_cqbw_2" && state.isSkill)
            return true;
        else return false;   
    }
    else if (checkSpecs(buffKey, "stack") && !state.options.stack)
        return false;   // stack ~
    else if (checkSpecs(buffKey, "crit") && !(state.isCrit && state.options.crit))
        return false;   // 有crit标签，但是当前状态不是计算暴击时 / 未选择暴击选项时 不生效

    return true;
}

function writeBuffDefault(state, buffKey, text) {
    let line = [""];
    if (buffKey == state.skillId) line.push("[技能]");
    else if (buffKey == "raidBuff") line.push("[团辅/拐]");
    else line.push("[天赋]");
    
    if (checkSpecs(buffKey, "cond")) 
      if (state.options.cond) line.push("[触发]"); else line.push("[未触发]");
    if (checkSpecs(buffKey, "stack") && state.options.stack) line.push("[满层数]"); 
    if (checkSpecs(buffKey, "ranged_penalty")) line.push("[距离惩罚]");
    
    line.push(_names[buffKey] + ": ");
    if (text) line.push(text);
    state.log.write("applyBuff", line.join(" "));
  }

function applyBuffDefault(state, currBuffFrame, buffKey, bboard) {
    var prefix = 0;
    var buffFrame = currBuffFrame;
    var blackboard = {...bboard};   // shallow copy

    // currying
    function writeBuff(text) {
        writeBuffDefault(state, buffKey, text);
    }

    // note
    if (checkSpecs(buffKey, "note"))
        state.log.writeNote(_spec);
    // mask
    var maskedKeys = checkSpecs(buffKey, "masked");
    if (maskedKeys) {
        if (maskedKeys == true) {
            console.log("masked - ", buffKey);
            return currBuffFrame;   // 为true直接返回
        } else {
            for (var k in maskedKeys) {
                console.log("masked -", k);
                delete blackboard[k];
            }
        }
    }
    // alias
    var aliases = checkSpecs(buffKey, "alias");
    if (aliases) { 
        for (var a in aliases) {
            if (a.option_key) {
                if (state.options[a.option_key]) {
                    blackboard[a.key] = blackboard[a.alias_on_true];
                    delete blackboard[a.alias_on_true];
                    console.log("alias[true] - ", a.key, a.alias_on_true);
                } else if (a.alias_on_false) {
                    // 如果不指定alias_on_false则不进行替换
                    blackboard[a.key] = blackboard[a.alias_on_false];
                    delete blackboard[a.alias_on_false];
                    console.log("alias[false] - ", a.key, a.alias_on_false);
                } else {
                    blackboard[a.key] = blackboard[a.alias];
                    delete blackboard[a.alias];
                    console.log("alias - ", a.key, a.alias);
                }
            }
        }
    }
    // ranged_penalty
    if (checkSpecs(buffKey, "ranged_penalty") && state.options.ranged_penalty) {
        blackboard.atk_scale ||= 1;
        blackboard.atk_scale *= _spec;
        writeBuff(`远程惩罚: atk_scale = ${blackboard.atk_scale.toFixed(2)} (x${_spec.toFixed(1)})`);
    }
    // stack
    if (blackboard.max_stack_cnt) {
        ["atk", "def", "attack_speed", "max_hp"].forEach(key => {
            if (blackboard[key]) blackboard[key] *= blackboard.max_stack_cnt;
        });
    }
    // max_target spec
    if (checkSpecs(buffKey, "max_target")) {
        buffFrame.maxTarget = (_spec == "all") ? 999 : _spec;
        writeBuff(`最大目标数: ${buffFrame.maxTarget}`);
    }
    // sec spec
    if (checkSpecs(buffKey, "sec")) {
        blackboard.base_attack_time = 1 - (state.basicFrame.baseAttackTime + buffFrame.baseAttackTime);
        buffFrame.attackSpeed = 0;
        blackboard.attack_speed = 0;
        writeBuff("每秒造成一次伤害/治疗");
    }
    // times spec (skill only)
    if (checkSpecs(buffKey, "times"))
        blackboard.times ||= _spec;
    
    // original applyBuff
    for (var key in blackboard) {
        switch (key) {
            case "atk":
            case "def":
                prefix = blackboard[key] > 0 ? "+" : "";
                buffFrame[key] += state.basicFrame[key] * blackboard[key];
                if (blackboard[key] != 0)
                    writeBuff(`${key}: ${prefix}${(blackboard[key]*100).toFixed(1)}% (${prefix}${(state.basicFrame[key] * blackboard[key]).toFixed(1)})`);
                break;
            case "max_hp":
                prefix = blackboard[key] > 0 ? "+" : "";
                if (Math.abs(blackboard[key]) > 2) { // 加算
                    buffFrame.maxHp += blackboard[key];
                    writeBuff(`${key}: ${prefix}${blackboard[key]}`);
                } else if (blackboard[key] != 0) { // 乘算
                    buffFrame.maxHp += state.basicFrame.maxHp * blackboard[key];
                    writeBuff(`${key}: ${prefix}${(blackboard[key]*100).toFixed(1)}% (${prefix}${(state.basicFrame.maxHp * blackboard[key]).toFixed(1)})`);
                }
                break;
            case "base_attack_time":
                if (blackboard.base_attack_time < 0) { // 攻击间隔缩短 - 加算
                    buffFrame.baseAttackTime += blackboard.base_attack_time;
                    writeBuff(`base_attack_time: ${buffFrame.baseAttackTime.toFixed(3)}s`);
                } else {  // 攻击间隔延长 - 乘算
                    buffFrame.baseAttackTime += state.basicFrame.baseAttackTime * blackboard.base_attack_time;
                    writeBuff(`base_attack_time: +${(state.basicFrame.baseAttackTime * blackboard.base_attack_time).toFixed(3)}s`);
                }
                break;
            case "attack_speed":
                if (blackboard[key] == 0) break;
                prefix = blackboard[key] > 0 ? "+" : "";
                buffFrame.attackSpeed += blackboard.attack_speed;
                writeBuff(`attack_speed: ${prefix}${blackboard.attack_speed}`);
                break;
            case "sp_recovery_per_sec":
                buffFrame.spRecoveryPerSec += blackboard.sp_recovery_per_sec;
                if (blackboard[key]>0) writeBuff(`sp: +${buffFrame.spRecoveryPerSec}/s`);
                break;
            case "atk_scale":
            case "def_scale":
            case "heal_scale":
            case "damage_scale":
                buffFrame[key] *= blackboard[key];
                if (blackboard[key] != 1) writeBuff(`${key}: ${blackboard[key].toFixed(2)}x`);
                break;
            case "attack@atk_scale":
                buffFrame.atk_scale *= blackboard["attack@atk_scale"];
                writeBuff(`atk_scale: ${buffFrame.atk_scale.toFixed(2)}`);
                break;
            case "attack@heal_scale":
                buffFrame.heal_scale *= blackboard["attack@heal_scale"];
                writeBuff(`heal_scale: ${buffFrame.heal_scale.toFixed(2)}`);
                break;
            case "max_target":
            case "attack@max_target":
                buffFrame.maxTarget = Math.max(buffFrame.maxTarget, blackboard[key]);
                writeBuff(`maxTarget: ${buffFrame.maxTarget}`);
                break;
            case "times":
            case "attack@times":
                buffFrame.times = blackboard[key];
                writeBuff(`攻击次数: ${blackboard[key]}`);
                break;
            case "magic_resistance":
                if (blackboard[key] < -1) { // 魔抗减算
                    buffFrame.emr += blackboard[key];
                    writeBuff(`敌人魔抗: ${blackboard[key]}% (加算)`);
                } else if (blackboard[key] < 0) { // 魔抗乘算
                    buffFrame.emr_scale *= (1+blackboard[key]);
                    writeBuff(`敌人魔抗: ${(blackboard[key]*100).toFixed(1)}% (乘算)`);
                } // 大于0时为增加自身魔抗，不计算
                break;
            case "prob":
                if (!blackboard["prob_override"]) {
                    buffFrame.prob = blackboard[key];
                    writeBuff(`概率(原始): ${Math.round(buffFrame.prob*100)}%`);
                }
                break;
            // 计算值，非原始数据
            case "edef":  // 减甲加算值（负数）
                buffFrame.edef += blackboard[key];
                writeBuff(`敌人护甲: ${blackboard[key]}`);
                break;
            case "edef_scale": // 减甲乘算值
                buffFrame.edef_scale *= (1+blackboard[key]);
                writeBuff(`敌人护甲: ${blackboard[key] *100}%`);
                break;
            case "edef_pene": // 无视护甲加算值
                buffFrame.edef_pene += blackboard[key];
                writeBuff(`无视护甲（最终加算）: -${blackboard[key]}`);
                break;
            case "edef_pene_scale":
                buffFrame.edef_pene_scale = blackboard[key];
                writeBuff(`无视护甲（最终乘算）: -${blackboard[key]*100}%`);
                break;
            case "emr_pene":  // 无视魔抗加算值
                buffFrame.emr_pene += blackboard[key];
                writeBuff(`无视魔抗（加算）: -${blackboard[key]}`);
                break;
            case "prob_override": // 计算后的暴击概率，有alias无法处理的情况所以保留
                buffFrame.prob = blackboard[key];
                writeBuff(`概率(计算): ${Math.round(buffFrame.prob*100)}%`);
                break;
            case "atk_override":  // 攻击团辅(raidBuff使用)
                buffFrame.atk += blackboard[key];
                prefix = blackboard[key] > 0 ? "+" : "";
                if (blackboard[key] != 0)
                    writeBuff(`atk(+): ${prefix}${(blackboard[key]*100).toFixed(1)}`);
                break;
        } // switch
    }
    buffFrame.applied[buffKey] = true;
    return buffFrame;
}

function applyBuff(state, currBuffFrame, buffKey, bboard) {
    var prefix = 0;
    var buffFrame = currBuffFrame;
    var skillId = state.skillId;
    var blackboard = {...bboard};   // shallow copy
    var done = false; // if !done, will call applyBuffDefault() in the end

    // gatekeeper
    if (!checkBuff(state, currBuffFrame, buffKey)) return currBuffFrame;

    if (buffKey == "skill") buffKey = skillId;
    // 特判
    switch (buffKey) {
        case "tachr_185_frncat_1":  // 慕斯
            buffFrame.times = 1 + blackboard.prob;
            writeBuff(`攻击次数 x ${buffFrame.times}`);
            done = true; break;
        case "tachr_109_fmout_1": // 远山
            if (skillId == "skcom_magic_rage[2]") {
              blackboard.attack_speed = 0;
              state.log.writeNote("抽攻击卡");          
            } else if (skillId == "skchr_fmout_2") {
              blackboard.atk = 0;
              state.log.writeNote("抽攻速卡");
            }
            break;
        case "tachr_373_lionhd_1":  // 莱恩哈特 (与敌人相关)
            blackboard.atk *= Math.min(state.enemy.count, blackboard.max_valid_stack_cnt);
            break;
        case "skchr_bluep_2":
            // 蓝毒2: 只对主目标攻击多次
            buffFrame.maxTarget = 3;
            writeBuff(`最大目标数 = ${buffFrame.maxTarget}, 主目标命中 ${blackboard["attack@times"]} 次`);
            delete blackboard["attack@times"]; // 额外攻击后面计算
            break;
        case "skchr_yuki_2":
            blackboard["attack@atk_scale"] *= 3;
            writeBuff(`满伤害倍率: ${blackboard["attack@atk_scale"]}，但可能少一段伤害`);
            break;
        case "skchr_vodfox_1":
            buffFrame.damage_scale = 1 + (buffFrame.damage_scale - 1) * blackboard.scale_delta_to_one;
            break;
        case "skchr_thorns_2":
            state.log.writeNote("反击按最小间隔计算");
            blackboard.base_attack_time = blackboard.cooldown - (state.basicFrame.baseAttackTime + buffFrame.baseAttackTime);
            buffFrame.attackSpeed = 0;
            blackboard.attack_speed = 0;
        // 暴击类
        case "tachr_290_vigna_1":
            blackboard.prob_override = (state.isSkill ? blackboard.prob2 : blackboard.prob1);
            break;
        case "tachr_106_franka_1": // 芙兰卡
            blackboard.edef_pene_scale = 1;
            if (state.isSkill && skillId == "skchr_franka_2")
              blackboard.prob_override = 0.5;
            break;
        case "tachr_155_tiger_1":
            blackboard.prob_override = blackboard["tiger_t_1[evade].prob"];
            blackboard.atk = blackboard["charge_on_evade.atk"];
            break;
        case "tachr_340_shwaz_1":
            if (state.isSkill) blackboard.prob_override = state.buffList.skill["talent@prob"];
            blackboard.edef_scale = blackboard.def;
            delete blackboard["def"]; 
            break;
        case "tachr_225_haak_1":
            blackboard.prob_override = 0.25;
            break;
        case "skchr_peacok_1":
            blackboard.prob_override = blackboard["peacok_s_1[crit].prob"];
            if (state.isCrit) blackboard.atk_scale = blackboard.atk_scale_fake;
            break;
        case "skchr_peacok_2":
            if (state.isCrit) {
                writeBuff(`成功 - atk_scale = ${blackboard["success.atk_scale"]}`);
                blackboard.atk_scale = blackboard["success.atk_scale"];
                buffFrame.maxTarget = 999;
            } else {
                writeBuff("失败时有一次普攻")
            }
            break;
        case "skchr_tomimi_2":
            blackboard.prob_override = blackboard["attack@tomimi_s_2.prob"] / 3;
            delete blackboard.base_attack_time;
            if (state.isCrit) {
                blackboard.atk_scale = blackboard["attack@tomimi_s_2.atk_scale"];
                state.log.writeNote(`每种状态概率: ${(blackboard.prob_override*100).toFixed(1)}%`);
            }
            break;
        // 算法改变类
        case "tachr_187_ccheal_1":
        case "tachr_147_shining_1": // 防御力增加(加算)
            writeBuff(`def +${blackboard.def}`);
            buffFrame.def += blackboard.def;
            delete blackboard[def];
            break;
        case "skchr_hmau_2":
        case "skchr_spot_1":
        case "tachr_193_frostl_1":
        case "skchr_mantic_2":
        case "skchr_glaze_2":
        case "skchr_zumama_2": // 攻击间隔延长，但是是加算
            buffFrame.baseAttackTime += blackboard.base_attack_time;
            writeBuff(`base_attack_time + ${blackboard.base_attack_time}s`);
            blackboard.base_attack_time = 0;
            break;
        case "skchr_brownb_2":  // 攻击间隔缩短，但是是乘算负数
            writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
            blackboard.base_attack_time *= state.basicFrame.baseAttackTime;
            break;
        case "skchr_aglina_2":  // 攻击间隔缩短，但是是乘算正数
        case "skchr_cerber_2":
        case "skchr_finlpp_2": 
            writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
            blackboard.base_attack_time = (blackboard.base_attack_time - 1) * state.basicFrame.baseAttackTime;
            break;
        case "skchr_angel_3": // 攻击间隔双倍减算
            writeBuff("攻击间隔双倍减算");
            blackboard.base_attack_time *= 2;
            break;
        // 开关类
        case "tachr_344_beewax_trait":
            if (state.isSkill) done = true; break;
        case "tachr_411_tomimi_1":
            if (!state.isSkill) done = true; break;
        case "tachr_164_nightm_1":  // 夜魔
            if (skillId == "skchr_nightm_1") done = true; break;
        case "tachr_367_swllow_1":  // 灰喉天赋
            if (!state.isCrit) delete blackboard.atk_scale; break;
        case "skchr_folivo_1":
        case "skchr_folivo_2":
        case "skchr_deepcl_1":
            if (!options.token) {
                blackboard.atk = 0; // 不增加本体攻击
                blackboard.def = 0;
            }
            break;
        case "skchr_sora_2":
            blackboard.atk = 0; // 不增加本体攻击
            blackboard.def = 0;
            break;
        case "skchr_nightm_1":
            writeBuff(`治疗目标数 ${blackboard["attack@max_target"]}`);  
            delete blackboard["attack@max_target"];
            break;
        // 可变类
        case "skchr_huang_3": // 可变攻击力技能，计算每段攻击力表格以和其他buff叠加
            buffFrame.maxTarget = 999;
            buffFrame.atk_table = [...Array(8).keys()].map(x => blackboard.atk / 8 *(x+1));
            writeBuff(`技能攻击力系数: ${buffFrame.atk_table.map(x => x.toFixed(2))}`);
            break;
        case "skchr_phatom_2":
            buffFrame.atk_table = [...Array(blackboard.times).keys()].reverse().map(x => blackboard.atk * (x+1));
            writeBuff(`技能攻击力系数: ${buffFrame.atk_table.map(x => x.toFixed(2))}`);
            delete blackboard.times;
            break;
    }

    if (!done) applyBuffDefault(state, buffFrame, buffKey, blackboard);
    buffFrame.applied[buffKey] = true;
    return buffFrame;
}

function calcDurations(state, currBuffFrame) {
    var blackboard = state.char.blackboard;
    var skillId = state.char.skillId;
    var spData = state.char.levelData.spData;
    var duration = 0, attackCount = 0, stunDuration = 0; startSp = 0;

}

AKDATA.Dps = {
    Log,
    DpsState,
};