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

        this.txt.string = data.label;
    },

    onBtnClick: function () {
        this._callback && this._callback(this._data);
    }
});
