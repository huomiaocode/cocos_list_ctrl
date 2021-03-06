cc.Class({
    extends: cc.Component,

    properties: {
        list1: require("cocos_list_ctrl"),
        list2: require("cocos_list_ctrl"),

    },

    onLoad: function () {
        var datas = [];

        window.list1 = this.list1;
        window.list2 = this.list2;

        for (var i = 0; i < 120; i++) {
            datas.push({
                label: "label  " + i,
            });
        }

        this.list1.setItemInitParams(this._onListItemClicked.bind(this));
        this.list1.setDataProvider(datas);

        this.list2.setItemInitParams(this._onListItemClicked.bind(this));
        this.list2.setDataProvider(datas);
    },

    _onListItemClicked: function (itemData) {
        console.log(itemData);
    },

    addList1Data: function () {
        var datas = this.list1.getDataProvider()
        datas.push({
            label: "aaaaa"
        });
        this.list1.setDataProvider(datas, true);
        this.list1.scrollToEnd();
    },

    addList2Data: function () {
        var datas = this.list2.getDataProvider()
        datas.push({
            label: "aaaaa"
        });
        this.list2.setDataProvider(datas, true);
        this.list2.scrollToEnd();
    }
});