cc.Class({
    extends: cc.Component,

    properties: {
        txt: cc.Label,
    },

    init: function (callback) {
        this._callback = callback;
    },

    updateItem: function (data, index) {
        if (!data) return;

        this._data = data;
        this._index = index;

        if (!data.label2) data.label2 = data.label// + (Math.random()>0.5?"  123":"");

        this.txt.string = data.label2;// + (Math.random()>0.5?"\n123":"");
    },

    onBtnClick: function () {
        this._callback && this._callback(this._data);
    }
});
