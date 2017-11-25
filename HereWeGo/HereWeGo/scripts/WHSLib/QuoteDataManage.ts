﻿/*
 * API for storing a quote of the day using indexedDB
 * fairly simple
 */

import DataInterface = require('./Interfaces/DataInterface');
import UIUtil = require('../UILib/UIUtil');
import QuoteData = require('./QuoteData');
import DBManage = require('../DBLib/DBManage');

class QuoteDataManage implements DataInterface {
    //data type
    readonly dataType = UIUtil.RecvType.QUOTE;
    //data key for recieved data
    readonly dataKey: string = 'quoteData';
    //database info
    readonly dbInfo: DBManage.DBInfoInterface = {
        storeName: 'quote',
        keyPath: 'key',
        keys: ['quote', 'author'],
    }
    //single data key, cuz we only need one
    private readonly key: number = 0;
    //database
    private db: IDBDatabase;
    //setDB func
    setDB(db: IDBDatabase) { this.db = db; }
    //data array is presumed to only have one entry
    overwriteData(data: any): Promise<any> {
        //add the key object to the data
        data.key = this.key;
        //overwrite the entire database with the data
        let objectStore = this.db.transaction([this.dbInfo.storeName], "readwrite").objectStore(this.dbInfo.storeName);
        return new Promise((resolve, reject) => {
            //replace the whole database with what we recieved
            let req = objectStore.put(data);
            req.onsuccess = resolve;
            req.onerror = reject;
        });
    }

    //update data does same thing cuz I was lazy in the backend
    updateData(data: any): Promise<boolean> | false {
        if (!Array.isArray(data)) return this.overwriteData(data).then(() => { return true; });
        return false; //I LOVE JAVASCRIPT
    }

    //get data returns the quoteData obj
    getData(): Promise<any> {
        //and UI magic!
        return new Promise((resolve, reject) => {
            let req = this.db.transaction([this.dbInfo.storeName], 'readonly').objectStore(this.dbInfo.storeName).get(this.key);
            req.onsuccess = (evt: any) => { resolve(evt.target.result); };
            req.onerror = reject;
        });
    }
}

export = QuoteDataManage;