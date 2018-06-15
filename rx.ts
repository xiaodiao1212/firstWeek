class DataSource {
    constructor(){
        let i = 0;
        this._id = setInterval(()=>this.emit(i++), 200);
    }
    emit(n) {
        const limit = 10;
        if(this.ondata){
            this.ondata(n);
        }
        if(n === limit){
            if(this.oncomplete){
                this.oncomplete();
            }
            this.destroy();
        }
    }
    destroy(){
        clearInterval(this._id);
    }
}

function MyObservable(observer) {
    const datasource = new DataSource();
    datasource.ondata = (e) => observer.next(e);
    datasource.onerror = (e) => observer.error(e);
    datasource.oncomplete = () => observer.complete();
    return () => {
        datasource.destroy();
    }
}

const unsub = MyObservable({
    next(x) { console.log(x); },
    error(err) { console.error(err); },
    complete() { console.log('done'); }
})