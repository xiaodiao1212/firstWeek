# rxjs subject

## 观察者模式

观察者模式又叫发布订阅模式（Publish/Subscribe），它定义了一种一对多的关系，让多个观察者对象同时监听某一个主题对象，这个主题对象的状态发生变化时就会通知所有的观察者对象，使得它们能够自动更新自己。

简而言之经常用期刊订阅形容这个概念：
期刊订阅包含两个主要的角色
* 期刊出版方 - 负责期刊的出版和发行工作(Subject)

* 订阅者 - 只需执行订阅操作，新版的期刊发布后，就会主动收到通知，如果取消订阅，以后就不会再收到通知(Observer)

![img](https://segmentfault.com/img/bVK7Ps?w=414&h=273)
![img](https://segmentfault.com/img/bVLrYg?w=600&h=320)

## 简单奉献代码：

### Subject 类
```
class Subject {

    constructor() {
        this.observerCollection = [];
    }

    addObserver(observer) { // 添加观察者
        this.observerCollection.push(observer);
    }

    deleteObserver(observer) { // 移除观察者
        let index = this.observerCollection.indexOf(observer);
        if(index >= 0) this.observerCollection.splice(index, 1);
    }

    notifyObservers() { // 通知观察者
        this.observerCollection.forEach((observer)=>observer.notify());
    }
}
```
### Observer 类
```
class Observer {
    constructor(name) {
        this.name = name;
    }

    notify() {
        console.log(`${this.name} has been notified.`);
    }
}
```
### 组合使用
```
let subject = new Subject(); // 创建主题对象

let observer1 = new Observer('semlinker'); // 创建观察者A - 'semlinker'
let observer2 = new Observer('lolo'); // 创建观察者B - 'lolo'

subject.addObserver(observer1); // 注册观察者A
subject.addObserver(observer2); // 注册观察者B

subject.notifyObservers(); // 通知观察者

subject.deleteObserver(observer1); // 移除观察者A

subject.notifyObservers(); // 验证是否成功移除
```


