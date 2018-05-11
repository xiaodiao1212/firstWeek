// app.js，也是 webpack 打包入口
import Vue from 'vue';
import App from './App.vue';
var app = new Vue({
    el: '#app',
    components: {
        App
    }
});