

cc.Class({
    extends: cc.Component,

    properties: {
        list: require("cocos_list_ctrl"),

    },

    onLoad: function () {
        var datas = [];

        for (var i = 0; i < 1000; i++) {
            datas.push({
                label: "label" + i,
            });
        }

        this.list.setItemInitParams(this._onListItemClicked.bind(this));

        this.list.setDataProvider(datas);
    },

    _onListItemClicked: function (itemData) {
        console.log(itemData);
    }
});
