﻿/**
 * SchedulePage Class
 * Desiged to create a full-pageish graphic
 * displaying stuff
 * basically just making it easier on my hands with abstraction
 * And also allowing all the code for that page to stay in different files
 */

import UIItem = require('./UIItem');

class Page extends UIItem {
    //pretty name
    public readonly name: string;
    //all I need is a list of UIItems, and this class will act as glue
    private readonly items: Array<UIItem>;
    //fill all them varlibles
    constructor(name: string, items: Array<UIItem>) {
        super();
        this.name = name;
        this.items = items;
    }
    //do the thang
    getHTML(): Promise<string> {
        //lets make these items pop
        //and by pop I mean construct
        //get all the html in parellel, join them together, and return it
        return Promise.all(this.items.map((item) => { return item.getHTML(); })).then((array: Array<string>) => { return array.join(''); });
        //one line!
    }
}

export = Page;