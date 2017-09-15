﻿/* 
 * Interface to make the parsing, storage, and management of cloud sync data iterable
 * I figured I wanted the backend to be kinda modular, so here we go
 */

import { DBInfoInterface } from '../DBLib/DBManage';

interface DataInterface {
    //database info for the superclass to manage
    dbInfo: DBInfoInterface;
    //the key for the sync data this object will use (e.g. "calSyncData")
    //should be constant
    dataKey: string; 
    //update function, takes recieved data (using the key above) and updates the stored data
    //returns whether or not the data was updated
    updataData(db: IDBDatabase, data: any): boolean;
    //overwrite function, deletes any existing data and replaces it with the passed data
    overwriteData(db: IDBDatabase, data: any): void;
    //and finally, return the data or utility class that our program wants
    getData(db: IDBDatabase): any;
}

export = DataInterface;