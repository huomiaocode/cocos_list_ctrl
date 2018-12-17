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

        canRegisterEvent: false,
        
        itemClickEvents: {
            default: [],
            type: cc.Component.EventHandler,
        },

        topY: 0,
    },

    onLoad: function () {
        this._isLoaded = true;
        if(this.canRegisterEvent){
            this.scrollView.node.on("scrolling",this._onScrolling,this);
            this.scrollView.node.on("scroll-ended",this._onScrollEnded,this);
            this.scrollView.node.on(cc.Node.EventType.TOUCH_START, this._onTouchBegan, this);
            this.scrollView.node.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMoved, this);
            this.scrollView.node.on(cc.Node.EventType.TOUCH_END, this._onTouchEnded, this);
        }

        this._lastContentPosX = 0;
        this._lastContentPosY = 0;
        this._itemInfo = { width: 0, height: 0, anchorX: 0.5, anchorY: 0.5 };
        this._itemObjs = [];
        this._itemAllCreated = false;
        this._itemPools = new cc.NodePool(this.itemComponentName);

        this.updateView();
    },
    _onTouchBegan: function(){
    },
    _onTouchMoved: function(){
    },

    _onTouchEnded: function(){
        this.scrollView.stopAutoScroll();
        this._onScrollEnded();
    },
    onDestroy: function () {
        this._itemObjs.length = 0;
        this._itemAllCreated = false;
        this._itemPools.clear();

        if(this.canRegisterEvent){
            this.scrollView.node.off("scrolling",this._onScrolling,this);
            this.scrollView.node.off("scroll-ended",this._onScrollEnded,this);
            this.scrollView.node.off(cc.Node.EventType.TOUCH_START, this._onTouchBegan, this);
            this.scrollView.node.off(cc.Node.EventType.TOUCH_MOVE, this._onTouchMoved, this);
            this.scrollView.node.off(cc.Node.EventType.TOUCH_END, this._onTouchEnded, this);
        }

    },
    _onScrollEnded: function(){
        this.scrollView.stopAutoScroll();
        let contentNode   = this.scrollView.content;
        let parentHeight  =  contentNode.parent.height;
        let offset = this.scrollView.getScrollOffset();
        let indexY       = this.getIndexYInView();
        if(indexY != -1){
            let viewNode     = contentNode.children[indexY];
            let convertPos   = contentNode.convertToNodeSpace(cc.v2(0,-viewNode.y));
            let pos1 = -(viewNode.y) - offset.y;
            let stableY        = parentHeight / 2;
            if(pos1 > stableY){
                let finalPosY = offset.y + (pos1 - stableY);
               this.scrollView.scrollToOffset(cc.v2(0,finalPosY),0);
            }else if(pos1 < stableY){
                let finalPosY = offset.y - (stableY - pos1);
               this.scrollView.scrollToOffset(cc.v2(0,finalPosY),0);
            }
            let com = viewNode.getComponent(this.itemComponentName);
            if(com && com.updateItemEffect){
                com.updateItemEffect(1.2);
            }
        }
    },
    _onScrolling: function(){
        let contentNode   = this.scrollView.content;
        let parentHeight  =  contentNode.parent.height;
        let offset = this.scrollView.getScrollOffset();
        let indexY       = this.getIndexYInView();
        if(indexY != -1){
            let viewNode     = contentNode.children[indexY];
            let pos1         = -(viewNode.y) - offset.y;
            let stableY      = parentHeight / 2;
            let children     = this.scrollView.content.children;
            let maxGapY      = viewNode.height/2;
            children.forEach(function(node,idx){
                let com = node.getComponent(this.itemComponentName);
                if(com && com.updateItemEffect){
                    if(indexY == idx){
                        let dis = Math.abs(pos1 - stableY);
                        let scale = (maxGapY - dis ) / maxGapY * 0.2 + 1;
                        com.updateItemEffect(scale);
                    }else{
                        com.updateItemEffect(0.75);
                    }
                }
            }.bind(this));
        }
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
        let lastPos = this.scrollView.content.getPosition();
        
        this._datas = datas;
        this.updateView();
        
        if (keepPos) {
            let maxScrollOffset = this.scrollView.getMaxScrollOffset();
            if (this.isHorizontal) {
                if (lastPos.x > maxScrollOffset.x) lastPos.x = maxScrollOffset.x;
                this.scrollView.content.x = lastPos.x;
            }
            else {
                if (lastPos.y > maxScrollOffset.y) lastPos.y = maxScrollOffset.y;
                this.scrollView.content.y = lastPos.y;
            }
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
        if(!this.isHorizontal && this.topY != 0){
            this.topY = (this.scrollView.content.parent.height - this._itemInfo.height) / 2;
        }
        if (this.isHorizontal) {
            if (this.autoRowCount) {
                this.rowCount = Math.floor(this.scrollView.content.parent.height / this._itemInfo.height);
            }
            if (this.rowCount < 1) this.rowCount = 1;

            shownCount = this.rowCount * (Math.ceil(this.scrollView.content.parent.width / this._itemInfo.width) + 1);
            maxRowColSize = this.rowCount * (this._itemInfo.height + this.gapV) - this.gapV;
            this.scrollView.content.width = Math.ceil(dataLen / this.rowCount) * (this._itemInfo.width + this.gapH) + this.gapH;
        }
        else {
            if (this.autoColumnCount) {
                this.columnCount = Math.floor(this.scrollView.content.parent.width / this._itemInfo.width);
            }
            if (this.columnCount < 1) this.columnCount = 1;

            shownCount = this.columnCount * (Math.ceil(this.scrollView.content.parent.height / this._itemInfo.height) + 1);

            maxRowColSize = this.columnCount * (this._itemInfo.width + this.gapH) - this.gapH;
            this.scrollView.content.height = Math.ceil(dataLen / this.columnCount) * (this._itemInfo.height + this.gapV) + this.gapV + 2 * this.topY;
        }

        // add item
        for (let i = 0; i < shownCount && i < dataLen; ++i) {
            let itemObj = i === 0 ? oneItemObj : getOneItemObj(false);
            itemObj.index = i;
            this._itemObjs.push(itemObj);

            if (this.isHorizontal) {
                let _row = i % this.rowCount;
                let _toY = _row * (this._itemInfo.height + this.gapV) + (this._itemInfo.anchorY) * this._itemInfo.height - this.scrollView.content.height * this.scrollView.content.anchorY;
                itemObj.y = -_toY - (this.scrollView.content.height - maxRowColSize) / 2;
                itemObj.x = Math.floor(i / this.rowCount) * (this._itemInfo.width + this.gapH) + this.gapH + (1 - this._itemInfo.anchorX) * this._itemInfo.width;
            }
            else {
                let _col = i % this.columnCount;
                let _toX = _col * (this._itemInfo.width + this.gapH) + (this._itemInfo.anchorX) * this._itemInfo.width - this.scrollView.content.width * this.scrollView.content.anchorX;
                itemObj.x = _toX + (this.scrollView.content.width - maxRowColSize) / 2;

                itemObj.y = - Math.floor(i / this.columnCount) * (this._itemInfo.height + this.gapV) - this.gapV - (1 - this._itemInfo.anchorY) * this._itemInfo.height - this.topY;
            }
            itemObj.active = i < dataLen;

            this._initItem(itemObj);
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
            return itemObj.index == index;
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
        let worldPos = this.scrollView.content.convertToWorldSpaceAR(cc.p(itemObj.x, itemObj.y));
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

        this._minXInScrollNode = -this.scrollView.node.width * this.scrollView.node.anchorX;
        this._maxXInScrollNode = this.scrollView.node.width + this._minXInScrollNode;
        this._minYInScrollNode = -this.scrollView.node.height * this.scrollView.node.anchorY;
        this._maxYInScrollNode = this.scrollView.node.height + this._minYInScrollNode;

        if (this.isHorizontal) {
            let isRight = this.scrollView.content.x > this._lastContentPosX;
            let itemLen = this._itemObjs.length;
            let itemOneWidth = this._itemInfo.width + this.gapH;
            let itemAllWidth = itemOneWidth * Math.ceil(itemLen / this.rowCount);
            for (let i = 0; i < itemLen; ++i) {
                let itemObj = this._itemObjs[i];
                let viewPos = this._getItemPositionInScroll(itemObj);
                if (isRight) {
                    if (viewPos.x - this._itemInfo.width * this._itemInfo.anchorX > this._maxXInScrollNode && itemObj.x - itemAllWidth > 0) {
                        itemObj.x = itemObj.x - itemAllWidth;
                        itemObj.index -= itemLen;
                        itemObj.active = true;
                    }
                } else {
                    if (viewPos.x + this._itemInfo.width * this._itemInfo.anchorX < this._minXInScrollNode && itemObj.x + itemAllWidth <= this.scrollView.content.width) {
                        itemObj.x = itemObj.x + itemAllWidth
                        itemObj.index += itemLen;
                        itemObj.active = itemObj.index < dataLen;
                    }
                }

                if (itemObj.item) {
                    itemObj.item.x = itemObj.x;
                    itemObj.item.active = itemObj.active;
                    if (itemObj.active) this.updateItem(itemObj.item, itemObj.index);
                }
            }
        }
        else {
            let isDown = this.scrollView.content.y < this._lastContentPosY;
            let itemLen = this._itemObjs.length;
            let itemOneHeight = this._itemInfo.height + this.gapV;
            let itemAllHeight = itemOneHeight * Math.ceil(itemLen / this.columnCount);
            for (let i = 0; i < itemLen; ++i) {
                let itemObj = this._itemObjs[i];
                let viewPos = this._getItemPositionInScroll(itemObj);
                if (isDown) {
                    if (viewPos.y + this._itemInfo.height * this._itemInfo.anchorY < this._minYInScrollNode && itemObj.y + itemAllHeight < 0) {
                        itemObj.y = itemObj.y + itemAllHeight;
                        itemObj.index -= itemLen;
                        itemObj.active = true;
                    }
                } else {
                    if (viewPos.y - this._itemInfo.height * this._itemInfo.anchorY > this._maxYInScrollNode && itemObj.y - itemAllHeight >= -this.scrollView.content.height) {
                        itemObj.y = itemObj.y - itemAllHeight;
                        itemObj.index += itemLen;
                        itemObj.active = itemObj.index < dataLen;
                    }
                }

                if (itemObj.item) {
                    itemObj.item.y = itemObj.y;
                    itemObj.item.active = itemObj.active;
                    if (itemObj.active) this.updateItem(itemObj.item, itemObj.index);
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
    /*
    获取当前视图范围内的节点索引
    */
    getIndexYInView: function(){
        let contentNode = this.scrollView.content;
        let parentNode  = contentNode.parent;        
        let posY        = parentNode.height /2 - parentNode.height * parentNode.anchorY - contentNode.y;
        let index       = -1;
        this.scrollView.content.children.some(function(node,idx){
            let y1 = node.y - node.height * node.anchorY;
            let y2 = y1  + node.height;
            if(posY >= y1 && posY <= y2){
                 index = idx;
                 return true;
            }
        });
        return index;
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
