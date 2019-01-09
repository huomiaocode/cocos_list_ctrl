cc.Class({
    extends: cc.Component,

    // Renderer need has function updateItem(data, index)
    properties: {
        itemRenderer: {
            default: null,
            type: cc.Prefab
        },
        itemNode: {
            default: null,
            type: cc.Node
        },
        itemComponentName: "",

        scrollView: cc.ScrollView,

        gapV: 0,
        gapH: 0,
        columnCount: 1,
        rowCount: 1,
        autoColumnCount: true,
        autoRowCount: true,

        isHorizontal: false,

        enableItemClick: false,
        itemDelayCreate: false,

        itemClickEvents: {
            default: [],
            type: cc.Component.EventHandler,
        },
    },

    onLoad: function () {
        this._isLoaded = true;

        this._lastContentPosX = 0;
        this._lastContentPosY = 0;
        this._itemInfo = { width: 0, height: 0, anchorX: 0.5, anchorY: 0.5 };
        this._itemObjs = [];
        this._allItemInfos = [];
        this._itemAllCreated = false;
        this._itemPools = new cc.NodePool(this.itemComponentName);

        this._scrollViewBox = new cc.Rect(
            -this.scrollView.node.anchorX * this.scrollView.node.width,
            -this.scrollView.node.anchorY * this.scrollView.node.height,
            this.scrollView.node.width,
            this.scrollView.node.height,
        );
        this._tempItemPos = new cc.Vec2();
        this._tempItemBox = new cc.Rect();

        this.updateView();
    },

    onDestroy: function () {
        this._itemObjs.length = 0;
        this._allItemInfos.length = 0;
        this._itemAllCreated = false;
        this._itemPools.clear();
    },

    /**
     * 清除所有的itemRenderer
     */
    setClearRenderers: function (value) {
        this._clearRenderers = value ? true : false;
    },

    /**
     * 设置数据
     */
    setDataProvider: function (datas, keepPos) {
        let sOffset = this.scrollView.getScrollOffset();

        this._datas = datas;
        this.updateView();

        if (keepPos) {
            if (this.isHorizontal) sOffset.x = Math.abs(sOffset.x);
            this.scrollView.scrollToOffset(sOffset);
        }
    },

    /**
     * 获取数据
     */
    getDataProvider: function () {
        return this._datas;
    },

    /**
     * 设置itemRenderer的初始化参数，itemRenderer需要有init方法
     */
    setItemInitParams: function () {
        let args = [];
        for (let i = 0; i < arguments.length; i++) args.push(arguments[i]);

        this._itemInitParams = args;
    },

    /**
     * 清除itemRenderer的初始化参数
     */
    clearItemInitParams: function () {
        this._itemInitParams = null;
    },

    /**
     * 刷新视图，滚动条位置复位。
     */
    updateView: function () {
        if (!this._datas || !this._itemObjs || !this._itemPools) return;

        this.scrollView.stopAutoScroll();

        // recyle
        let children = this.scrollView.content.children.slice();
        children.reverse();

        let self = this;
        let getOneItemObj = function (needCreate) {
            let node = children.pop();
            if (node) {
                return { item: node, x: 0, y: 0, index: 0, active: false };
            }
            else {
                return self._getItemObj(needCreate);
            }
        }
        let recyleRemainItems = function () {
            children.forEach(self._recyleItem.bind(self));
        }

        if (this._clearRenderers) {
            this._itemPools.clear();
            this._clearRenderers = false;
        }

        this._itemObjs.length = 0;
        this._allItemInfos.length = 0;
        this._itemAllCreated = false;

        if (this.isHorizontal) {
            this.scrollView.content.width = 0;
            this._lastContentPosX = 0;
        }
        else {
            this.scrollView.content.height = 0;
            this._lastContentPosY = 0;
        }

        let dataLen = this._datas.length;
        if (dataLen === 0) {
            recyleRemainItems();
            return;
        }

        let oneItemObj = getOneItemObj(true);
        if (!oneItemObj || !oneItemObj.item) {
            recyleRemainItems();
            return;
        }

        this._itemInfo = {
            width: oneItemObj.item.width,
            height: oneItemObj.item.height,
            anchorX: oneItemObj.item.anchorX,
            anchorY: oneItemObj.item.anchorY,
        };

        let shownCount = 0;
        let maxRowColSize = 0;

        if (this.isHorizontal) {
            this.scrollView.content.anchorX = 0;
            this.scrollView.content.anchorY = 0.5;
            this.scrollView.content.y = 0;

            if (this.autoRowCount) {
                this.rowCount = Math.floor(this.scrollView.content.parent.height / this._itemInfo.height);
            }
            if (this.rowCount < 1) this.rowCount = 1;

            shownCount = this.rowCount * (Math.ceil(this.scrollView.content.parent.width / this._itemInfo.width) + 1);
            maxRowColSize = this.rowCount * (this._itemInfo.height + this.gapV) - this.gapV;
            this.scrollView.content.width = Math.ceil(dataLen / this.rowCount) * (this._itemInfo.width + this.gapH) + this.gapH;
        }
        else {
            this.scrollView.content.anchorX = 0.5;
            this.scrollView.content.anchorY = 1;
            this.scrollView.content.x = 0;

            if (this.autoColumnCount) {
                this.columnCount = Math.floor(this.scrollView.content.parent.width / this._itemInfo.width);
            }
            if (this.columnCount < 1) this.columnCount = 1;

            shownCount = this.columnCount * (Math.ceil(this.scrollView.content.parent.height / this._itemInfo.height) + 1);

            maxRowColSize = this.columnCount * (this._itemInfo.width + this.gapH) - this.gapH;
            this.scrollView.content.height = Math.ceil(dataLen / this.columnCount) * (this._itemInfo.height + this.gapV) + this.gapV + 2;
        }

        // add item
        var x = 0;
        var y = 0;
        for (let i = 0; i < dataLen; ++i) {
            if (this.isHorizontal) {
                let _row = i % this.rowCount;
                let _toY = _row * (this._itemInfo.height + this.gapV) + (this._itemInfo.anchorY) * this._itemInfo.height - this.scrollView.content.height * this.scrollView.content.anchorY;
                y = -_toY - (this.scrollView.content.height - maxRowColSize) / 2;
                x = Math.floor(i / this.rowCount) * (this._itemInfo.width + this.gapH) + this.gapH + (1 - this._itemInfo.anchorX) * this._itemInfo.width;
            }
            else {
                let _col = i % this.columnCount;
                let _toX = _col * (this._itemInfo.width + this.gapH) + (this._itemInfo.anchorX) * this._itemInfo.width - this.scrollView.content.width * this.scrollView.content.anchorX;
                x = _toX + (this.scrollView.content.width - maxRowColSize) / 2;
                y = - Math.floor(i / this.columnCount) * (this._itemInfo.height + this.gapV) - this.gapV - (1 - this._itemInfo.anchorY) * this._itemInfo.height;
            }

            if (i < shownCount) {
                let itemObj = i === 0 ? oneItemObj : getOneItemObj(false);
                this._itemObjs.push(itemObj);

                itemObj.index = i;
                itemObj.x = x;
                itemObj.y = y;
                itemObj.active = i < dataLen;

                this._initItem(itemObj);
            }

            this._allItemInfos.push({ index: i, x: x, y: y, width: this._itemInfo.width, height: this._itemInfo.height });
        }

        this._createItems();
        recyleRemainItems();
    },

    /**
     * 根据索引更新某些列表项
     */
    updateItems: function (indexArr) {
        let self = this;
        this._itemObjs.forEach(function (itemObj) {
            if (indexArr.indexOf(itemObj.index) != -1) {
                self.updateItem(itemObj.item, itemObj.index);
            }
        });
    },

    /**
     * 更新所有的列表项
     */
    updateAllItems: function () {
        let self = this;
        this._itemObjs.forEach(function (itemObj) {
            self.updateItem(itemObj.item, itemObj.index);
        });
    },

    /**
     * 判断index是否可见
     */
    isVisible: function (index) {
        return this._itemObjs.some(function (itemObj) {
            return itemObj.index == index && itemObj.active;
        });
    },

    _getItemObj: function (needCreate) {
        let item = this._itemPools.get();
        if (!item) {
            if (needCreate) {
                item = this._createItem();
            }
        }
        else {
            if (this.enableItemClick) {
                item.on("touchend", this._onItemClick, this);
            }
        }

        return { item: item, x: 0, y: 0, index: 0, active: false };
    },

    _recyleItem: function (item) {
        if (cc.isValid(item)) {
            if (this.enableItemClick) {
                item.off("touchend", this._onItemClick, this);
            }
            this._itemPools.put(item);
        }
    },

    _setItemInit: function (item) {
        if (!item) return;
        if (!this._itemInitParams) return;

        let comp = null;
        if (this.itemComponentName) comp = item.getComponent(this.itemComponentName);

        if (comp) {
            if (comp.init) comp.init.apply(comp, this._itemInitParams);
        }
    },

    updateItem: function (item, index) {
        if (!item) return;

        let comp = null;
        if (this.itemComponentName) comp = item.getComponent(this.itemComponentName);

        if (comp) {
            if (comp.updateItem) comp.updateItem(this._datas[index], index);
        }
    },

    _getItemPositionInScroll: function (itemObj) {
        let worldPos = this.scrollView.content.convertToWorldSpaceAR(new cc.Vec2(itemObj.x, itemObj.y));
        let viewPos = this.scrollView.node.convertToNodeSpaceAR(worldPos);
        return viewPos;
    },

    _onItemClick: function (event) {
        let item = event.target;
        let itemObj = null;
        this._itemObjs.some(function (obj) {
            if (obj.item == item) {
                itemObj = obj;
                return true;
            }
            return false;
        });

        if (!itemObj) return;

        this.itemClickEvents.forEach(function (handler) {
            handler.emit([this._datas[itemObj.index], itemObj.index, itemObj.item]);
        }.bind(this));
    },

    _createItems: function () {
        if (!this.itemDelayCreate) {
            for (let i = 0; i < this._itemObjs.length; i++) {
                let itemObj = this._itemObjs[i];
                if (!itemObj.item) {
                    itemObj.item = this._createItem();
                    this._initItem(itemObj);
                }
            }
            this._itemAllCreated = true;
        }
    },

    _createNextItem: function () {
        let allIsCreated = true;
        for (let i = 0; i < this._itemObjs.length; i++) {
            let itemObj = this._itemObjs[i];
            if (!itemObj.item) {
                allIsCreated = false;
                itemObj.item = this._createItem();
                this._initItem(itemObj);
                break;
            }
        }
        this._itemAllCreated = allIsCreated;
    },

    _createItem: function () {
        let item = null;

        if (this.itemRenderer) item = cc.instantiate(this.itemRenderer);
        else if (this.itemNode) item = cc.instantiate(this.itemNode);

        if (item) {
            if (this.enableItemClick) {
                item.on("touchend", this._onItemClick, this);
            }
        }

        return item;
    },

    _initItem: function (itemObj) {
        if (!itemObj || !itemObj.item) return;

        itemObj.item.x = itemObj.x;
        itemObj.item.y = itemObj.y;
        itemObj.item.active = itemObj.active;
        if (!itemObj.item.parent) this.scrollView.content.addChild(itemObj.item);
        if (this._itemInitParams) this._setItemInit(itemObj.item);
        this.updateItem(itemObj.item, itemObj.index);
    },

    update: function (dt) {
        if (!this._isLoaded) return;

        if (!this._itemAllCreated) {
            this._createNextItem();
        }

        if (this.isHorizontal) {
            if (this.scrollView.content.x == this._lastContentPosX) return;
        }
        else {
            if (this.scrollView.content.y == this._lastContentPosY) return;
        }

        if (!this._datas) return;
        let dataLen = this._datas.length;
        if (dataLen == 0) return;

        var unshowItemObjs = this._itemObjs.slice();
        var needShowItems = [];
        for (var i = 0; i < this._allItemInfos.length; i++) {
            var itemInfoI = this._allItemInfos[i];
            this._tempItemBox.x = itemInfoI.x - this._itemInfo.anchorX * itemInfoI.width;
            this._tempItemBox.y = itemInfoI.y - this._itemInfo.anchorY * itemInfoI.height;
            this._tempItemBox.width = itemInfoI.width;
            this._tempItemBox.height = itemInfoI.height;

            this._tempItemPos.x = this._tempItemBox.x;
            this._tempItemPos.y = this._tempItemBox.y;
            this._tempItemPos = this.scrollView.content.convertToWorldSpaceAR(this._tempItemPos);
            this._tempItemPos = this.scrollView.node.convertToNodeSpaceAR(this._tempItemPos);
            this._tempItemBox.x = this._tempItemPos.x;
            this._tempItemBox.y = this._tempItemPos.y;

            if (this._scrollViewBox.intersects(this._tempItemBox)) {
                var findIt = false;
                for (var j = 0; j < unshowItemObjs.length; j++) {
                    if (unshowItemObjs[j].index == itemInfoI.index && unshowItemObjs[j].active) {
                        unshowItemObjs.splice(j, 1);
                        findIt = true;
                        break;
                    }
                }
                if (!findIt) {
                    needShowItems.push(itemInfoI);
                }
            }
        }

        for (var i = 0; i < needShowItems.length; i++) {
            var itemObj = unshowItemObjs[i];
            var showItemInfo = needShowItems[i];
            if (itemObj) {
                itemObj.index = showItemInfo.index;
                itemObj.x = showItemInfo.x;
                itemObj.y = showItemInfo.y;
                itemObj.active = true;
                if (itemObj.item) {
                    itemObj.item.x = itemObj.x;
                    itemObj.item.y = itemObj.y;
                    itemObj.item.active = true;
                }
                this.updateItem(itemObj.item, itemObj.index);
            }
        }
        for (var i = needShowItems.length; i < unshowItemObjs.length; i++) {
            var itemObj = unshowItemObjs[i];
            if (itemObj) {
                itemObj.active = false;
                if (itemObj.item) {
                    itemObj.item.active = false;
                }
            }
        }

        // update _lastContentPos
        if (this.isHorizontal) {
            this._lastContentPosX = this.scrollView.content.x;
        }
        else {
            this._lastContentPosY = this.scrollView.content.y;
        }
    },

    scrollEvent: function (sender, event) {
        switch (event) {
            case 0: 	// "Scroll to Top"
                break;
            case 1: 	// "Scroll to Bottom"; 
                break;
            case 2: 	// "Scroll to Left"; 
                break;
            case 3: 	// "Scroll to Right"; 
                break;
            case 4: 	// "Scrolling"; 
                break;
            case 5: 	// "Bounce Top"; 
                break;
            case 6: 	// "Bounce bottom";
                break;
            case 7: 	// "Bounce left";
                break;
            case 8: 	// "Bounce right";
                break;
            case 9: 	// "Auto scroll ended";
                break;
        }
    },
});
