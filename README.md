# cocos_list_ctrl

可以在 CocosCreator 项目上用的列表组件，支持各项复用，水平列表，垂直列表。

## npm安装
```
npm install cocos_list_ctrl
```

## 使用方法
* 设置 ScrollView
> 打开某个 scene 或 prefab，找到 ScrollViev 组件（没有的话，从控件面板拖一个到界面上），缩放到合适的大小，添加组件 cocos_list_ctrl，将 ScrollViev 组件的 node 拖到 cocos_list_ctrl 的 scrollView 属性上。（也可以设置其他属性，水平或垂直，间距等）
* 设置 renderer
> 新建 prefab，用作列表的 renderer 项，并绑定脚本（自定义），绑定什么脚本无要求，需要脚本里提供几个方法：updateItem(data, index)必选，init()可选，unuse()可选，reuse()可选。将这个 prefab 拖到 cocos_list_ctrl 的 itemRenderer 属性上。（renderer除了可以设置成prefab外，也可以设置成node）
* 设置 data
> 调用该组件的 setDataProvider 方法即可，传递一个数组进去。

## demo 
> 参考demo工程cocos_list_ctrl_demo