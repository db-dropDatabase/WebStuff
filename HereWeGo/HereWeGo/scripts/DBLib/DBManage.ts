﻿/**
 * Class which should allow for better database management, since all files
 * in this project use indexedDB
 * Takes an array of object which define that part of the db, then somehow passes the database
 * pointer along to the other components
 */

namespace DBManage {
    //database name constant
    const dbName: string = 'nope';
    //interface to define propwerties of the database to be constructed
    export interface DBInfoInterface {
        //name of the object store to use
        storeName: string;
        //array of keys to generate in that object store
        keys: Array<string>;
        //string for the keypath of the database
        keyPath: string;
    }
    //and the lone function which does all the magic
    export const constructDB = (dbs: Array<DBInfoInterface>): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            //check to see if the database exists
            if (!window.indexedDB) return reject(false);
            //open database
            let req = window.indexedDB.open(dbName);
            //to promise
            req.onsuccess = resolve;
            req.onerror = reject;
            //and if the database doesn't exist yet, build it!
            req.onupgradeneeded = (evt: any) => {
                //for every object in the array, create an object store
                for (let i = 0, len = dbs.length; i < len; i++) {
                    let store: IDBObjectStore = evt.currentTarget.result.createObjectStore(dbs[i].storeName, { keyPath: dbs[i].keyPath });
                    //and fill it with indicies
                    for (let o = 0, len1 = dbs[i].keys.length; o < len1; o++) store.createIndex(dbs[i].keys[o], dbs[i].keys[o]);
                }
            }
        }).then((evt: any) => { return evt.target.result; });
    };
}

export = DBManage;