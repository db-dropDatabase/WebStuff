/*
 * Library which makes the selection of webviews and opening of URLs
 * that much easier for me
 * 
 * Should be as simple as calling an init function during platform.ready(),
 * then calling openURL() anytime you want a webview
 * 
 */

import { Injectable } from '@angular/core';
import { BrowserTab } from '@ionic-native/browser-tab';
import { InAppBrowser } from '@ionic-native/in-app-browser';

@Injectable()
export class URLUtil {
    
    browserTab: BrowserTab;
    worseBrowserTab: InAppBrowser;
    browserTabAvailable: boolean;

    constructor(tabThingy: BrowserTab, worseTabThingy: InAppBrowser){
        //init members
        this.browserTab = tabThingy;
        this.worseBrowserTab = worseTabThingy;
        //check for browsertab availibility
        this.browserTab.isAvailable().then((is:boolean) => this.browserTabAvailable = is);
    }

    openURL(URL: string){
        if(this.browserTabAvailable) this.browserTab.openUrl(URL);
        else this.worseBrowserTab.create(URL, '_blank');
    }

}