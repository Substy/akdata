AKDATA.Dps.GeneralActions = {

};

AKDATA.Dps.Actions = {
    "tachr_185_frncat_1": {
        "applyBuff": function () {
            this.buffFrame.times = 1 + this.blackboard.prob;
            this.writeBuff(`攻击次数 x ${this.buffFrame.times}`);
            this.args.done = true;
        },
        "rotation": null,
        "extradamage": null
    }
};