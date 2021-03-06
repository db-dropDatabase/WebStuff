﻿import DataInterface = require('./Interfaces/DataInterface');
import UIUtil = require('../UILib/UIUtil');
import GetLib = require('../GetLib/GetLib');
import ImageInterface = require('./Interfaces/ImageInterface');
import { DBInfoInterface } from '../DBLib/DBManage';
import ErrorUtil = require('../ErrorUtil');

interface CloudData {
    index: number;
    data: Array<ImageInterface>;
}

/**
 * Class to parse and store background images from the cloud.
 * 
 * Images URLs are determined from the cloud google apps script, this class simply downloads
 * them and catalogs them for retrieval when the app starts. Stores images in the local cached
 * using the cordova file plugin and retreives them using a file path stored in the database.
 * 
 * Pretty complicated due to the synchronization required to manage the images database entries.
 */
class ImageDataManage implements DataInterface {
    //settings
    /** URL to fetch thumbnails of the images from, so we don't have to shrink the images ourselves */
    private static readonly thumbURL = 'https://drive.google.com/thumbnail';
    /** localstorage key for the index of the current image */
    private static readonly imgIndID = '2';
    /** localstorage key for the last day the index was incremented */
    private static readonly imgDayID = '3';
    /** what fraction of the resolution to use for the thumnail */
    private static readonly thumbRez = 1.0/4.0;
    //type
    readonly dataType = UIUtil.RecvType.IMAGE;
    /** single table, images */
    readonly dbInfo: DBInfoInterface = {
        //store images
        storeName: 'images',
        //have one category for the image, and one category for when it was stored
        //TODO: Credits
        keys: [],
        //keypath is index
        keyPath: 'id',
    };
    //the key for our database
    readonly dataKey = 'imgData';
    //storage members
    //we need to grab the images, so we need http
    private readonly http: GetLib;
    //database
    private db: IDBDatabase;
    //boolean to tell us if we failed to fetch an image, meaning it's time to get new ones
    private cacheRefresh: boolean = false;
    //promise to tell the app when we've finished fetching the full pictures
    private picPromise: Array<Promise<string>>;
    //store the number of images to cache at once
    private storeNum: number;
    private index: number = 0;
    //the constructor
    private readonly cheapData: boolean;
    /**
     * @param http {@link GetLib} instance for fetching images from google drive
     * @param cacheDays how many days to cach images in advance 
     * @param cheapData if true, only fetch thumbnail when retriving data
     */
    constructor(http: GetLib, cacheDays: number, cheapData?: boolean) {
        this.http = http;
        this.storeNum = cacheDays;
        this.cheapData = cheapData;
    }
    //set DB func
    setDB(db: IDBDatabase) { this.db = db; }
    /**
     * Update image index based on time, update the image metadata in the database, then fetch all the images that aren't downloaded yet
     * @param data the internet data
     * @returns whether or not the data needed updating
     */
    updateData(data: CloudData): Promise<boolean> | false {
        //check if emptey array
        if(<any>data === []) return false;
        //check index
        if(typeof data.index === 'number') {
            //refresh index
            localStorage.setItem(ImageDataManage.imgDayID, new Date().setHours(0,0,0,0).toString());
            localStorage.setItem(ImageDataManage.imgIndID, data.index.toString());
            this.index = data.index;
        }
        else if (typeof this.index != 'number') this.index = parseInt(localStorage.getItem(ImageDataManage.imgIndID));
        //refresh data
        if (!Array.isArray(data.data) || data.data.length === 0) {
            if (this.cacheRefresh) return this.fillPicPromises(this.storeNum).then(() => this.cacheRefresh = false);
            else return false;
        }
        //add iowait for anything making write calls to the database
        let thenme: Promise<any>;
        if (this.picPromise) thenme = Promise.all(this.picPromise);
        else thenme = Promise.resolve();
        //check database if we already have any of the images
        //and if we don't add it
        //also delete old ones
        thenme.then(() => {
            return new Promise((resolve, reject) => {
                let store: IDBObjectStore = this.db.transaction([this.dbInfo.storeName], "readwrite").objectStore(this.dbInfo.storeName);
                //then do a buncha quuuueirereis to update the database entries
                //but put it all in promises just to be sure
                let ray: Array<Promise<any>> = [];
                for (let i = 0, len = data.data.length; i < len; i++) {
                    if ('cancelled' in data.data[i]) ray.push(new Promise((resolve, reject) => {
                        let req = store.delete(data.data[i][this.dbInfo.keyPath]);
                        req.onsuccess = resolve;
                        req.onerror = reject;
                    }));
                    else ray.push(new Promise((resolve, reject) => {
                        let req = store.put(data.data[i]);
                        req.onsuccess = resolve;
                        req.onerror = reject;
                    }));
                }
                return Promise.all(ray);
            });
        }).then(() => {
            if (this.cacheRefresh || data.data.length > 0) return this.fillPicPromises(this.storeNum).then(() => this.cacheRefresh = false);
        }).then(() => { return data.data.length > 0; });
    }
    /**
     * Same as updateData, but delete the database before updating.
     * @param data the internet data
     */
    overwriteData(data: CloudData): Promise<any> {
        //refresh index
        localStorage.setItem(ImageDataManage.imgDayID, new Date().setHours(0, 0, 0, 0).toString());
        localStorage.setItem(ImageDataManage.imgIndID, data.index.toString());
        this.index = data.index;
        //add iowait for any images making write calls to the database
        let thenme: Promise<any>;
        if (this.picPromise) thenme = Promise.all(this.picPromise);
        else thenme = Promise.resolve();
        //then do your stuff!
        return thenme.then(() => {
            let obj = this.db.transaction([this.dbInfo.storeName], "readwrite").objectStore(this.dbInfo.storeName);
            return new Promise((resolve, reject) => {
                let req = obj.clear();
                req.onerror = reject;
                req.onsuccess = resolve;
            })
        }).then(() => {
            let obj = this.db.transaction([this.dbInfo.storeName], "readwrite").objectStore(this.dbInfo.storeName);
            let len = data.data.length;
            let ray: Array<Promise<any>> = new Array(len);
            for(let i = 0; i < len; i++) ray[i] = new Promise((resolve1, reject1) => {
                let req2 = obj.add(data.data[i]);
                req2.onerror = reject1;
                req2.onsuccess = resolve1;
            });
            return Promise.all(ray);
        }).then(() => this.fillPicPromises(this.storeNum))
    }

