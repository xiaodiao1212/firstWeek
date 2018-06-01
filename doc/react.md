# react组件实践
=================


* [如果我要实现一个简单的点赞功能](#如果我要实现一个简单的点赞功能)
* [如何复用](#如何复用)
* [实现简单的组件化](#实现简单的组件化)
* [如何优化](#如何优化)
* [抽象公共类](#抽象公共类)
* [react中的jsx](#react中的jsx)
* [jsx原理](#jsx原理)
* [render方法](#render方法)
* [表达式插入](#表达式插入)
* [条件返回](#条件返回)
* [JSX元素变量](#JSX元素变量)
* [组件嵌套组合](#组件嵌套组合)
* [事件监听](#事件监听)
* [event对象](#event对象)
* [事件中的this](#事件中的this)
* [组件状态](#组件状态)
* [setState接受对象参数](#setState接受对象参数)
* [setState接受函数参数](#setState接受函数参数)
* [配置props](#配置props)
* [props不可变](#props不可变)
* [stateVSprops](#stateVSprops)
* [渲染存放JSX元素的数组](#渲染存放JSX元素的数组)
* [使用map渲染列表数据](#使用map渲染列表数据)

## 如果我要实现一个简单的点赞功能
_____________________

```
<body>
    <div class='wrapper'>
        <button class='like-btn'>
        <span class='like-text'>点赞</span>
        <span>👍</span>
        </button>
    </div>
</body>
```
js 代码

```
const button = document.querySelector('.like-btn')
const buttonText = button.querySelector('.like-text')
let isLiked = false
button.addEventListener('click', () => {
    isLiked = !isLiked
    if (isLiked) {
      buttonText.innerHTML = '取消'
    } else {
      buttonText.innerHTML = '点赞'
    }
}, false)
```
这样就完成了一个简单的js点赞取消的功能实现。

#### 问题：其他人要复用这个功能怎么办？

## 如何复用
_____________________
```
class LikeButton {
    render () {
      return `
        <button id='like-btn'>
          <span class='like-text'>赞</span>
          <span>👍</span>
        </button>
      `
    }
}
```
直接将上面代码复制到实例中就可以了
```
const wrapper = document.querySelector('.wrapper')
const likeButton1 = new LikeButton()wrapper.innerHTML = likeButton1.render()
const likeButton2 = new LikeButton()
wrapper.innerHTML += likeButton2.render()
```

虽然不是很友好，但是基本实现了功能。

## 实现简单的组件化
_____________________

如果我们想在button按钮中添加方法怎么办？
button按钮它本身就是一个字符串，我们如何将它变成dom结构树对象？
所以：我们需要这个点赞功能的 HTML 字符串表示的 DOM 结构。

```
// ::String => ::Document
const createDOMFromString = (domString) => {
    const div = document.createElement('div')
    div.innerHTML = domString
    return div
}
```
通过上面函数组合更改下

```
class LikeButton {
    render () {
        this.el = createDOMFromString(`
            <button class='like-button'>
            <span class='like-text'>点赞</span>
            <span>👍</span>
        </button>
    `)
    this.el.addEventListener('click', () =>             console.log('click'), false)
        return this.el
    }
}
```
现在render函数返回的就不是一个字符串而是dom结构了。
所以我们不能用innerHTML而是用dom api插入对象了

```
const wrapper = document.querySelector('.wrapper')

const likeButton1 = new LikeButton()
wrapper.appendChild(likeButton1.render())

const likeButton2 = new LikeButton()
wrapper.appendChild(likeButton2.render())
```

整理上述代码为：
```
class LikeButton {
    constructor () {
      this.state = { isLiked: false }
    }

    changeLikeText () {
      const likeText = this.el.querySelector('.like-text')
      this.state.isLiked = !this.state.isLiked
      likeText.innerHTML = this.state.isLiked ? '取消' : '点赞'
    }

    render () {
      this.el = createDOMFromString(`
        <button class='like-button'>
          <span class='like-text'>点赞</span>
          <span>👍</span>
        </button>
      `)
      this.el.addEventListener('click', this.changeLikeText.bind(this), false)
      return this.el
    }
}
```


## 如何优化
_____________________

如果你的组件依赖了很多状态，那么组件基本全部都是 DOM 操作。
所以我们要做的是：如何尽量减少手动 DOM 操作？

有一种方案：一旦状态发生改变，就重新调用 render 方法，构建一个新的 DOM 元素。

```
class LikeButton {
    constructor () {
      this.state = { isLiked: false }
    }

    setState (state) {
      this.state = state
      this.el = this.render()
    }

    changeLikeText () {
      this.setState({
        isLiked: !this.state.isLiked
      })
    }

    render () {
      this.el = createDOMFromString(`
        <button class='like-btn'>
          <span class='like-text'>${this.state.isLiked ? '取消' : '点赞'}</span>
          <span>👍</span>
        </button>
      `)
      this.el.addEventListener('click', this.changeLikeText.bind(this), false)
      return this.el
    }
}
```
其实只是改了几个小地方：
1. render 函数里面的 HTML 字符串会根据 this.state 不同而不同（这里是用了 ES6 的模版字符串，做这种事情很方便）。
2. 新增一个 setState 函数，这个函数接受一个对象作为参数；它会设置实例的 state，然后重新调用一下 render 方法。
3. 当用户点击按钮的时候， changeLikeText 会构建新的 state 对象，这个新的 state ，传入 setState 函数当中。

你只要调用 setState，组件就会重新渲染。我们顺利地消除了手动的 DOM 操作。

重新渲染的 DOM 元素并没有插入到页面当中,所以我们还需要重新插入新的 DOM 元素，所以我们重新修改一下setState方法:
```
...
    setState (state) {
      const oldEl = this.el
      this.state = state
      this.el = this.render()
      if (this.onStateChange) this.onStateChange(oldEl, this.el)
    }
...
```
使用时候：
```
const likeButton = new LikeButton()
wrapper.appendChild(likeButton.render()) // 第一次插入 DOM 元素
likeButton.onStateChange = (oldEl, newEl) => {
    wrapper.insertBefore(newEl, oldEl) // 插入新的元素
    wrapper.removeChild(oldEl) // 删除旧的元素
}
```
这里每次 setState 都会调用 onStateChange 方法，而这个方法是实例化以后时候被设置的，所以你可以自定义 onStateChange 的行为。这里做的事是，每当 setState 中构造完新的 DOM 元素以后，就会通过 onStateChange 告知外部插入新的 DOM 元素，然后删除旧的元素，页面就更新了。这里已经做到了进一步的优化了：现在不需要再手动更新页面了。

## 抽象公共类
_____________________

为了让代码更灵活，可以写更多的组件，我们把这种模式抽象出来，放到一个 Component 类当中：
```
class Component {
    setState (state) {
      const oldEl = this.el
      this.state = state
      this._renderDOM()
      if (this.onStateChange) this.onStateChange(oldEl, this.el)
    }

    _renderDOM () {
      this.el = createDOMFromString(this.render())
      if (this.onClick) {
        this.el.addEventListener('click', this.onClick.bind(this), false)
      }
      return this.el
    }
}
```
这个是一个组件父类 Component，所有的组件都可以继承这个父类来构建。它定义的两个方法，一个是我们已经很熟悉的 setState；一个是私有方法 _renderDOM。_renderDOM 方法会调用 this.render 来构建 DOM 元素并且监听 onClick 事件。所以，组件子类继承的时候只需要实现一个返回 HTML 字符串的 render 方法就可以了。

还有一个mount方法，用来把组件的dom元素插入页面，并且在setState的时候更新页面:
```
const mount = (component, wrapper) => {
    wrapper.appendChild(component._renderDOM())
    component.onStateChange = (oldEl, newEl) => {
      wrapper.insertBefore(newEl, oldEl)
      wrapper.removeChild(oldEl)
    }
}
```
整理代码后:
```
class LikeButton extends Component {
    constructor () {
      super()
      this.state = { isLiked: false }
    }

    onClick () {
      this.setState({
        isLiked: !this.state.isLiked
      })
    }

    render () {
      return `
        <button class='like-btn'>
          <span class='like-text'>${this.state.isLiked ? '取消' : '点赞'}</span>
          <span>👍</span>
        </button>
      `
    }
}

mount(new LikeButton(), wrapper)
```

这样还有个问题，就是在实际开发中如果要给组件传入一些自定义配置数据呢？比如背景色，前景色等css属性？
所以我们就给组件传入一个props对象，修改如下:
```
constructor (props = {}) {
    this.props = props
}
```
子类继承时候可以这么写:
```
class LikeButton extends Component {
    constructor (props) {
      super(props)
      this.state = { isLiked: false }
    }

    onClick () {
      this.setState({
        isLiked: !this.state.isLiked
      })
    }

    render () {
      return `
        <button class='like-btn' style="background-color: ${this.props.bgColor}">
          <span class='like-text'>
            ${this.state.isLiked ? '取消' : '点赞'}
          </span>
          <span>👍</span>
        </button>
      `
    }
}

mount(new LikeButton({ bgColor: 'red' }), wrapper)
```

整理代码就是:
```
class RedBlueButton extends Component {
    constructor (props) {
      super(props)
      this.state = {
        color: 'red'
      }
    }

    onClick () {
      this.setState({
        color: 'blue'
      })
    }

    render () {
      return `
        <div style='color: ${this.state.color};'>${this.state.color}</div>
      `
    }
}
```

## react中的jsx
_____________________

我们构造出一个react项目，把index.js代码改成:
```
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import './index.css'

class Header extends Component {
  render () {
    return (
      <div>
        <h1>React 小书</h1>
      </div>
    )
  }
}

ReactDOM.render(
  <Header />,
  document.getElementById('root')
)
```
这里，文件头部从 react 的包当中引入了 React 和 React.js 的组件父类 Component。只要写组件，都要引入这两个基类。
ReactDOM 可以帮助我们把 React 组件渲染到页面上去，没有其它的作用了。你可以发现它是从 react-dom 中引入的，而不是从 react 引入。

这里 return 的东西，它并不是一个字符串，看起来像是纯 HTML 代码写在 JavaScript 代码里面。这种语法叫 JSX。

## jsx原理
_____________________

首先思考一个问题：如何使用js对象来表现一个dom元素的结构呢？
```
<div class='box' id='content'>
    <div class='title'>Hello</div>
    <button>Click</button>
</div>
```
其实一个 DOM 元素包含的信息其实只有三个：标签名，属性，子元素。

所以上面的html片段我们可以用这样的js来解释：
```
{
  tag: 'div',
  attrs: { className: 'box', id: 'content'},
  children: [
    {
      tag: 'div',
      arrts: { className: 'title' },
      children: ['Hello']
    },
    {
      tag: 'button',
      attrs: null,
      children: ['Click']
    }
  ]
}
```
但是用 JavaScript 写起来太长了，结构看起来又不清晰，用 HTML 的方式写起来就方便很多了。
于是 React.js 就把 JavaScript 的语法扩展了一下，让 JavaScript 语言能够支持这种直接在 JavaScript 代码里面编写类似 HTML 标签结构的语法，这样写起来就方便很多了。编译的过程会把类似 HTML 的 JSX 结构转换成 JavaScript 的对象结构。

所以上面的代码可以改为:
```
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import './index.css'

class Header extends Component {
  render () {
    return (
      <div>
        <h1 className='title'>React 小书</h1>
      </div>
    )
  }
}

ReactDOM.render(
  <Header />,
  document.getElementById('root')
)
```
编译过后为：
```
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import './index.css'

class Header extends Component {
  render () {
    return (
     React.createElement(
        "div",
        null,
        React.createElement(
          "h1",
          { className: 'title' },
          "React 小书"
        )
      )
    )
  }
}

ReactDOM.render(
  React.createElement(Header, null),
  document.getElementById('root')
);
```

React.createElement 会构建一个 JavaScript 对象来描述你 HTML 结构的信息，包括标签名、属性、还有子元素等。这样的代码就是合法的 JavaScript 代码了。所以使用 React 和 JSX 的时候一定要经过编译的过程。

所以，有了这个表示 HTML 结构和信息的对象以后，就可以拿去构造真正的 DOM 元素，然后把这个 DOM 元素塞到页面上。
```
ReactDOM.render(
  <Header />,
  document.getElementById('root')
)
```
ReactDOM.render 功能就是把组件渲染并且构造 DOM 树，然后插入到页面上某个特定的元素上（在这里是 id 为 root 的 div 元素）。

如图：
[ReactDOM.png]()

为什么不直接从 JSX 直接渲染构造 DOM 结构，而是要经过中间这么一层呢？

第一个原因是，当我们拿到一个表示 UI 的结构和信息的对象以后，不一定会把元素渲染到浏览器的普通页面上，我们有可能把这个结构渲染到 canvas 上，或者是手机 App 上。所以这也是为什么会要把 react-dom 单独抽离出来的原因，可以想象有一个叫 react-canvas 可以帮我们把 UI 渲染到 canvas 上，或者是有一个叫 react-app 可以帮我们把它转换成原生的 App（实际上这玩意叫 ReactNative）。

第二个原因是，有了这样一个对象。当数据变化，需要更新组件的时候，就可以用比较快的算法操作这个 JavaScript 对象，而不用直接操作页面上的 DOM，这样可以尽量少的减少浏览器重排，极大地优化性能。


## render方法
_____________________

React.js 中一切皆组件，用 React.js 写的其实就是 React.js 组件。我们在编写 React.js 组件的时候，一般都需要继承 React.js 的 Component（还有别的编写组件的方式我们后续会提到）。一个组件类必须要实现一个 render 方法，这个 render 方法必须要返回一个 JSX 元素。但这里要注意的是，必须要用一个外层的 JSX 元素把所有内容包裹起来。返回并列多个 JSX 元素是不合法的，下面是错误的做法：

```
false
···
render () {
  return (
    <div>第一个</div>
    <div>第二个</div>
  )
}
···
true
···
render () {
  return (
    <div>
      <div>第一个</div>
      <div>第二个</div>
    </div>
  )
}
···
```

## 表达式插入
_____________________
在 JSX 当中你可以插入 JavaScript 的表达式，表达式返回的结果会相应地渲染到页面上。表达式用 {} 包裹。例如：

```
...
render () {
  const word = 'is good'
  return (
    <div>
      <h1>React 小书 {word}</h1>
    </div>
  )
}
...
or
...
render () {
  return (
    <div>
      <h1>React 小书 {(function () { return 'is good'})()}</h1>
    </div>
  )
}
...
or
...
render () {
  const className = 'header'
  return (
    <div className={className}>
      <h1>React 小书</h1>
    </div>
  )
}
...
```
注意：直接使用 class 在 React.js 的元素上添加类名如 <div class=“xxx”> 这种方式是不合法的。因为 class 是 JavaScript 的关键字，所以 React.js 中定义了一种新的方式：className 来帮助我们给元素添加类名。

还有一个特例就是 for 属性，例如 <label for='male'>Male</label>，因为 for 也是 JavaScript 的关键字，所以在 JSX 用 htmlFor 替代，即 <label htmlFor='male'>Male</label>。而其他的 HTML 属性例如 style 、data-* 等就可以像普通的 HTML 属性那样直接添加上去。

## 条件返回
_____________________

{} 上面说了，JSX 可以放置任何表达式内容。所以也可以放 JSX，实际上，我们可以在 render 函数内部根据不同条件返回不同的 JSX。例如：
```
...
render () {
  const isGoodWord = true
  return (
    <div>
      <h1>
        React 小书
        {isGoodWord
          ? <strong> is good</strong>
          : <span> is not good</span>
        }
      </h1>
    </div>
  )
}
...
or
...
render () {
  const isGoodWord = true
  return (
    <div>
      <h1>
        React 小书
        {isGoodWord
          ? <strong> is good</strong>
          : null
        }
      </h1>
    </div>
  )
}
...
```

## JSX元素变量
_____________________
JSX 元素其实可以像 JavaScript 对象那样自由地赋值给变量，或者作为函数参数传递、或者作为函数的返回值。

```
...
render () {
  const isGoodWord = true
  const goodWord = <strong> is good</strong>
  const badWord = <span> is not good</span>
  return (
    <div>
      <h1>
        React 小书
        {isGoodWord ? goodWord : badWord}
      </h1>
    </div>
  )
}
...
or
...
renderGoodWord (goodWord, badWord) {
  const isGoodWord = true
  return isGoodWord ? goodWord : badWord
}

render () {
  return (
    <div>
      <h1>
        React 小书
        {this.renderGoodWord(
          <strong> is good</strong>,
          <span> is not good</span>
        )}
      </h1>
    </div>
  )
}
...
```

## 组件嵌套组合
_____________________

假设我们现在构建一个新的组件叫 Title，它专门负责显示标题。你可以在 Header 里面使用 Title组件：

```
class Title extends Component {
  render () {
    return (
      <h1>React 小书</h1>
    )
  }
}

class Header extends Component {
  render () {
    return (
      <div>
        <Title />
      </div>
    )
  }
}
```
我们可以直接在 Header 标签里面直接使用 Title 标签。就像是一个普通的标签一样。

```
<div>
    <Title />
    <Title />
    <Title />
</div>
```
另外react规定自定义的组件都必须要用大写字母开头，普通的 HTML 标签都用小写字母开头。
所以ract组件组合起来就是：
```
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

class Title extends Component {
  render () {
    return (
      <h1>hello world</h1>
    )
  }
}

class Header extends Component {
  render () {
    return (
    <div>
      <Title />
      <h2>This is Header</h2>
    </div>
    )
  }
}

class Main extends Component {
  render () {
    return (
    <div>
      <h2>This is main content</h2>
    </div>
    )
  }
}

class Footer extends Component {
  render () {
    return (
    <div>
      <h2>This is footer</h2>
    </div>
    )
  }
}

class Index extends Component {
  render () {
    return (
      <div>
        <Header />
        <Main />
        <Footer />
      </div>
    )
  }
}

ReactDOM.render(
  <Index />,
  document.getElementById('root')
)
```

## 事件监听
_____________________
在 React.js 里面监听事件是很容易，你只需要给需要监听事件的元素加上属性类似于 onClick、onKeyDown 这样的属性，例如我们现在要给 Title 加上点击的事件监听：
```
class Title extends Component {
  handleClickOnTitle () {
    console.log('Click on title.')
  }

  render () {
    return (
      <h1 onClick={this.handleClickOnTitle}>React 小书</h1>
    )
  }
}
```
React.js 帮我们封装好了一系列的 on* 的属性，当你需要为某个元素监听某个事件的时候，只需要简单地给它加上 on* 就可以了。而且你不需要考虑不同浏览器兼容性的问题，React.js 都帮我们封装好这些细节了。
另外要注意的是，这些事件属性名都必须要用驼峰命名法。

## event对象
_____________________
和普通浏览器一样，事件监听函数会被自动传入一个 event 对象，这个对象和普通的浏览器 event 对象所包含的方法和属性都基本一致。不同的是 React.js 中的 event 对象并不是浏览器提供的，而是它自己内部所构建的。

我们来尝试一下，这次尝试当用户点击 h1 的时候，把 h1 的 innerHTML 打印出来：

```
class Title extends Component {
  handleClickOnTitle (e) {
    console.log(e.target.innerHTML)
  }

  render () {
    return (
      <h1 onClick={this.handleClickOnTitle}>Hello world</h1>
    )
  }
}
```

## 事件中的this
_____________________
一般在某个类的实例方法里面的 this 指的是这个实例本身。但是你在上面的 handleClickOnTitle 中把 this 打印出来，你会看到 this 是 null 或者 undefined。
这是因为 React.js 调用你所传给它的方法的时候，并不是通过对象方法的方式调用（this.handleClickOnTitle），而是直接通过函数调用 （handleClickOnTitle），所以事件监听函数内并不能通过 this 获取到实例。

如果你想在事件函数当中使用当前的实例，你需要手动地将实例方法 bind 到当前实例上再传入给 React.js。

```
class Title extends Component {
  handleClickOnTitle (e) {
    console.log(this)
  }

  render () {
    return (
      <h1 onClick={this.handleClickOnTitle.bind(this)}>React 小书</h1>
    )
  }
}
```
你也可以在 bind 的时候给事件监听函数传入一些参数：
```
class Title extends Component {
  handleClickOnTitle (word, e) {
    console.log(this, word)
  }

  render () {
    return (
      <h1 onClick={this.handleClickOnTitle.bind(this, 'Hello')}>React 小书</h1>
    )
  }
}
```

## 组件状态
_____________________
一个组件的显示形态是可以由它数据状态和配置参数决定的。一个组件可以拥有自己的状态，就像一个点赞按钮，可以有“已点赞”和“未点赞”状态，并且可以在这两种状态之间进行切换。reactjs的state就是用来存储这种可变化状态的。

```
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import './index.css'

class LikeButton extends Component {
  constructor () {
    super()
    this.state = { isLiked: false }
  }

  handleClickOnLikeButton () {
    this.setState({
      isLiked: !this.state.isLiked
    })
  }

  render () {
    return (
      <button onClick={this.handleClickOnLikeButton.bind(this)}>
        {this.state.isLiked ? '取消' : '点赞'} 👍
      </button>
    )
  }
}
...
```

isLiked 存放在实例的 state 对象当中，这个对象在构造函数里面初始化。这个组件的 render 函数内，会根据组件的 state 的中的isLiked不同显示“取消”或“点赞”内容。并且给 button 加上了点击的事件监听。
最后构建一个 Index ，在它的 render 函数内使用 LikeButton 。然后把 Index 渲染到页面上：

```
...
class Index extends Component {
  render () {
    return (
      <div>
        <LikeButton />
      </div>
    )
  }
}

ReactDOM.render(
  <Index />,
  document.getElementById('root')
)
```

## setState接受对象参数
_____________________
在 handleClickOnLikeButton 事件监听函数里面，大家可以留意到，我们调用了 setState 函数，每次点击都会更新 isLiked 属性为 !isLiked，这样就可以做到点赞和取消功能。

当我们调用setState这个函数的时候，React.js 会更新组件的状态 state ，并且重新调用 render 方法，然后再把 render 方法所渲染的最新的内容显示到页面上。

注意，当我们要改变组件的状态的时候，不能直接用 this.state = xxx 这种方式来修改，如果这样做 React.js 就没办法知道你修改了组件的状态，它也就没有办法更新页面。所以，一定要使用 React.js 提供的 setState 方法，它接受一个对象或者函数作为参数。

传入一个对象的时候，这个对象表示该组件的新状态。但你只需要传入需要更新的部分就可以了，而不需要传入整个对象。例如，假设现在我们有另外一个状态 name ：

```
...
  constructor (props) {
    super(props)
    this.state = {
      name: 'Tomy',
      isLiked: false
    }
  }

  handleClickOnLikeButton () {
    this.setState({
      isLiked: !this.state.isLiked
    })
  }
...
```
因为点击的时候我们并不需要修改 name，所以只需要传入 isLiked 就行了。Tomy 还是那个 Tomy，而 isLiked 已经不是那个 isLiked 了。

## setState接受函数参数
_____________________
这里还有要注意的是，当你调用 setState 的时候，React.js 并不会马上修改 state。而是把这个对象放到一个更新队列里面，稍后才会从队列当中把新的状态提取出来合并到 state 当中，然后再触发组件更新。这一点要好好注意。可以体会一下下面的代码：

```
...
  handleClickOnLikeButton () {
    console.log(this.state.isLiked)
    this.setState({
      isLiked: !this.state.isLiked
    })
    console.log(this.state.isLiked)
  }
...
```

你会发现两次打印的都是 false，即使我们中间已经 setState 过一次了。这并不是什么 bug，只是 React.js 的 setState 把你的传进来的状态缓存起来，稍后才会帮你更新到 state 上，所以你获取到的还是原来的 isLiked。

所以如果你想在 setState 之后使用新的 state 来做后续运算就做不到了，例如：

```
...
  handleClickOnLikeButton () {
    this.setState({ count: 0 }) // => this.state.count 还是 undefined
    this.setState({ count: this.state.count + 1}) // => undefined + 1 = NaN
    this.setState({ count: this.state.count + 2}) // => NaN + 2 = NaN
  }
...
```

上面的代码的运行结果并不能达到我们的预期，我们希望 count 运行结果是 3 ，可是最后得到的是 NaN。但是这种后续操作依赖前一个 setState 的结果的情况并不罕见。

这里就自然地引出了 setState 的第二种使用方式，可以接受一个函数作为参数。React.js 会把上一个 setState 的结果传入这个函数，你就可以使用该结果进行运算、操作，然后返回一个对象作为更新 state 的对象：

```
...
  handleClickOnLikeButton () {
    this.setState((prevState) => {
      return { count: 0 }
    })
    this.setState((prevState) => {
      return { count: prevState.count + 1 } // 上一个 setState 的返回是 count 为 0，当前返回 1
    })
    this.setState((prevState) => {
      return { count: prevState.count + 2 } // 上一个 setState 的返回是 count 为 1，当前返回 3
    })
    // 最后的结果是 this.state.count 为 3
  }
...
```
这样就可以达到上述利用上一次setState结果进行运算的效果。

在此你要记住：在使用 React.js 的时候，并不需要担心多次进行 setState 会带来性能问题。
因为上面我们进行了三次 setState，但是实际上组件只会重新渲染一次，而不是三次；这是因为在 React.js 内部会把 JavaScript 事件循环中的消息队列的同一个消息中的 setState 都进行合并以后再重新渲染组件。

## 配置props
_____________________
组件是相互独立、可复用的单元，一个组件可能在不同地方被用到。但是在不同的场景下对这个组件的需求可能会根据情况有所不同，例如文本的展示等等，

React.js 的 props 就可以帮助我们达到这个效果。每个组件都可以接受一个 props 参数，它是一个对象，包含了所有你对这个组件的配置。

```
class LikeButton extends Component {
  constructor () {
    super()
    this.state = { isLiked: false }
  }

  handleClickOnLikeButton () {
    this.setState({
      isLiked: !this.state.isLiked
    })
  }

  render () {
    const likedText = this.props.likedText || '取消'
    const unlikedText = this.props.unlikedText || '点赞'
    return (
      <button onClick={this.handleClickOnLikeButton.bind(this)}>
        {this.state.isLiked ? likedText : unlikedText} 👍
      </button>
    )
  }
}
```

从 render 函数可以看出来，组件内部是通过 this.props 的方式获取到组件的参数的，如果 this.props 里面有需要的属性我们就采用相应的属性，没有的话就用默认的属性。

那么怎么把 props 传进去呢？在使用一个组件的时候，可以把参数放在标签的属性当中，所有的属性都会作为 props 对象的键值：

```
class Index extends Component {
  render () {
    return (
      <div>
        <LikeButton likedText='已赞' unlikedText='赞' />
      </div>
    )
  }
}
```

就像你在用普通的 HTML 标签的属性一样，可以把参数放在表示组件的标签上，组件内部就可以通过 this.props 来访问到这些配置参数了。

其实可以把任何类型的数据作为组件的参数，包括字符串、数字、对象、数组、甚至是函数等等。例如现在我们把一个对象传给点赞组件作为参数：
```
class Index extends Component {
  render () {
    return (
      <div>
        <LikeButton wordings={{likedText: '已赞', unlikedText: '赞'}} />
      </div>
    )
  }
}
```

现在我们把 likedText 和 unlikedText 这两个参数封装到一个叫 wordings 的对象参数内，然后传入点赞组件中。大家看到 {{likedText: '已赞', unlikedText: '赞'}} 这样的代码的时候，不要以为是什么新语法。之前讨论过，JSX 的 {} 内可以嵌入任何表达式，{{}} 就是在 {} 内部用对象字面量返回一个对象而已。

这时候，点赞按钮的内部就要用 this.props.wordings 来获取到到参数了：

```
···
class LikeButton extends Component {
  constructor () {
    super()
    this.state = { isLiked: false }
  }

  handleClickOnLikeButton () {
    this.setState({
      isLiked: !this.state.isLiked
    })
  }

  render () {
    const wordings = this.props.wordings || {
      likedText: '取消',
      unlikedText: '点赞'
    }
    return (
      <button onClick={this.handleClickOnLikeButton.bind(this)}>
        {this.state.isLiked ? wordings.likedText : wordings.unlikedText} 👍
      </button>
    )
  }
}
···
or
···
class Index extends Component {
  render () {
    return (
      <div>
        <LikeButton
          wordings={{likedText: '已赞', unlikedText: '赞'}}
          onClick={() => console.log('Click on like button!')}/>
      </div>
    )
  }
}
···
or
···
  handleClickOnLikeButton () {
    this.setState({
      isLiked: !this.state.isLiked
    })
    if (this.props.onClick) {
      this.props.onClick()
    }
  }
···
```

## props不可变
_____________________
props 一旦传入进来就不能改变。修改上面的例子中的 handleClickOnLikeButton ：
```
handleClickOnLikeButton () {
    this.props.likedText = '取消'
    this.setState({
      isLiked: !this.state.isLiked
    })
}
```
尝试在用户点击按钮的时候改变 this.props.likedText ，然后你会看到控制台报错了：
[报错](./error.png)

你不能改变一个组件被渲染的时候传进来的 props。React.js 希望一个组件在输入确定的 props 的时候，能够输出确定的 UI 显示形态。如果 props 渲染过程中可以被修改，那么就会导致这个组件显示形态和行为变得不可预测，这样会可能会给组件使用者带来困惑。

但这并不意味着由 props 决定的显示形态不能被修改。组件的使用者可以主动地通过重新渲染的方式把新的 props 传入组件当中，这样这个组件中由 props 决定的显示形态也会得到相应的改变。

```
class Index extends Component {
  constructor () {
    super()
    this.state = {
      likedText: '已赞',
      unlikedText: '赞'
    }
  }

  handleClickOnChange () {
    this.setState({
      likedText: '取消',
      unlikedText: '点赞'
    })
  }

  render () {
    return (
      <div>
        <LikeButton
          likedText={this.state.likedText}
          unlikedText={this.state.unlikedText} />
        <div>
          <button onClick={this.handleClickOnChange.bind(this)}>
            修改 wordings
          </button>
        </div>
      </div>
    )
  }
}
```

## stateVSprops
_____________________
    state 的主要作用是用于组件保存、控制、修改自己的可变状态。state 在组件内部初始化，可以被组件自身修改，而外部不能访问也不能修改。你可以认为 state 是一个局部的、只能被组件自身控制的数据源。state 中状态可以通过 this.setState 方法进行更新，setState 会导致组件的重新渲染。

    props 的主要作用是让使用该组件的父组件可以传入参数来配置该组件。它是外部传进来的配置参数，组件内部无法控制也无法修改。除非外部组件主动传入新的 props，否则组件的 props 永远保持不变。

## 渲染存放JSX元素的数组
_____________________
假设现在我们有这么一个用户列表数据，存放在一个数组当中：
```
const users = [
  { username: 'Jerry', age: 21, gender: 'male' },
  { username: 'Tomy', age: 22, gender: 'male' },
  { username: 'Lily', age: 19, gender: 'female' },
  { username: 'Lucy', age: 20, gender: 'female' }
]
```
如果现在要把这个数组里面的数据渲染页面上要怎么做？开始之前要补充一个知识。之前说过 JSX 的表达式插入 {} 里面可以放任何数据，如果我们往 {} 里面放一个存放 JSX 元素的数组会怎么样？

```
...

class Index extends Component {
  render () {
    return (
      <div>
        {[
          <span>hello </span>,
          <span>my  </span>,
          <span>world</span>
        ]}
      </div>
    )
  }
}

ReactDOM.render(
  <Index />,
  document.getElementById('root')
)
···
```

如果你往 {} 放一个数组，React.js 会帮你把数组里面一个个元素罗列并且渲染出来。


## 使用map渲染列表数据
_____________________
渲染单独一个用户的结构抽离出来作为一个组件，代码如下：
```
const users = [
  { username: 'Jerry', age: 21, gender: 'male' },
  { username: 'Tomy', age: 22, gender: 'male' },
  { username: 'Lily', age: 19, gender: 'female' },
  { username: 'Lucy', age: 20, gender: 'female' }
]

class User extends Component {
  render () {
    const { user } = this.props
    return (
      <div>
        <div>姓名：{user.username}</div>
        <div>年龄：{user.age}</div>
        <div>性别：{user.gender}</div>
        <hr />
      </div>
    )
  }
}

class Index extends Component {
  render () {
    return (
      <div>
        {users.map((user, i) => <User key={i} user={user} />)}
      </div>
    )
  }
}

ReactDOM.render(
  <Index />,
  document.getElementById('root')
)
```

注意：这里面的key是必须的
因为：
React.js 的是非常高效的，它高效依赖于所谓的 Virtual-DOM 策略。简单来说，能复用的话 React.js 就会尽量复用，没有必要的话绝对不碰 DOM。对于列表元素来说也是这样，但是处理列表元素的复用性会有一个问题：元素可能会在一个列表中改变位置。例如：
```
<div>a</div>
<div>b</div>
<div>c</div>
```
假设页面上有这么3个列表元素，现在改变一下位置：

```
<div>a</div>
<div>c</div>
<div>b</div>
```
c 和 b 的位置互换了。但其实 React.js 只需要交换一下 DOM 位置就行了，但是它并不知道其实我们只是改变了元素的位置，所以它会重新渲染后面两个元素（再执行 Virtual-DOM 策略），这样会大大增加 DOM 操作。但如果给每个元素加上唯一的标识，React.js 就可以知道这两个元素只是交换了位置：
```
<div key='a'>a</div>
<div key='b'>b</div>
<div key='c'>c</div>
```
这样 React.js 就简单的通过 key 来判断出来，这两个列表元素只是交换了位置，可以尽量复用元素内部的结构。

## 总结
_____________________
到此，就把react基本原理已经使用方法渲染规则整体过了一遍，读完此文章应该怼react能有个更加深入的了解。


