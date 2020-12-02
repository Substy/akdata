var GeneralActions = {};

var Actions = {
  tachr_185_frncat_1: {
    applyBuff: function (attr, blackboard) {
      attr.buffFrame.times = 1 + blackboard.prob;
      this.writeBuff(`攻击次数 x ${attr.buffFrame.times}`);
      return { done: true };
    },
  },
};

export { GeneralActions, Actions };