    /**
     * Query the database for today's image filepath, then fetch the image from the filesystem.
     * @returns an array of a thumbnail and image url, nested in a questionable number of promises
     */
    getData(): Promise<Array<Promise<string>>> | [Promise<string>, Promise<string>] | Promise<[Promise<string>, Promise<string>]> | Promise<false> {
        if (!this.picPromise) {
            //get crap from localstorage
            let lastDay: number = parseInt(localStorage.getItem(ImageDataManage.imgDayID));
            this.index = parseInt(localStorage.getItem(ImageDataManage.imgIndID));
            if (!lastDay || typeof this.index != 'number') throw ErrorUtil.code.NO_STORED;
            let today = new Date().setHours(0, 0, 0, 0);
            if (lastDay != today) {
                localStorage.setItem(ImageDataManage.imgDayID, today.toString());
                localStorage.setItem(ImageDataManage.imgIndID, (this.index += this.daysBetweenDates(lastDay, today)).toString());
            }
            //make the promises for today, then return them
            //get the database entry for the stored images
            return this.fillPicPromises(1);
        }
        else return <[Promise<string>, Promise<string>]>this.picPromise.slice(0, 2);
    }

    private fillPicPromises(picNum: number): Promise<Array<Promise<string>>> {
        //fetch the thumbnail, then the full image, but stagger the full image until after the thumbnail
        //but still return the blobs for each
        //also ony fetch the # of images we want to store
        this.picPromise = [];
        return new Promise((resolve, reject) => {
            let obj = this.db.transaction([this.dbInfo.storeName], "readonly").objectStore(this.dbInfo.storeName);
            //count the number of entries so we can wrap around in the cursor
            let req = obj.count();
            req.onerror = reject;
            req.onsuccess = (evtCount: any) => {
                //wrap index if it's over
                let tmp = this.index;
                let objCount = evtCount.target.result;
                while (tmp >= objCount) tmp -= objCount;
                if(this.index != tmp) localStorage.setItem(ImageDataManage.imgIndID, (this.index = tmp).toString());
                //count the number of items to wrap around and fetch at the start of the cursor
                let temp = picNum + this.index;
                let count = temp - objCount;
                if(objCount < temp) temp = objCount;
                let endRay = [];
                let i = 0;
                let req2 = obj.openCursor();
                req2.onerror = reject;
                req2.onsuccess = (evt: any) => {
                    //iterate through database, fetching any blobs that are needed, and caching all teh things
                    let cursor = evt.target.result as IDBCursorWithValue;
                    if (cursor && i >= this.index || count > 0) {
                        let tempScope = cursor.value;
                        let tH = window.innerHeight;
                        let tempPromise = this.getAndStoreImage(tempScope, "thumb", ImageDataManage.thumbURL, Math.floor(tH * ImageDataManage.thumbRez),  tempScope.id, false);
                        let tempP2;
                        if(!this.cheapData) tempP2 = Promise.resolve(tempPromise).then(() => this.getAndStoreImage(tempScope, "image", ImageDataManage.thumbURL, tH, tempScope.id, true, true));
                        else tempP2 = tempPromise;
                        //push such that they end up in order, even though we may wrap around
                        if (count > 0)  {
                            endRay.push(tempPromise, tempP2);
                            count--;
                        }
                        else this.picPromise.push(tempPromise, tempP2);
                    }
                    if(++i >= temp || !cursor) return resolve(this.picPromise = this.picPromise.concat(endRay))
                    cursor.continue();
                };
            };
        });
    }

