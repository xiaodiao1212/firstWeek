# reactjs 状态生命周期

## 状态提升
![img](https://huzidaha.github.io/static/assets/img/posts/85B8A2B7-288F-4FC2-A0AB-C4E153BB3854.png)
![img](https://huzidaha.github.io/static/assets/img/posts/C547BD3E-F923-4B1D-96BC-A77966CDFBEF.png)

如上面靓图：

遇到这种情况，我们将这种组件之间共享的状态交给组件最近的公共父节点保管，然后通过 props 把状态传递给子组件，这样就可以在组件之间共享数据了。

如果把这个 comments 放到 CommentList 当中，当有别的组件也依赖这个 comments 数据或者有别的组件会影响这个数据，那么就带来问题了。举一个数据依赖的例子：例如，现在我们有另外一个和 CommentList 同级的 CommentList2 ，也是需要显示同样的评论列表数据。

## 生命周期
在react中：
```
ReactDOM.render(
 <Header />,
  document.getElementById('root')
)
编译后：
ReactDOM.render(
  React.createElement(Header, null),
  document.getElementById('root')
)
```
其实他们就做了这些事:
```
// React.createElement 中实例化一个 Header
const header = new Header(props, children)
// React.createElement 中调用 header.render 方法渲染组件的内容
const headerJsxObject = header.render()

// ReactDOM 用渲染后的 JavaScript 对象来来构建真正的 DOM 元素
const headerDOM = createDOMFromObject(headerJsxObject)
// ReactDOM 把 DOM 元素塞到页面上
document.getElementById('root').appendChild(headerDOM)
```

我们把 React.js 将组件渲染，并且构造 DOM 元素然后塞入页面的过程称为组件的挂载（这个定义请好好记住）。其实 React.js 内部对待每个组件都有这么一个过程，也就是初始化组件 -> 挂载到页面上的过程。所以你可以理解一个组件的方法调用是这么一个过程：

```
-> constructor()
-> render()
// 然后构造 DOM 元素插入页面
```
然后我们添加掌控组件的函数:
```
-> constructor()
-> componentWillMount()
-> render()
// 然后构造 DOM 元素插入页面
-> componentDidMount()
```

那么componentWillMount 和 componentDidMount 都是可以像 render 方法一样自定义在组件的内部。挂载的时候，React.js 会在组件的 render 之前调用 componentWillMount，在 DOM 元素塞入页面以后调用 componentDidMount。

```
class Header extends Component {
  constructor () {
    super()
    console.log('construct')
  }

  componentWillMount () {
    console.log('component will mount')
  }

  componentDidMount () {
    console.log('component did mount')
  }

  render () {
    console.log('render')
    return (
      <div>
        <h1 className='title'>React 小书</h1>
      </div>
    )
  }
}
```
输出如下:
![img](https://huzidaha.github.io/static/assets/img/posts/69676213-FDED-4E60-8142-07599BA10696.png)

那如果要加入删除dom操作呢？

通过上面我们可知：
```
-> constructor()
-> componentWillMount()
-> render()
// 然后构造 DOM 元素插入页面
-> componentDidMount()
// ...
// 即将从页面中删除
-> componentWillUnmount()
// 从页面中删除
```

然后我们定义一下组件:
```
class Index extends Component {
  constructor() {
    super()
    this.state = {
      isShowHeader: true
    }
  }

  handleShowOrHide () {
    this.setState({
      isShowHeader: !this.state.isShowHeader
    })
  }

  render () {
    return (
      <div>
        {this.state.isShowHeader ? <Header /> : null}
        <button onClick={this.handleShowOrHide.bind(this)}>
          显示或者隐藏标题
        </button>
      </div>
    )
  }
}

ReactDOM.render(
  <Index />,
  document.getElementById('root')
)
```

Index 组件使用了 Header 组件，并且有一个按钮，可以控制 Header 的显示或者隐藏。下面这行代码：
```
...a
{this.state.isShowHeader ? <Header /> : null}
...
```
相当于 state.isShowHeader 为 true 的时候把 Header 插入页面，false 的时候把 Header 从页面上删除。这时候我们给 Header 添加 componentWillUnmount 方法：
```
...
  componentWillUnmount() {
    console.log('component will unmount')
  }
...
```
这时候点击页面上的按钮，你会看到页面的标题隐藏了，并且控制台打印出来下图的最后一行，说明 componentWillUnmount 确实被 React.js 所调用了：
![img](https://huzidaha.github.io/static/assets/img/posts/B396B6CF-50F1-4C4E-9D16-4E746F15F91F.png)
