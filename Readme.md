# Virtual Dom diff 算法

* [Virtual Dom diff 算法](#Virtual Dom diff 算法)
    * [预习](#预习)
    * [浏览器渲染](#浏览器渲染)
    * [背景](#背景)
    * [dom对象和原生js对象](dom对象和原生js对象)
    * [diff算法](#diff算法)


## 预习

书接上文，上次我们成功实现了`reactjs`的组件的开发与应用，但我们还是没有触及`reactjs`核心的东西，今天我们来一起探索下`reactjs`核心之一，`virtual dom`原理。

## 浏览器渲染

要了解virtual之前，我们需要了解浏览器是如何渲染dom的。推荐阅读[链接](https://coolshell.cn/articles/9666.html)

渲染的流程基本上如下：
1. 计算`CSS`样式
2. 构建`Render Tree`
3. `Layout` – 定位坐标和大小，是否换行，各种`position`, `overflow`, `z-index`属性 ……
4. 正式开画
![](https://coolshell.cn/wp-content/uploads/2013/05/Render-Process-Skipping.jpg)

上图流程中有很多连接线，这表示了Javascript动态修改了DOM属性或是`CSS`属会导致重新`Layout`，有些改变不会，就是那些指到天上的箭头，比如，修改后的`CSS rule`没有被匹配到，等。

* 重绘(`Repaint`): 屏幕的一部分要重画，比如某个CSS的背景色变了。但是元素的几何尺寸没有变。
* 重排(`Reflow`): 意味着元件的几何尺寸变了，我们需要重新验证并计算`Render Tree`。是`Render Tree`的一部分或全部发生了变化。这就是`Reflow`，或是`Layout`。（`HTML`使用的是`flow based layout`，也就是流式布局，所以，如果某元件的几何尺寸发生了变化，需要重新布局，也就叫`reflow`）`reflow` 会从<html>这个`root frame`开始递归往下，依次计算所有的结点几何尺寸和位置，在`reflow`过程中，可能会增加一些`frame`，比如一个文本字符串必需被包装起来。


*注意：`Reflow`的成本比`Repaint`的成本高得多的多*

所以，下面这些动作有很大可能会是成本比较高的。
* 当你增加、删除、修改DOM结点时，会导致`Reflow`或`Repaint`
* 当你移动`DOM`的位置，或是搞个动画的时候。
* 当你修改`CSS`样式的时候。
* 当你`Resize`窗口的时候（移动端没有这个问题），或是滚动的时候。
* 当你修改网页的默认字体时。

注：`display:none`会触发`reflow`，而`visibility:hidden`只会触发`repaint`，因为没有发现位置变化。

那如何减少重绘或者重排呢？
* 不要一条一条地修改DOM的样式。与其这样，还不如预先定义好`css`的`class`，然后修改`DOM`的`className`。
* 把`DOM`离线后修改。
    * 使用`documentFragment` 对象在内存里操作DOM
    * 先把`DOM`给`display:none`(有一次`reflow`)，然后你想怎么改就怎么改。比如修改100次，然后再把他显示出来。
    * `clone`一个`DOM`结点到内存里，然后想怎么改就怎么改，改完后，和在线的那个的交换一下。
* 不要把`DOM`结点的属性值放在一个循环里当成循环里的变量。
* 尽可能的修改层级比较低的DOM。
* 为动画的`HTML`元件使用`fixed`或`absoult`的`position`，那么修改他们的CSS是不会reflow的。
* 千万不要使用`table`布局。因为可能很小的一个小改动会造成整个`table`的重新布局。

上面所说的是一些关于浏览器渲染的基本原理。

## 背景

回想当年，随着应用程序越来越复杂，需要在`JS`里面维护页面状态字段越来越多，需要监听事件和在事件回调用更新页面的`DOM`操作也越来越多，应用程序会变得非常难维护。因此`MVC`、`MVP` 的架构出现了，收获了大批信徒，但是这些架构没办法减少你所维护的状态，也没有降低状态更新你需要对页面的更新操作。
所以人们为了让视图和状态进行绑定，状态变更了视图自动变更，不用手动更新页面。就想出了 MVVM 模式。关于`MVVM`、`MVC`、`MVP`，可以[点击](https://github.com/livoras/blog/issues/11)。

MVVM的出现，确实解决了人们的难题，但是随之产生了另一个问题：即使一个小小的状态变更都要重新构造整棵 `DOM`，性价比太低，并且`input` 和 `textarea` 的会失去原有的焦点。所以：对于局部的小视图的更新，没有问题，但是对于大型视图，如全局应用状态变更的时候，需要更新页面较多局部视图的时候，这样的做法不可取。

有没有一种感觉，前端开发其实就是：维护状态，更新视图。

## dom对象和原生js对象

```
let div = document.createElement('div');
let str = '';
for(let key in div){
    str += (key + " ");
}
```
打开 `Chrome` ，输入上述代码，看看有多少属性打印出来，
而这仅仅是第一层。真正的 `DOM` 元素非常庞大，这是因为标准就是这么设计的。而且操作它们的时候你要小心翼翼，轻微的触碰可能就会导致页面重排，这可是杀死性能的罪魁祸首。

但是相对于 `DOM` 对象，原生的 `JavaScript` 对象处理起来又快又简单，最主要的，js对象可以标示出DOM 树上的结构、属性等信息。

```
var element = {
  tagName: 'ul', // 节点标签名
  props: { // DOM的属性，用一个对象存储键值对
    id: 'list'
  },
  children: [ // 该节点的子节点
    {tagName: 'li', props: {class: 'item'}, children: ["Item 1"]},
    {tagName: 'li', props: {class: 'item'}, children: ["Item 2"]},
    {tagName: 'li', props: {class: 'item'}, children: ["Item 3"]},
  ]
}
```
```
<ul id='list'>
  <li class='item'>Item 1</li>
  <li class='item'>Item 2</li>
  <li class='item'>Item 3</li>
</ul>
```

既然如此，我们完全可以用js对象构建出一颗真正的 `DOM` 树。

所以状态变更->重新渲染整个视图的方式可以稍微修改一下：用 `JavaScript` 对象表示 `DOM` 信息和结构，当状态变更的时候，重新渲染这个 `JavaScript` 的对象结构。当然这样做其实没什么卵用，因为真正的页面其实没有改变。

但是可以用新渲染的对象树去和旧的树进行对比，记录这两棵树差异。记录下来的不同就是我们需要对页面真正的 `DOM` 操作，然后把它们应用在真正的 `DOM` 树上，页面就变更了。这样就可以做到：视图的结构确实是整个全新渲染了，但是最后操作DOM的时候确实只变更有不同的地方。

这就是所谓的 `Virtual DOM` 算法。包括步骤：

1. 用 `JavaScript` 对象结构表示 DOM 树的结构；然后用这个树构建一个真正的 `DOM` 树，插到文档当中。
2. 当状态变更的时候，重新构造一棵新的对象树。然后用新的树和旧的树进行比较，记录两棵树差异。
3. 把2所记录的差异应用到步骤1所构建的真正的 `DOM ` 树上，视图就更新了。

其实：`Virtual DOM` 本质上就是在 `JS` 和 `DOM` 之间做了一个缓存。

## diff算法

传统 `diff` 算法通过循环递归对节点进行依次对比，效率低下，算法复杂度达到 `O(n^3)`，其中 `n` 是树中节点的总数。这意味着如果要展示`1000`个节点，就要依次执行上十亿次的比较。
因此 diff算法必然需要优化改进。

剧透：`react diff` 复杂度只有`O(n)`。

### diff策略
1. `Web UI` 中 `DOM` 节点跨层级的移动操作特别少，可以忽略不计。
2. 拥有相同类的两个组件将会生成相似的树形结构，拥有不同类的两个组件将会生成不同的树形结构。
3. 对于同一层级的一组子节点，它们可以通过唯一 id 进行区分。

基于上面的策略，`ract`分别对 `tree diff`、`component diff` 以及 `element diff` 进行算法优化。

#### tree diff

既然 `DOM` 节点跨层级的移动操作少到可以忽略不计，针对这一现象，`React` 通过 `updateDepth` 对 `Virtual DOM` 树进行层级控制，只会对相同颜色方框内的 `DOM` 节点进行比较，即同一个父节点下的所有子节点。当发现节点已经不存在，则该节点及其子节点会被完全删除掉，不会用于进一步的比较。这样只需要对树进行一次遍历，便能完成整个 `DOM` 树的比较。
![](https://pic3.zhimg.com/80/0c08dbb6b1e0745780de4d208ad51d34_hd.jpg)
```
updateChildren: function(nextNestedChildrenElements, transaction, context) {
  updateDepth++;
  var errorThrown = true;
  try {
    this._updateChildren(nextNestedChildrenElements, transaction, context);
    errorThrown = false;
  } finally {
    updateDepth--;
    if (!updateDepth) {
      if (errorThrown) {
        clearQueue();
      } else {
        processQueue();
      }
    }
  }
}
```

因此当出现节点跨层级移动时，并不会出现想象中的移动操作，而是以 A 为根节点的树被整个重新创建，这是一种影响 `React` 性能的操作，因此 `React` 官方建议不要进行 `DOM` 节点跨层级的操作。


#### component diff

* 如果是同一类型的组件，按照原策略继续比较 `virtual DOM tree`。
* 如果不是，则将该组件判断为 `dirty component`，从而替换整个组件下的所有子节点。
* 对于同一类型的组件，有可能其 `Virtual DOM` 没有任何变化，如果能够确切的知道这点那可以节省大量的 `diff` 运算时间，因此 `React` 允许用户通过 `shouldComponentUpdate()` 来判断该组件是否需要进行 `diff`。

![](https://pic4.zhimg.com/80/52654992aba15fc90e2dac8b2387d0c4_hd.jpg)

当 `component D` 改变为 `component G` 时，即使这两个 `component` 结构相似，一旦 `React` 判断 D 和 G 是不同类型的组件，就不会比较二者的结构，而是直接删除 `component D`，重新创建 `component G`以及其子节点。

#### element diff

当节点处于同一层级时，React diff 提供了三种节点操作，分别为：`INSERT_MARKUP`（插入）、MOVE_EXISTING（移动）和 REMOVE_NODE（删除）。

* `INSERT_MARKUP`:新的 `component` 类型不在老集合里， 即是全新的节点，需要对新节点执行插入操作。
* `MOVE_EXISTING`:在老集合有新 `component` 类型，且 `element` 是可更新的类型，`generateComponentChildren` 已调用 `receiveComponent`，这种情况下 prevChild=nextChild，就需要做移动操作，可以复用以前的 DOM 节点。
* `REMOVE_NODE`:老 `component` 类型，在新集合里也有，但对应的 `element` 不同则不能直接复用和更新，需要执行删除操作，或者老 `component` 不在新集合里的，也需要执行删除操作。

```
function enqueueInsertMarkup(parentInst, markup, toIndex) {
  updateQueue.push({
    parentInst: parentInst,
    parentNode: null,
    type: ReactMultiChildUpdateTypes.INSERT_MARKUP,
    markupIndex: markupQueue.push(markup) - 1,
    content: null,
    fromIndex: null,
    toIndex: toIndex,
  });
}

function enqueueMove(parentInst, fromIndex, toIndex) {
  updateQueue.push({
    parentInst: parentInst,
    parentNode: null,
    type: ReactMultiChildUpdateTypes.MOVE_EXISTING,
    markupIndex: null,
    content: null,
    fromIndex: fromIndex,
    toIndex: toIndex,
  });
}

function enqueueRemove(parentInst, fromIndex) {
  updateQueue.push({
    parentInst: parentInst,
    parentNode: null,
    type: ReactMultiChildUpdateTypes.REMOVE_NODE,
    markupIndex: null,
    content: null,
    fromIndex: fromIndex,
    toIndex: null,
  });
}
```

`element diff`针对这三个方法进行运算，但是单纯的去比较新旧集合的差异化，会导致只是进行繁杂的添加、删除操作，于是`React` 提出优化策略：允许开发者对同一层级的同组子节点，添加唯一 `key` 进行区分，这样的策略便使性能有了质的飞跃：
![](https://upload-images.jianshu.io/upload_images/6079494-88116b98951d6110.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/532)
不使用`key`时，当发现心机和中的`B != A`，便会创建并插入B至新集合，删除旧集合`A`；以此类推，插入`A、D、C`，删除`B、C、D`，这样对于相同的节点，只是位置的变化便进行了如此繁杂的创建、插入和删除操作，显然效率很低。使用key的时候则是另一种情况：
![](https://upload-images.jianshu.io/upload_images/6079494-14f73daf97ba8ee2.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/539)

此时新老集合进行 `diff` 差异化对比，通过 `key` 发现新老集合中的节点都是相同的节点，因此无需进行节点删除和创建，只需要将老集合中节点的位置进行移动，更新为新集合中节点的位置，此时 `React` 给出的 `diff` 结果为：`B、D` 不做任何操作，`A、C` 进行移动操作即可，这显然会使性能优化很多。

那么如此高效的`diff`到底是怎么工作的呢？我们来分析一波：首先对新集合的节点进行循环遍历，`for (name in nextChildren)`，通过唯一 `key` 可以判断新老集合中是否存在相同的节点，`if (prevChild === nextChild)`，如果存在相同节点，则进行移动操作，但在移动前需要将当前节点在老集合中的位置与 lastIndex 进行比较，`if (child._mountIndex < lastIndex)`，则进行节点移动操作，否则不执行该操作。

这是一种顺序优化手段，`lastIndex` 一直在更新，表示访问过的节点在老集合中最右的位置（即最大的位置），如果新集合中当前访问的节点比 `lastIndex` 大，说明当前访问节点在老集合中就比上一个节点位置靠后，则该节点不会影响其他节点的位置，因此不用添加到差异队列中，即不执行移动操作，只有当访问的节点比 `lastIndex` 小时，才需要进行移动操作。

以上图为例，可以更为清晰直观的描述 `diff` 的差异对比过程：

* 从新集合中取得 B，判断老集合中存在相同节点 B，通过对比节点位置判断是否进行移动操作，B 在老集合中的位置 `B._mountIndex = 1`，此时 `lastIndex = 0`，不满足 `child._mountIndex < lastIndex` 的条件，因此不对 B 进行移动操作；更新 `lastIndex = Math.max(prevChild._mountIndex, lastIndex)`，其`prevChild._mountIndex` 表示 B 在老集合中的位置，则 `lastIndex ＝ 1`，并将 B 的位置更新为新集合中的位置`prevChild._mountIndex = nextIndex`，此时新集合中 `B._mountIndex = 0，nextIndex++ `进入下一个节点的判断。

* 从新集合中取得 A，判断老集合中存在相同节点 A，通过对比节点位置判断是否进行移动操作，A 在老集合中的位置 `A._mountIndex = 0`，此时 `lastIndex = 1`，满足 `child._mountIndex < lastIndex`的条件，因此对 A 进行移动操作`enqueueMove(this, child._mountIndex, toIndex)`，其中 `toIndex` 其实就是 `nextIndex`，表示 A 需要移动到的位置；更新 `lastIndex = Math.max(prevChild._mountIndex, lastIndex)`，则 `lastIndex ＝ 1`，并将 A 的位置更新为新集合中的位置 `prevChild._mountIndex = nextIndex`，此时新集合中`A._mountIndex = 1`，`nextIndex++` 进入下一个节点的判断。

* 从新集合中取得 D，判断老集合中存在相同节点 D，通过对比节点位置判断是否进行移动操作，D 在老集合中的位置 `D._mountIndex = 3`，此时 `lastIndex = 1`，不满足 `child._mountIndex < lastIndex`的条件，因此不对 D 进行移动操作；更新 `lastIndex = Math.max(prevChild._mountIndex, lastIndex)`，则 `lastIndex ＝ 3`，并将 D 的位置更新为新集合中的位置 `prevChild._mountIndex = nextIndex`，此时新集合中`D._mountIndex = 2`，`nextIndex++` 进入下一个节点的判断。

* 从新集合中取得 C，判断老集合中存在相同节点 C，通过对比节点位置判断是否进行移动操作，C 在老集合中的位置 `C._mountIndex = 2`，此时 `lastIndex = 3`，满足 `child._mountIndex < lastIndex` 的条件，因此对 C 进行移动操作 `enqueueMove(this, child._mountIndex, toIndex)`；更新 `lastIndex = Math.max(prevChild._mountIndex, lastIndex)`，则 `lastIndex ＝ 3`，并将 C 的位置更新为新集合中的位置 `prevChild._mountIndex = nextIndex`，此时新集合中 `A._mountIndex = 3`，`nextIndex++` 进入下一个节点的判断，由于 C 已经是最后一个节点，因此 diff 到此完成。

以上主要分析新老集合中存在相同节点但位置不同时，对节点进行位置移动的情况，如果新集合中有新加入的节点且老集合存在需要删除的节点，那么 `React diff` 又是如何对比运作的呢？请看下图：

![](https://upload-images.jianshu.io/upload_images/6079494-0a42064a5148e3b0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/509)


* 从新集合中取得 B，判断老集合中存在相同节点 B，由于 B 在老集合中的位置 `B._mountIndex = 1`，此时`lastIndex = 0`，因此不对 B 进行移动操作；更新 `lastIndex ＝ 1`，并将 B 的位置更新为新集合中的位置`B._mountIndex = 0`，`nextIndex++`进入下一个节点的判断。

* 从新集合中取得 E，判断老集合中不存在相同节点 E，则创建新节点 E；更新 `lastIndex ＝ 1`，并将 E 的位置更新为新集合中的位置，`nextIndex++`进入下一个节点的判断。

* 从新集合中取得 C，判断老集合中存在相同节点 C，由于 C 在老集合中的位置`C._mountIndex = 2`，`lastIndex = 1`，此时 `C._mountIndex > lastIndex`，因此不对 C 进行移动操作；更新 `lastIndex ＝ 2`，并将 C 的位置更新为新集合中的位置，`nextIndex++` 进入下一个节点的判断。

* 从新集合中取得 A，判断老集合中存在相同节点 A，由于 A 在老集合中的位置`A._mountIndex = 0`，`lastIndex = 2`，此时 `A._mountIndex < lastIndex`，因此对 A 进行移动操作；更新 `lastIndex ＝ 2`，并将 A 的位置更新为新集合中的位置，`nextIndex++` 进入下一个节点的判断。

* 当完成新集合中所有节点 `diff` 时，最后还需要对老集合进行循环遍历，判断是否存在新集合中没有但老集合中仍存在的节点，发现存在这样的节点 D，因此删除节点 D，到此 `diff` 全部完成。

```
_updateChildren: function(nextNestedChildrenElements, transaction, context) {
  var prevChildren = this._renderedChildren;
  var nextChildren = this._reconcilerUpdateChildren(
    prevChildren, nextNestedChildrenElements, transaction, context
  );
  if (!nextChildren && !prevChildren) {
    return;
  }
  var name;
  var lastIndex = 0;
  var nextIndex = 0;
  for (name in nextChildren) {
    if (!nextChildren.hasOwnProperty(name)) {
      continue;
    }
    var prevChild = prevChildren && prevChildren[name];
    var nextChild = nextChildren[name];
    if (prevChild === nextChild) {
      // 移动节点
      this.moveChild(prevChild, nextIndex, lastIndex);
      lastIndex = Math.max(prevChild._mountIndex, lastIndex);
      prevChild._mountIndex = nextIndex;
    } else {
      if (prevChild) {
        lastIndex = Math.max(prevChild._mountIndex, lastIndex);
        // 删除节点
        this._unmountChild(prevChild);
      }
      // 初始化并创建节点
      this._mountChildAtIndex(
        nextChild, nextIndex, transaction, context
      );
    }
    nextIndex++;
  }
  for (name in prevChildren) {
    if (prevChildren.hasOwnProperty(name) &&
        !(nextChildren && nextChildren.hasOwnProperty(name))) {
      this._unmountChild(prevChildren[name]);
    }
  }
  this._renderedChildren = nextChildren;
},
// 移动节点
moveChild: function(child, toIndex, lastIndex) {
  if (child._mountIndex < lastIndex) {
    this.prepareToManageChildren();
    enqueueMove(this, child._mountIndex, toIndex);
  }
},
// 创建节点
createChild: function(child, mountImage) {
  this.prepareToManageChildren();
  enqueueInsertMarkup(this, mountImage, child._mountIndex);
},
// 删除节点
removeChild: function(child) {
  this.prepareToManageChildren();
  enqueueRemove(this, child._mountIndex);
},

_unmountChild: function(child) {
  this.removeChild(child);
  child._mountIndex = null;
},

_mountChildAtIndex: function(
  child,
  index,
  transaction,
  context) {
  var mountImage = ReactReconciler.mountComponent(
    child,
    transaction,
    this,
    this._nativeContainerInfo,
    context
  );
  child._mountIndex = index;
  this.createChild(child, mountImage);
}
```

当然，`React diff` 还是存在些许不足与待优化的地方，如下图所示，若新集合的节点更新为：D、A、B、C，与老集合对比只有 D 节点移动，而 A、B、C 仍然保持原有的顺序，理论上 `diff` 应该只需对 D 执行移动操作，然而由于 D 在老集合的位置是最大的，导致其他节点的 `_mountIndex < lastIndex`，造成 D 没有执行移动操作，而是 A、B、C 全部移动到 D 节点后面的现象。



### [算法实现](https://github.com/livoras/blog/issues/13)

可以抽时间看下[`hyperapp`源码](hyperapp.js)，几百行代码。