    private getAndStoreImage(data: ImageInterface, key: string, url: string, height: number, id: string, isFullRez: boolean, loadThenSave?: boolean): Promise<string> {
        //trip a boolean here that we got new images
        this.cacheRefresh = true;
        //if the database has the image, great! send it off
        return this.verifyUrl(data[key]).then((isValid: boolean) => {
            if(!isValid && !this.http) throw ErrorUtil.code.NO_STORED;
            return isValid ? data[key] : this.getUntilBlobSuccess(url, {
                authuser: 0,
                sz: 'h' + height,
                id: id,
                isFullRez: isFullRez,
            }).then((url: string) => {
                data[key] = url;
                let obj = this.db.transaction([this.dbInfo.storeName], "readwrite").objectStore(this.dbInfo.storeName);
                return new Promise((resolve, reject) => {
                    const runFunc = (blurd: any) => {
                        let req2 = obj.put(blurd);
                        req2.onerror = reject;
                        req2.onsuccess = () => resolve(data[key]);
                    };
                    if (loadThenSave) {
                        let req = obj.get(data.id);
                        req.onerror = reject;
                        req.onsuccess = (evt: any) => {
                            evt.target.result[key] = url;
                            runFunc(evt.target.result);
                        };
                    }
                    else runFunc(data);
                });
            });
        }); 
    }

    private verifyUrl(url: string): Promise<boolean> {
        if(!url) return Promise.resolve(false);
        return <any>new Promise((resolve) => {
            let temp = new Image();
            temp.src = url;
            temp.onload = () => resolve(temp.height > 0);
            temp.onerror = () => resolve(false);
        }).catch((err) => { console.log(err); return false; });
    }

    private getUntilBlobSuccess(url: string, params: any): Promise<string> {
        //...sigh
        return this.http.getAsBlob(url, params).then((url: string) => {
            if (!url) return this.getUntilBlobSuccess(url, params);
            else return url;
        });
    }

    private daysBetweenDates(day1: number, day2: number): number {
        // The number of milliseconds in one day
        var ONE_DAY = 1000 * 60 * 60 * 24
        return Math.round(Math.abs(day1 - day2)/ONE_DAY);
    }
}

export = ImageDataManage