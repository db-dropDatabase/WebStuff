﻿/* 
 * Interface to make the parsing, storage, and management of cloud sync data iterable
 * I figured I wanted the backend to be kinda modular, so here we go
 */

import { DBInfoInterface } from '../../DBLib/DBManage';
import UIUtil = require('../../UILib/UIUtil');

interface DataInterface {
    //type of recv for internal UIItem stuff
    //each data item should be a unique type, else stuff breaks
    readonly dataType: UIUtil.RecvType;
    //database info for the superclass to manage
    readonly dbInfo: DBInfoInterface | Array<DBInfoInterface>;
    //the key for the sync data this object will use (e.g. "calSyncData")
    //should be constant
    readonly dataKey: string;
    //function called at begining to give the data objects a pointer to the database
    setDB(db: IDBDatabase): void;
    //update function, takes recieved data (using the key above) and updates the stored data
    //returns whether or not the data was updated
    updateData(data: any): Promise<boolean> | false;
    //overwrite function, deletes any existing data and replaces it with the passed data
    overwriteData(data: any): Promise<any>;
    //get the data to be served to the UIItems
    //what data to fetch is stored in the recvparams in each UIItem
    //it is up to the data management class to parse the appropriete recvparam component
    //be sure to document what you're returning in an interface or something
    getData(objs: Array<UIUtil.UIItem>): Promise<any> | any;
}

export = DataInterface;